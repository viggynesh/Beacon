"""Tests for the hallucination scoring module."""

from beacon_sdk.hallucination import hedge_score, repetition_score, score_hallucination


class TestRepetitionScore:
    def test_no_repetition(self):
        text = "The quick brown fox jumps over the lazy dog"
        assert repetition_score(text) == 0.0

    def test_heavy_repetition(self):
        text = "the cat sat on the mat " * 10
        score = repetition_score(text)
        assert score > 0.5

    def test_empty_string(self):
        assert repetition_score("") == 0.0

    def test_short_text(self):
        assert repetition_score("hi") == 0.0

    def test_score_capped_at_one(self):
        text = "word word word word " * 50
        assert repetition_score(text) <= 1.0


class TestHedgeScore:
    def test_no_hedging(self):
        text = "The answer is 42. This is a definitive fact."
        assert hedge_score(text) == 0.0

    def test_heavy_hedging(self):
        text = (
            "I think this might be correct. I believe it could be right. "
            "I'm not sure but possibly it is. Perhaps this might be the answer."
        )
        score = hedge_score(text)
        assert score > 0.5

    def test_single_hedge(self):
        text = "I think the result is correct based on the data we have available for this analysis in the broader context of our research and the extensive evidence gathered from multiple reliable and verifiable sources"
        score = hedge_score(text)
        assert 0.0 < score < 1.0

    def test_empty_string(self):
        assert hedge_score("") == 0.0

    def test_case_insensitive(self):
        text = "I THINK this MIGHT BE correct"
        assert hedge_score(text) > 0.0


class TestScoreHallucination:
    def test_clean_response(self):
        prompt = "What is 2+2?"
        response = "The answer is 4."
        score = score_hallucination(prompt, response)
        assert score == 0.0

    def test_hedgy_response(self):
        prompt = "What is the capital of France?"
        response = (
            "I think it might be Paris. I believe that is correct, "
            "but I'm not sure. Possibly it could be Lyon."
        )
        score = score_hallucination(prompt, response)
        assert score > 0.2

    def test_repetitive_response(self):
        prompt = "Tell me about cats"
        response = "Cats are great pets. " * 15
        score = score_hallucination(prompt, response)
        assert score > 0.2

    def test_score_range(self):
        score = score_hallucination("prompt", "I think I believe I'm not sure possibly might be " * 5)
        assert 0.0 <= score <= 1.0

    def test_empty_response(self):
        score = score_hallucination("prompt", "")
        assert score == 0.0


class TestTraceIntegration:
    """Test that score_hallucination integrates with the @trace decorator."""

    def test_trace_with_hallucination_scoring(self, capsys):
        import json
        from beacon_sdk import trace

        @trace(model="test-model", score_hallucination_flag=True)
        def fake_llm(prompt: str):
            return "I think this might be correct. I believe it could be right."

        result = fake_llm("What is the answer?")
        assert result == "I think this might be correct. I believe it could be right."

        captured = capsys.readouterr()
        trace_data = json.loads(captured.out.strip())
        assert "hallucination_score" in trace_data
        assert isinstance(trace_data["hallucination_score"], float)
        assert trace_data["hallucination_score"] > 0.0

    def test_trace_without_hallucination_scoring(self, capsys):
        import json
        from beacon_sdk import trace

        @trace(model="test-model")
        def fake_llm(prompt: str):
            return "The answer is 42."

        fake_llm("question")

        captured = capsys.readouterr()
        trace_data = json.loads(captured.out.strip())
        assert trace_data["hallucination_score"] is None
