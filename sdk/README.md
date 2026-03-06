# beacon-sdk

Lightweight Python SDK for tracing LLM calls — captures token usage, latency, model, estimated cost, and optional hallucination scoring as structured JSON.

## Install

```bash
pip install -e .
```

## Usage

### OpenAI

```python
from openai import OpenAI
from beacon_sdk import trace

client = OpenAI()

@trace(prompt_version="v1")
def summarize(text: str):
    return client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": f"Summarize: {text}"}],
    )

summarize("Hello world")
# Prints JSON: {"timestamp": "...", "trace_id": "...", "model": "gpt-4o", "prompt_tokens": ..., ...}
```

### Anthropic

```python
import anthropic
from beacon_sdk import trace

client = anthropic.Anthropic()

@trace(prompt_version="v1")
def ask(question: str):
    return client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1024,
        messages=[{"role": "user", "content": question}],
    )

ask("What is the meaning of life?")
```

### Async

```python
@trace(model="gpt-4o")
async def call_llm():
    return await client.chat.completions.create(...)
```

### Hallucination Scoring

Enable automatic hallucination detection by passing `score_hallucination_flag=True` to the `@trace` decorator. The scorer analyzes the LLM response for two signals:

- **Repetition** — phrases that repeat within the response itself
- **Hedging** — language like "I think", "I believe", "I'm not sure", "possibly", "might be"

The combined score (0–1) is attached to the trace as `hallucination_score`.

```python
@trace(prompt_version="v2", score_hallucination_flag=True)
def ask(question: str):
    return client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": question}],
    )

ask("Who invented the telephone?")
# Trace output includes: "hallucination_score": 0.05
```

You can also use the scorer directly:

```python
from beacon_sdk import score_hallucination

score = score_hallucination(
    prompt="What is the capital of France?",
    response="I think it might be Paris, but I'm not sure.",
)
print(score)  # e.g. 0.35
```

## Output

Each traced call prints one JSON line to stdout:

```json
{
  "timestamp": "2025-01-01T00:00:00+00:00",
  "trace_id": "550e8400-e29b-41d4-a716-446655440000",
  "function": "summarize",
  "model": "gpt-4o",
  "prompt_tokens": 10,
  "completion_tokens": 20,
  "total_tokens": 30,
  "latency_ms": 450.12,
  "estimated_cost_usd": 0.000225,
  "prompt_version": "v1",
  "hallucination_score": 0.12
}
```

## Emitters

By default traces print to stdout. Set `BEACON_EMITTER=kinesis` and `BEACON_KINESIS_STREAM=<stream-name>` to ship traces to AWS Kinesis instead.
