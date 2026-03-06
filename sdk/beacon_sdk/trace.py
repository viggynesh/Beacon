import asyncio
import functools
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Callable

from .emitter import get_emitter
from .hallucination import score_hallucination
from .pricing import estimate_cost


def _extract_metrics(result: Any) -> dict[str, Any]:
    """Extract token usage and model from an LLM response object."""
    metrics: dict[str, Any] = {
        "model": None,
        "prompt_tokens": 0,
        "completion_tokens": 0,
        "total_tokens": 0,
    }

    model = getattr(result, "model", None)
    if model:
        metrics["model"] = str(model)

    usage = getattr(result, "usage", None)
    if usage is None:
        return metrics

    # OpenAI style: prompt_tokens / completion_tokens / total_tokens
    prompt_tokens = getattr(usage, "prompt_tokens", None)
    completion_tokens = getattr(usage, "completion_tokens", None)
    total_tokens = getattr(usage, "total_tokens", None)

    if prompt_tokens is not None:
        metrics["prompt_tokens"] = int(prompt_tokens)
        metrics["completion_tokens"] = int(completion_tokens or 0)
        metrics["total_tokens"] = int(total_tokens or (metrics["prompt_tokens"] + metrics["completion_tokens"]))
        return metrics

    # Anthropic style: input_tokens / output_tokens
    input_tokens = getattr(usage, "input_tokens", None)
    output_tokens = getattr(usage, "output_tokens", None)

    if input_tokens is not None:
        metrics["prompt_tokens"] = int(input_tokens)
        metrics["completion_tokens"] = int(output_tokens or 0)
        metrics["total_tokens"] = metrics["prompt_tokens"] + metrics["completion_tokens"]

    return metrics


def _extract_response_text(result: Any) -> str | None:
    """Best-effort extraction of the text content from an LLM response."""
    # OpenAI: result.choices[0].message.content
    choices = getattr(result, "choices", None)
    if choices and len(choices) > 0:
        message = getattr(choices[0], "message", None)
        if message:
            content = getattr(message, "content", None)
            if isinstance(content, str):
                return content

    # Anthropic: result.content[0].text
    content_blocks = getattr(result, "content", None)
    if content_blocks and len(content_blocks) > 0:
        text = getattr(content_blocks[0], "text", None)
        if isinstance(text, str):
            return text

    # Plain string result
    if isinstance(result, str):
        return result

    return None


def _extract_prompt_text(*args: Any, **kwargs: Any) -> str | None:
    """Best-effort extraction of prompt text from function arguments."""
    # Check for common kwarg names
    for key in ("prompt", "text", "message", "question", "content", "input"):
        if key in kwargs and isinstance(kwargs[key], str):
            return kwargs[key]

    # First positional string arg
    for arg in args:
        if isinstance(arg, str):
            return arg

    return None


def _build_trace(
    func_name: str,
    latency_ms: float,
    metrics: dict[str, Any],
    model_override: str | None,
    prompt_version: str | None,
    hallucination_score: float | None = None,
) -> dict[str, Any]:
    model = model_override or metrics["model"]
    cost = estimate_cost(model, metrics["prompt_tokens"], metrics["completion_tokens"])

    trace_data: dict[str, Any] = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "trace_id": str(uuid.uuid4()),
        "function": func_name,
        "model": model,
        "prompt_tokens": metrics["prompt_tokens"],
        "completion_tokens": metrics["completion_tokens"],
        "total_tokens": metrics["total_tokens"],
        "latency_ms": round(latency_ms, 2),
        "estimated_cost_usd": round(cost, 8) if cost is not None else None,
        "prompt_version": prompt_version,
        "hallucination_score": hallucination_score,
    }
    return trace_data


def trace(
    model: str | None = None,
    prompt_version: str | None = None,
    score_hallucination_flag: bool = False,
) -> Callable:
    """Decorator factory that traces LLM calls, emitting structured JSON.

    Args:
        model: Override the model name reported in the trace.
        prompt_version: Tag the trace with a prompt version string.
        score_hallucination_flag: If True, automatically compute a
            hallucination score from the response text and include it
            in the emitted trace.
    """

    def decorator(fn: Callable) -> Callable:
        if asyncio.iscoroutinefunction(fn):

            @functools.wraps(fn)
            async def async_wrapper(*args: Any, **kwargs: Any) -> Any:
                start = time.perf_counter()
                result = await fn(*args, **kwargs)
                elapsed_ms = (time.perf_counter() - start) * 1000

                metrics = _extract_metrics(result)
                h_score = None
                if score_hallucination_flag:
                    prompt_text = _extract_prompt_text(*args, **kwargs) or ""
                    response_text = _extract_response_text(result) or ""
                    h_score = score_hallucination(prompt_text, response_text)

                trace_data = _build_trace(
                    fn.__qualname__, elapsed_ms, metrics, model, prompt_version, h_score
                )
                get_emitter().emit(trace_data)
                return result

            return async_wrapper
        else:

            @functools.wraps(fn)
            def sync_wrapper(*args: Any, **kwargs: Any) -> Any:
                start = time.perf_counter()
                result = fn(*args, **kwargs)
                elapsed_ms = (time.perf_counter() - start) * 1000

                metrics = _extract_metrics(result)
                h_score = None
                if score_hallucination_flag:
                    prompt_text = _extract_prompt_text(*args, **kwargs) or ""
                    response_text = _extract_response_text(result) or ""
                    h_score = score_hallucination(prompt_text, response_text)

                trace_data = _build_trace(
                    fn.__qualname__, elapsed_ms, metrics, model, prompt_version, h_score
                )
                get_emitter().emit(trace_data)
                return result

            return sync_wrapper

    return decorator
