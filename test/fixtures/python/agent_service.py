from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol

DEFAULT_TIMEOUT: int = 30
_INTERNAL_SENTINEL = object()


class Runnable(Protocol):
    def run(self, payload: bytes) -> bytes:
        ...


@dataclass(frozen=True)
class AgentService:
    service_id: str
    timeout_seconds: int = DEFAULT_TIMEOUT

    def describe(self) -> str:
        return self.service_id

    async def execute(self, payload: bytes) -> bytes:
        return payload

    def _debug_label(self) -> str:
        return f"agent:{self.service_id}"


def build_service(service_id: str, *, timeout_seconds: int = DEFAULT_TIMEOUT) -> AgentService:
    return AgentService(service_id=service_id, timeout_seconds=timeout_seconds)


async def fetch_payload(url: str) -> bytes:
    return url.encode()
