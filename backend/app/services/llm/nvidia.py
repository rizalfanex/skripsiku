"""
NVIDIA LLM Provider Implementation.

Handles both hosted (single API key, model varies via 'model' field) and
self-hosted NIM container modes transparently.

Retry logic is handled via tenacity with exponential back-off.
Rate-limit responses (HTTP 429) trigger a longer pause before retrying.
"""
from __future__ import annotations

import asyncio
import json
import logging
from typing import AsyncIterator

import httpx
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from app.core.config import settings
from app.services.llm.provider import LLMProvider

logger = logging.getLogger(__name__)


class NvidiaProvider(LLMProvider):
    """
    NVIDIA hosted / self-hosted NIM inference provider.

    Deployment modes
    ----------------
    hosted:
        All requests go to settings.nvidia_base_url.
        The 'model' field in the JSON body selects the target model.

    self-hosted:
        settings.nim_endpoint_instant / nim_endpoint_thinking are used
        per model; if blank, falls back to hosted URL.
    """

    def __init__(self) -> None:
        self._client = httpx.AsyncClient(
            timeout=httpx.Timeout(connect=10.0, read=120.0, write=30.0, pool=5.0),
            headers={
                "Authorization": f"Bearer {settings.nvidia_api_key}",
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
        )

    def get_endpoint_for_model(self, model: str) -> str:
        if settings.nvidia_deployment_mode == "self-hosted":
            instant_models = {settings.model_instant}
            thinking_models = {settings.model_thinking_standard, settings.model_thinking_extended}
            if model in instant_models and settings.nim_endpoint_instant:
                return settings.nim_endpoint_instant
            if model in thinking_models and settings.nim_endpoint_thinking:
                return settings.nim_endpoint_thinking
        return settings.nvidia_base_url

    @retry(
        retry=retry_if_exception_type((httpx.TimeoutException, httpx.ConnectError)),
        stop=stop_after_attempt(settings.llm_max_retries),
        wait=wait_exponential(multiplier=settings.llm_retry_delay_seconds, min=1, max=30),
        reraise=True,
    )
    async def complete(
        self,
        *,
        model: str,
        messages: list[dict],
        max_tokens: int,
        temperature: float,
        stream: bool = False,
    ) -> dict | AsyncIterator[str]:
        endpoint = self.get_endpoint_for_model(model)
        payload = {
            "model": model,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "stream": stream,
        }

        if stream:
            return self._stream(endpoint, payload)

        response = await self._client.post(endpoint, json=payload)
        if response.status_code == 429:
            retry_after = int(response.headers.get("retry-after", 10))
            logger.warning("Rate limited by NVIDIA API. Waiting %ds", retry_after)
            await asyncio.sleep(retry_after)
            response = await self._client.post(endpoint, json=payload)

        response.raise_for_status()
        data = response.json()
        choice = data["choices"][0]["message"]
        return {
            "content": choice["content"],
            "usage": data.get("usage", {}),
            "model": data.get("model", model),
        }

    async def _stream(self, endpoint: str, payload: dict) -> AsyncIterator[str]:
        """Yield content chunks from an SSE stream."""
        async with self._client.stream("POST", endpoint, json=payload) as response:
            if response.status_code == 429:
                retry_after = int(response.headers.get("retry-after", 10))
                await asyncio.sleep(retry_after)
                # Re-raise to let tenacity retry (non-streaming path handles this)
                raise httpx.HTTPStatusError(
                    "Rate limited", request=response.request, response=response
                )
            response.raise_for_status()
            async for line in response.aiter_lines():
                if not line.startswith("data:"):
                    continue
                data_str = line[len("data:"):].strip()
                if data_str == "[DONE]":
                    break
                try:
                    data = json.loads(data_str)
                    delta = data["choices"][0].get("delta", {})
                    chunk = delta.get("content", "")
                    if chunk:
                        yield chunk
                except (json.JSONDecodeError, KeyError, IndexError):
                    continue

    async def close(self) -> None:
        await self._client.aclose()


# Singleton instance
nvidia_provider = NvidiaProvider()
