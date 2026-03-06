"""Simple hallucination scoring heuristics.

Returns a float between 0 and 1 where higher values indicate greater
hallucination likelihood.
"""

from __future__ import annotations

import re
from collections import Counter

HEDGE_PHRASES = [
    "i think",
    "i believe",
    "i'm not sure",
    "i am not sure",
    "possibly",
    "might be",
    "could be",
    "perhaps",
    "it seems",
    "it appears",
    "not certain",
    "not entirely sure",
    "if i recall",
    "i may be wrong",
    "don't quote me",
]

_WORD_RE = re.compile(r"\b\w+\b")


def repetition_score(text: str, ngram_size: int = 4) -> float:
    """Score 0–1 based on how much the response repeats its own phrases.

    Extracts all n-grams of *ngram_size* words and measures the ratio of
    duplicated n-grams to total n-grams.
    """
    words = _WORD_RE.findall(text.lower())
    if len(words) < ngram_size:
        return 0.0

    ngrams = [tuple(words[i : i + ngram_size]) for i in range(len(words) - ngram_size + 1)]
    counts = Counter(ngrams)
    total = len(ngrams)
    duplicated = sum(c - 1 for c in counts.values() if c > 1)

    return min(duplicated / total, 1.0)


def hedge_score(text: str) -> float:
    """Score 0–1 based on frequency of hedging language.

    Counts occurrences of common hedging phrases relative to word count.
    """
    lower = text.lower()
    words = _WORD_RE.findall(lower)
    if not words:
        return 0.0

    hedge_count = sum(lower.count(phrase) for phrase in HEDGE_PHRASES)

    # Normalize: roughly 1 hedge per 20 words → score of 1.0
    raw = hedge_count / (len(words) / 20)
    return min(raw, 1.0)


def score_hallucination(prompt: str, response: str) -> float:
    """Compute a combined hallucination score for the given prompt/response.

    Returns a float between 0 (confident / no hallucination signals) and
    1 (strong hallucination signals).

    Weights:
        - repetition_score: 0.5
        - hedge_score:      0.5
    """
    rep = repetition_score(response)
    hedge = hedge_score(response)
    return round(min(rep * 0.5 + hedge * 0.5, 1.0), 4)
