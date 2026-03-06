import json
import sys
from unittest.mock import MagicMock, patch

import pytest

from beacon_sdk.emitter import (
    KinesisEmitter,
    StdoutEmitter,
    get_emitter,
    reset_emitter,
)


@pytest.fixture
def mock_boto3(monkeypatch):
    """Inject a fake boto3 into sys.modules so KinesisEmitter can import it."""
    mock = MagicMock()
    monkeypatch.setitem(sys.modules, "boto3", mock)
    return mock


class TestStdoutEmitter:
    def test_emit_prints_json(self, capsys):
        emitter = StdoutEmitter()
        data = {"trace_id": "abc", "model": "gpt-4o"}
        emitter.emit(data)
        output = json.loads(capsys.readouterr().out.strip())
        assert output == data


class TestEmitterSelection:
    def test_default_is_stdout(self, monkeypatch):
        monkeypatch.delenv("BEACON_EMITTER", raising=False)
        assert isinstance(get_emitter(), StdoutEmitter)

    def test_explicit_stdout(self, monkeypatch):
        monkeypatch.setenv("BEACON_EMITTER", "stdout")
        assert isinstance(get_emitter(), StdoutEmitter)

    def test_empty_string_is_stdout(self, monkeypatch):
        monkeypatch.setenv("BEACON_EMITTER", "")
        assert isinstance(get_emitter(), StdoutEmitter)

    def test_kinesis_selected(self, monkeypatch, mock_boto3):
        monkeypatch.setenv("BEACON_EMITTER", "kinesis")
        monkeypatch.setenv("BEACON_KINESIS_STREAM", "my-stream")
        monkeypatch.delenv("AWS_ENDPOINT_URL", raising=False)
        emitter = get_emitter()
        assert isinstance(emitter, KinesisEmitter)
        mock_boto3.client.assert_called_once_with("kinesis")

    def test_kinesis_case_insensitive(self, monkeypatch, mock_boto3):
        monkeypatch.setenv("BEACON_EMITTER", "KINESIS")
        monkeypatch.setenv("BEACON_KINESIS_STREAM", "my-stream")
        assert isinstance(get_emitter(), KinesisEmitter)

    def test_kinesis_with_endpoint_url(self, monkeypatch, mock_boto3):
        monkeypatch.setenv("BEACON_EMITTER", "kinesis")
        monkeypatch.setenv("BEACON_KINESIS_STREAM", "my-stream")
        monkeypatch.setenv("AWS_ENDPOINT_URL", "http://localhost:4566")
        emitter = get_emitter()
        assert isinstance(emitter, KinesisEmitter)
        mock_boto3.client.assert_called_once_with(
            "kinesis", endpoint_url="http://localhost:4566"
        )

    def test_kinesis_missing_stream_raises(self, monkeypatch, mock_boto3):
        monkeypatch.setenv("BEACON_EMITTER", "kinesis")
        monkeypatch.delenv("BEACON_KINESIS_STREAM", raising=False)
        with pytest.raises(KeyError):
            get_emitter()

    def test_emitter_is_cached(self, monkeypatch):
        monkeypatch.delenv("BEACON_EMITTER", raising=False)
        e1 = get_emitter()
        e2 = get_emitter()
        assert e1 is e2

    def test_reset_clears_cache(self, monkeypatch):
        monkeypatch.delenv("BEACON_EMITTER", raising=False)
        e1 = get_emitter()
        reset_emitter()
        e2 = get_emitter()
        assert e1 is not e2


class TestKinesisEmitter:
    def test_emit_calls_put_record(self, monkeypatch, mock_boto3):
        monkeypatch.setenv("BEACON_KINESIS_STREAM", "test-stream")
        monkeypatch.delenv("AWS_ENDPOINT_URL", raising=False)
        mock_client = MagicMock()
        mock_boto3.client.return_value = mock_client

        emitter = KinesisEmitter()
        trace_data = {"trace_id": "abc-123", "model": "gpt-4o"}
        emitter.emit(trace_data)

        mock_client.put_record.assert_called_once_with(
            StreamName="test-stream",
            Data=json.dumps(trace_data).encode(),
            PartitionKey="abc-123",
        )
