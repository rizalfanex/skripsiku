"""
Abstract LLM Provider Interface.

Skripsiku supports two deployment strategies:
  - hosted:      Single NVIDIA API key + base URL; model chosen per-request via 'model' field.
  - self-hosted: Each NIM container may expose a distinct endpoint.

The provider abstraction here lets the orchestrator talk to either without
knowing the deployment details.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from typing import AsyncIterator


class LLMProvider(ABC):
    """Base class for all LLM providers."""

    @abstractmethod
    async def complete(
        self,
        *,
        model: str,
        messages: list[dict],
        max_tokens: int,
        temperature: float,
        stream: bool = False,
    ) -> dict | AsyncIterator[str]:
        """
        Send a chat completion request.

        Returns:
          - dict with 'content' and 'usage' keys when stream=False
          - AsyncIterator[str] of content chunks when stream=True
        """
        ...

    @abstractmethod
    def get_endpoint_for_model(self, model: str) -> str:
        """Return the API endpoint URL for a given model identifier."""
        ...
