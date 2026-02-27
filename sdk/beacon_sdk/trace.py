import asyncio
import functools
import json
import sys
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Callable

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


def _build_trace(
    func_name: str,
    latency_ms: float,
    metrics: dict[str, Any],
    model_override: str | None,
    prompt_version: str | None,
) -> dict[str, Any]:
    model = model_override or metrics["model"]
    cost = estimate_cost(model, metrics["prompt_tokens"], metrics["completion_tokens"])

    return {
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
    }


def trace(model: str | None = None, prompt_version: str | None = None) -> Callable:
    """Decorator factory that traces LLM calls, emitting structured JSON to stdout."""

    def decorator(fn: Callable) -> Callable:
        if asyncio.iscoroutinefunction(fn):

            @functools.wraps(fn)
            async def async_wrapper(*args: Any, **kwargs: Any) -> Any:
                start = time.perf_counter()
                result = await fn(*args, **kwargs)
                elapsed_ms = (time.perf_counter() - start) * 1000

                metrics = _extract_metrics(result)
                trace_data = _build_trace(fn.__qualname__, elapsed_ms, metrics, model, prompt_version)
                print(json.dumps(trace_data), file=sys.stdout, flush=True)
                return result

            return async_wrapper
        else:

            @functools.wraps(fn)
            def sync_wrapper(*args: Any, **kwargs: Any) -> Any:
                start = time.perf_counter()
                result = fn(*args, **kwargs)
                elapsed_ms = (time.perf_counter() - start) * 1000

                metrics = _extract_metrics(result)
                trace_data = _build_trace(fn.__qualname__, elapsed_ms, metrics, model, prompt_version)
                print(json.dumps(trace_data), file=sys.stdout, flush=True)
                return result

            return sync_wrapper

    return decorator
