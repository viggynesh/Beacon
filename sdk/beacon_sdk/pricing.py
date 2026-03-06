# Per-token costs in USD: (input_cost, output_cost)
# Prices are per token (not per 1K tokens).
PRICING: dict[str, tuple[float, float]] = {
    "gpt-4o": (2.50e-6, 10.00e-6),
    "gpt-4o-mini": (0.15e-6, 0.60e-6),
    "gpt-4-turbo": (10.00e-6, 30.00e-6),
    "gpt-4": (30.00e-6, 60.00e-6),
    "gpt-3.5-turbo": (0.50e-6, 1.50e-6),
    "claude-sonnet-4": (3.00e-6, 15.00e-6),
    "claude-opus-4": (15.00e-6, 75.00e-6),
    "claude-haiku-4": (0.80e-6, 4.00e-6),
    "claude-3-5-sonnet": (3.00e-6, 15.00e-6),
    "claude-3-5-haiku": (0.80e-6, 4.00e-6),
    "claude-3-opus": (15.00e-6, 75.00e-6),
    "claude-3-sonnet": (3.00e-6, 15.00e-6),
    "claude-3-haiku": (0.25e-6, 1.25e-6),
}


def estimate_cost(model: str | None, prompt_tokens: int, completion_tokens: int) -> float | None:
    """Estimate USD cost based on model name prefix matching."""
    if not model:
        return None

    # Try exact match first, then prefix match (longest prefix wins)
    if model in PRICING:
        input_cost, output_cost = PRICING[model]
        return prompt_tokens * input_cost + completion_tokens * output_cost

    best_match: str | None = None
    for prefix in PRICING:
        if model.startswith(prefix) and (best_match is None or len(prefix) > len(best_match)):
            best_match = prefix

    if best_match:
        input_cost, output_cost = PRICING[best_match]
        return prompt_tokens * input_cost + completion_tokens * output_cost

    return None
