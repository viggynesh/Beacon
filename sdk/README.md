# beacon-sdk

Lightweight Python SDK for tracing LLM calls — captures token usage, latency, model, and estimated cost as structured JSON.

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
  "prompt_version": "v1"
}
```
