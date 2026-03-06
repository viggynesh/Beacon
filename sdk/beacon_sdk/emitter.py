from __future__ import annotations

import json
import os
import sys
from typing import Any, Protocol


class Emitter(Protocol):
    def emit(self, trace_data: dict[str, Any]) -> None: ...


class StdoutEmitter:
    def emit(self, trace_data: dict[str, Any]) -> None:
        print(json.dumps(trace_data), file=sys.stdout, flush=True)


class KinesisEmitter:
    def __init__(self) -> None:
        import boto3

        self._stream_name = os.environ["BEACON_KINESIS_STREAM"]
        endpoint_url = os.environ.get("AWS_ENDPOINT_URL")
        kwargs: dict[str, Any] = {}
        if endpoint_url:
            kwargs["endpoint_url"] = endpoint_url
        self._client = boto3.client("kinesis", **kwargs)

    def emit(self, trace_data: dict[str, Any]) -> None:
        payload = json.dumps(trace_data)
        self._client.put_record(
            StreamName=self._stream_name,
            Data=payload.encode(),
            PartitionKey=trace_data.get("trace_id", "default"),
        )


_emitter: Emitter | None = None


def get_emitter() -> Emitter:
    """Return the configured emitter, creating it on first call."""
    global _emitter
    if _emitter is None:
        _emitter = _create_emitter()
    return _emitter


def reset_emitter() -> None:
    """Reset the cached emitter (useful for tests and reconfiguration)."""
    global _emitter
    _emitter = None


def _create_emitter() -> Emitter:
    backend = os.environ.get("BEACON_EMITTER", "").lower()
    if backend == "kinesis":
        return KinesisEmitter()
    return StdoutEmitter()
