import asyncio
import json
from types import SimpleNamespace

import pytest

from beacon_sdk import trace
from beacon_sdk.pricing import estimate_cost


# ── Helpers ──────────────────────────────────────────────────────────────────

def _openai_response(prompt_tokens=10, completion_tokens=20, total_tokens=30, model="gpt-4o"):
    return SimpleNamespace(
        model=model,
        usage=SimpleNamespace(
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=total_tokens,
        ),
    )


def _anthropic_response(input_tokens=15, output_tokens=25, model="claude-sonnet-4-20250514"):
    return SimpleNamespace(
        model=model,
        usage=SimpleNamespace(
            input_tokens=input_tokens,
            output_tokens=output_tokens,
        ),
    )


# ── Tests ────────────────────────────────────────────────────────────────────

class TestOpenAITrace:
    def test_captures_openai_fields(self, capsys):
        @trace(model="gpt-4o")
        def call_openai():
            return _openai_response()

        result = call_openai()
        assert result.model == "gpt-4o"

        output = json.loads(capsys.readouterr().out.strip())
        assert output["model"] == "gpt-4o"
        assert output["prompt_tokens"] == 10
        assert output["completion_tokens"] == 20
        assert output["total_tokens"] == 30
        assert output["function"] == "TestOpenAITrace.test_captures_openai_fields.<locals>.call_openai"
        assert output["trace_id"]
        assert output["timestamp"]
        assert output["latency_ms"] >= 0

    def test_cost_estimation_openai(self, capsys):
        @trace()
        def call_openai():
            return _openai_response(prompt_tokens=1000, completion_tokens=500, model="gpt-4o")

        call_openai()
        output = json.loads(capsys.readouterr().out.strip())
        expected = 1000 * 2.50e-6 + 500 * 10.00e-6
        assert output["estimated_cost_usd"] == pytest.approx(expected, rel=1e-6)


class TestAnthropicTrace:
    def test_captures_anthropic_fields(self, capsys):
        @trace()
        def call_anthropic():
            return _anthropic_response()

        call_anthropic()
        output = json.loads(capsys.readouterr().out.strip())
        assert output["model"] == "claude-sonnet-4-20250514"
        assert output["prompt_tokens"] == 15
        assert output["completion_tokens"] == 25
        assert output["total_tokens"] == 40

    def test_cost_estimation_anthropic(self, capsys):
        @trace()
        def call_anthropic():
            return _anthropic_response(input_tokens=1000, output_tokens=500, model="claude-sonnet-4-20250514")

        call_anthropic()
        output = json.loads(capsys.readouterr().out.strip())
        expected = 1000 * 3.00e-6 + 500 * 15.00e-6
        assert output["estimated_cost_usd"] == pytest.approx(expected, rel=1e-6)


class TestAsyncTrace:
    @pytest.mark.asyncio
    async def test_async_function(self, capsys):
        @trace()
        async def call_llm():
            return _openai_response(model="gpt-4o-mini")

        result = await call_llm()
        assert result.model == "gpt-4o-mini"

        output = json.loads(capsys.readouterr().out.strip())
        assert output["model"] == "gpt-4o-mini"
        assert output["prompt_tokens"] == 10


class TestPromptVersion:
    def test_prompt_version_flows_through(self, capsys):
        @trace(prompt_version="v2.1")
        def call_llm():
            return _openai_response()

        call_llm()
        output = json.loads(capsys.readouterr().out.strip())
        assert output["prompt_version"] == "v2.1"

    def test_prompt_version_default_none(self, capsys):
        @trace()
        def call_llm():
            return _openai_response()

        call_llm()
        output = json.loads(capsys.readouterr().out.strip())
        assert output["prompt_version"] is None


class TestEstimateCost:
    def test_exact_match(self):
        cost = estimate_cost("gpt-4o", 1000, 500)
        assert cost == pytest.approx(1000 * 2.50e-6 + 500 * 10.00e-6)

    def test_prefix_match(self):
        cost = estimate_cost("gpt-4o-2024-08-06", 100, 100)
        assert cost == pytest.approx(100 * 2.50e-6 + 100 * 10.00e-6)

    def test_unknown_model(self):
        assert estimate_cost("unknown-model", 100, 100) is None

    def test_none_model(self):
        assert estimate_cost(None, 100, 100) is None


class TestGracefulFallback:
    def test_no_usage_attribute(self, capsys):
        @trace()
        def call_llm():
            return SimpleNamespace(model="custom-model")

        call_llm()
        output = json.loads(capsys.readouterr().out.strip())
        assert output["prompt_tokens"] == 0
        assert output["completion_tokens"] == 0
        assert output["estimated_cost_usd"] is None

    def test_no_model_attribute(self, capsys):
        @trace()
        def call_llm():
            return "raw string"

        call_llm()
        output = json.loads(capsys.readouterr().out.strip())
        assert output["model"] is None
        assert output["prompt_tokens"] == 0
