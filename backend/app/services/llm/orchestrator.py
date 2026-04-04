"""
Multi-Model Orchestrator for Skripsiku.

This module implements three orchestration strategies that map to the
user-facing AI modes:

  Instant (single-step)
  ─────────────────────
  → kimi-k2-instruct-0905
    Fast drafting, rewriting, translation, grammar, paraphrasing.

  Thinking Standard (two-step)
  ────────────────────────────
  → kimi-k2-thinking  (deep analysis)
    Research gap analysis, novelty critique, methodology review,
    reviewer-style feedback, logic consistency checking.

  Thinking Extended (three-step pipeline)
  ────────────────────────────────────────
  Step 1: kimi-k2-instruct  → initial structured draft
  Step 2: kimi-k2-thinking  → deep academic reasoning + critique
  Step 3: kimi-k2-instruct  → final polished revision incorporating critique

  This pipeline gives the highest-quality output for complex academic
  tasks like thesis roadmap design, discussion strengthening, and
  in-depth reviewer simulation.

Each step's progress is streamed as SSE events so the frontend can
render real-time feedback about which model is working.
"""
from __future__ import annotations

import json
import logging
from collections.abc import AsyncIterator
from typing import Any

from app.core.config import settings
from app.schemas.chat import AiMode, TaskType
from app.services.llm.nvidia import nvidia_provider
from app.services.prompts.builder import PromptBuilder

logger = logging.getLogger(__name__)

# ── Task → Mode upgrade rules ─────────────────────────────────────────────────
# These tasks require at least Thinking Standard even if the user chose Instant.
_FORCE_THINKING_STANDARD: set[TaskType] = {
    "research_gap_analysis",
    "research_novelty",
    "reviewer_simulation",
    "originality_analysis",
    "discussion_strengthening",
    "conceptual_framework",
    "literature_review_synthesis",
}

_FORCE_THINKING_EXTENDED: set[TaskType] = {
    "journal_upgrade",
    "thesis_title_generation",   # comprehensive version
}


def _resolve_mode(requested_mode: AiMode, task_type: TaskType) -> AiMode:
    """Upgrade mode when the task demands deeper reasoning."""
    if task_type in _FORCE_THINKING_EXTENDED:
        return max_mode(requested_mode, "thinking_extended")
    if task_type in _FORCE_THINKING_STANDARD:
        return max_mode(requested_mode, "thinking_standard")
    return requested_mode


def max_mode(a: AiMode, b: AiMode) -> AiMode:
    order = {"instant": 0, "thinking_standard": 1, "thinking_extended": 2}
    return a if order[a] >= order[b] else b


def _model_for_mode(mode: AiMode, step: str = "main") -> str:
    """Return the configured model name for a given mode / pipeline step."""
    if mode == "instant":
        return settings.model_instant
    if mode == "thinking_standard":
        return settings.model_thinking_standard
    # thinking_extended uses instruct for draft/refine, thinking for analysis
    if step in ("draft", "refine"):
        return settings.model_instant
    return settings.model_thinking_extended


def _max_tokens(mode: AiMode) -> int:
    # All modes share the same token budget — differentiation is algorithmic, not by limit.
    return settings.llm_max_tokens_instant  # all equal (4096 by default)


def _temperature(mode: AiMode) -> float:
    return {
        "instant": settings.llm_temperature_instant,
        "thinking_standard": settings.llm_temperature_thinking,
        "thinking_extended": settings.llm_temperature_extended,
    }[mode]


# ── SSE helper ───────────────────────────────────────────────────────────────

def _sse(event: dict) -> str:
    return f"data: {json.dumps(event, ensure_ascii=False)}\n\n"


# ── Orchestrator ──────────────────────────────────────────────────────────────

class AcademicOrchestrator:
    """Routes academic requests to the appropriate model pipeline."""

    def __init__(self) -> None:
        self.builder = PromptBuilder()

    async def stream(
        self,
        *,
        messages: list[dict],
        mode: AiMode,
        task_type: TaskType,
        language: str,
        citation_style: str,
        document_type: str,
        academic_field: str,
        academic_level: str,
    ) -> AsyncIterator[str]:
        """
        Yield SSE-formatted strings for the client.

        Event types:
          start          → {"type":"start","step":"...","model":"..."}
          chunk          → {"type":"chunk","content":"..."}
          step_complete  → {"type":"step_complete","step":"..."}
          complete       → {"type":"complete","usage":{...},"steps":[...]}
          error          → {"type":"error","message":"..."}
        """
        resolved_mode = _resolve_mode(mode, task_type)
        ctx = dict(
            language=language,
            citation_style=citation_style,
            document_type=document_type,
            academic_field=academic_field,
            academic_level=academic_level,
            task_type=task_type,
        )

        try:
            if resolved_mode == "instant":
                async for chunk in self._single_step(messages, resolved_mode, ctx, "main"):
                    yield chunk
            elif resolved_mode == "thinking_standard":
                async for chunk in self._thinking_standard(messages, ctx):
                    yield chunk
            else:
                async for chunk in self._thinking_extended(messages, ctx):
                    yield chunk
        except Exception as exc:
            logger.exception("Orchestrator error: %s", exc)
            yield _sse({"type": "error", "message": str(exc)})

    # ── Single-step (Instant) ─────────────────────────────────────────────────

    async def _single_step(
        self,
        messages: list[dict],
        mode: AiMode,
        ctx: dict,
        step_name: str,
    ) -> AsyncIterator[str]:
        model = _model_for_mode(mode, "main")
        system_prompt = self.builder.build_system_prompt(**ctx)
        full_messages = [{"role": "system", "content": system_prompt}] + messages

        yield _sse({"type": "start", "step": step_name, "model": model})

        stream_gen = await nvidia_provider.complete(
            model=model,
            messages=full_messages,
            max_tokens=_max_tokens(mode),
            temperature=_temperature(mode),
            stream=True,
        )
        async for chunk in stream_gen:
            yield _sse({"type": "chunk", "content": chunk})

        yield _sse({"type": "step_complete", "step": step_name})
        yield _sse({"type": "complete", "usage": {}, "steps": [step_name]})

    # ── Two-step (Thinking Standard) ──────────────────────────────────────────

    async def _thinking_standard(
        self, messages: list[dict], ctx: dict
    ) -> AsyncIterator[str]:
        """
        Chain-of-Thought (CoT) strategy:
        The model is instructed to reason step-by-step before giving the final answer.
        Same token budget as Instant, but deeper output via structured reasoning prompt.
        """
        model = _model_for_mode("thinking_standard", "main")
        system_prompt = self.builder.build_system_prompt(**ctx)
        analysis_prompt = self.builder.build_analysis_overlay(**ctx)

        cot_instruction = (
            "\n\nApply explicit Chain-of-Thought reasoning:\n"
            "1. **Understand** — Restate the core academic problem in your own words.\n"
            "2. **Analyze** — Break down the relevant components, arguments, or gaps.\n"
            "3. **Reason** — Evaluate each component with academic rigor and evidence-based thinking.\n"
            "4. **Synthesize** — Draw conclusions that are cohesive and grounded.\n"
            "5. **Respond** — Deliver the final academic output based on your reasoning chain.\n\n"
            "Think through each step methodically before writing your answer."
        )

        full_messages = (
            [{"role": "system", "content": system_prompt + "\n\n" + analysis_prompt + cot_instruction}]
            + messages
        )

        yield _sse({"type": "start", "step": "deep_analysis", "model": model})

        stream_gen = await nvidia_provider.complete(
            model=model,
            messages=full_messages,
            max_tokens=_max_tokens("thinking_standard"),
            temperature=_temperature("thinking_standard"),
            stream=True,
        )
        async for chunk in stream_gen:
            yield _sse({"type": "chunk", "content": chunk})

        yield _sse({"type": "step_complete", "step": "deep_analysis"})
        yield _sse({"type": "complete", "usage": {}, "steps": ["deep_analysis"]})

    # ── Three-step pipeline (Thinking Extended) ───────────────────────────────

    async def _thinking_extended(
        self, messages: list[dict], ctx: dict
    ) -> AsyncIterator[str]:
        """
        Multi-step CoT pipeline — same token budget per step as other modes.
        Algorithmic differentiation:
          Step 1: Instruct model  → structured initial draft (CoT: outline → draft)
          Step 2: Thinking model  → rigorous academic critique (CoT: evaluate → critique)
          Step 3: Instruct model  → final polished revision incorporating all feedback
        """
        instruct_model = settings.model_instant
        thinking_model = settings.model_thinking_extended
        system_prompt = self.builder.build_system_prompt(**ctx)
        step_tokens = settings.llm_max_tokens_extended  # same budget per step

        # ── Step 1: Draft (thinking process — hidden by default on frontend) ───
        yield _sse({"type": "thinking_start", "step": "initial_draft"})
        yield _sse({"type": "start", "step": "initial_draft", "model": instruct_model})

        draft_messages = [
            {"role": "system", "content": system_prompt + "\n\nStep 1 — Draft: Outline the structure then write a comprehensive initial draft."},
            *messages,
        ]
        draft_stream = await nvidia_provider.complete(
            model=instruct_model,
            messages=draft_messages,
            max_tokens=step_tokens,
            temperature=settings.llm_temperature_instant,
            stream=True,
        )
        draft_content = ""
        async for chunk in draft_stream:
            draft_content += chunk
            yield _sse({"type": "thinking_chunk", "content": chunk, "step": "initial_draft"})

        yield _sse({"type": "step_complete", "step": "initial_draft"})

        # ── Step 2: Deep Reasoning (thinking process — hidden by default) ────
        analysis_prompt = self.builder.build_analysis_overlay(**ctx)
        yield _sse({"type": "start", "step": "academic_reasoning", "model": thinking_model})

        reasoning_messages = [
            {"role": "system", "content": system_prompt + "\n\n" + analysis_prompt},
            *messages,
            {"role": "assistant", "content": draft_content},
            {
                "role": "user",
                "content": (
                    "Perform a rigorous academic review of the draft. "
                    "Identify: (1) logical weaknesses, (2) missing evidence, "
                    "(3) structural improvements, (4) contribution clarity, "
                    "(5) language/style refinements. Be specific."
                ),
            },
        ]
        critique_stream = await nvidia_provider.complete(
            model=thinking_model,
            messages=reasoning_messages,
            max_tokens=step_tokens,
            temperature=settings.llm_temperature_thinking,
            stream=True,
        )
        critique_content = ""
        async for chunk in critique_stream:
            critique_content += chunk
            yield _sse({"type": "thinking_chunk", "content": chunk, "step": "academic_reasoning"})

        yield _sse({"type": "step_complete", "step": "academic_reasoning"})
        yield _sse({"type": "thinking_end"})

        # ── Step 3: Final Revision (main answer — visible to user) ───────────
        yield _sse({"type": "start", "step": "final_revision", "model": instruct_model})

        revision_messages = [
            {"role": "system", "content": system_prompt + "\n\nYou have completed a draft and academic critique. Now produce the final, publication-ready version incorporating all improvements. Output ONLY the final version."},
            *messages,
            {"role": "assistant", "content": f"## Draft\n{draft_content}"},
            {"role": "assistant", "content": f"## Critique\n{critique_content}"},
            {
                "role": "user",
                "content": "Write the final polished version incorporating all improvements. Output only the final version.",
            },
        ]
        final_stream = await nvidia_provider.complete(
            model=instruct_model,
            messages=revision_messages,
            max_tokens=step_tokens,
            temperature=settings.llm_temperature_extended,
            stream=True,
        )
        async for chunk in final_stream:
            yield _sse({"type": "chunk", "content": chunk})

        yield _sse({"type": "step_complete", "step": "final_revision"})
        yield _sse({
            "type": "complete",
            "usage": {},
            "steps": ["initial_draft", "academic_reasoning", "final_revision"],
        })


# Singleton
orchestrator = AcademicOrchestrator()
