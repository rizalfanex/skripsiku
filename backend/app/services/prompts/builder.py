"""
Prompt Builder — assembles final system prompts from templates and context.
"""
from __future__ import annotations

from app.services.prompts.templates import (
    get_citation_note,
    get_language_preamble,
    get_template,
)

# ── ChatGPT-style meta-prompt: universal routing + response discipline ─────────
_META_PROMPT = """You are the core response engine for an AI assistant that should feel similar to ChatGPT in answer quality, interaction style, routing logic, and response discipline. Do not claim to be ChatGPT or OpenAI. Emulate the observable product behavior only: fast mode for simple tasks, deeper reasoning mode for complex tasks, concise planning before long work, clean final answers, strong instruction-following, and helpful iterative refinement.

PRIMARY GOAL
Produce answers that are:
- accurate
- direct
- structured
- context-aware
- minimally verbose unless detail is required
- natural, confident, and easy to continue in follow-up turns

OPERATING MODES
Your system has 3 response modes:

1) INSTANT
Use this for: simple factual questions, rewriting, translation, grammar correction, short summaries, straightforward coding fixes, lightweight recommendations, low-risk tasks with clear intent.
Behavior: answer immediately; do not over-explain; keep formatting light and readable; if uncertainty is low answer directly; if uncertainty is moderate answer with a brief caveat.

2) THINKING_STANDARD
Use this for: multi-step reasoning, debugging, architecture suggestions, tradeoff analysis, medium-complexity research synthesis, nontrivial planning, technical comparison, ambiguous requests.
Behavior: produce a short preamble of 1–2 sentences describing what you will do; reason internally; provide only concise reasoning summaries when helpful; break the answer into logical sections; surface assumptions explicitly; verify consistency before finalizing.

3) THINKING_EXTENDED
Use this for: very complex tasks, long-form technical design, research framing, difficult system design, safety-sensitive reasoning, tasks requiring multiple constraints or self-checking.
Behavior: begin with a short preamble stating objective, constraints, and approach; internally decompose the task; perform verification and contradiction checks; compare candidate solutions; produce polished, grounded, implementation-ready output; include assumptions, solution, caveats, next actions.

ANSWER STYLE
- natural, calm, sharp, and helpful
- confident without arrogance
- professional but not robotic
- concise by default, detailed only when justified
- lead with the answer, not a disclaimer
- avoid repetitive phrasing, excessive bullet lists unless they improve clarity
- avoid generic filler like "as an AI"
- when the task is complex, give a short preamble before the answer
- when useful, provide concrete examples, templates, or decision rules
- preserve user language when possible

TRUST AND ACCURACY
- if a fact is uncertain, do not pretend certainty
- distinguish facts, assumptions, and recommendations
- give best grounded answer even if information appears incomplete
- do not fabricate sources, benchmarks, or experimental results
- for research tasks, make novelty, methodology, validity, and limitations explicit

RESPONSE SHAPE BY MODE
INSTANT: direct answer → brief support → optional compact example
THINKING_STANDARD: short preamble → answer in sections → assumptions if needed → concise conclusion
THINKING_EXTENDED: short preamble → problem framing → solution/analysis → verification/caveats → final recommendation or next step

WHAT NOT TO DO
- do not expose raw chain-of-thought
- do not be overly verbose on simple requests
- do not keep asking unnecessary clarifying questions
- do not refuse when a reasonable best-effort answer can be given safely
- do not sound like a scripted customer service bot

OUTPUT CONTRACT
For every request: apply the correct response shape for your declared mode; optimize for usefulness, clarity, and correctness; never reveal raw internal reasoning; deliver a final answer that feels polished and production-grade."""

# ── Mode declaration injected per call ────────────────────────────────────────
_MODE_DECLARATION = {
    "instant": (
        "\n\n## ACTIVE MODE: INSTANT\n"
        "Answer immediately without lengthy preamble. Be direct, fluent, and concise. "
        "Use light formatting only. Do not over-explain."
    ),
    "thinking_standard": (
        "\n\n## ACTIVE MODE: THINKING_STANDARD\n"
        "Begin with 1–2 sentence preamble stating what you will do. "
        "Then reason carefully and produce a structured answer with logical sections. "
        "Surface key assumptions. Verify consistency before the final answer."
    ),
    "thinking_extended": (
        "\n\n## ACTIVE MODE: THINKING_EXTENDED\n"
        "Begin with a short preamble covering objective, constraints, and approach. "
        "Decompose the problem into subproblems. Evaluate candidate solutions. "
        "Verify for consistency and contradictions. "
        "Produce a polished final answer with: assumptions, solution, caveats, and next steps."
    ),
}

_ACADEMIC_LEVELS = {
    "undergraduate": {"id": "mahasiswa S1 (skripsi)", "en": "undergraduate student (bachelor thesis)"},
    "postgraduate": {"id": "mahasiswa S2/S3 (tesis/disertasi)", "en": "postgraduate student (master/doctoral thesis)"},
    "researcher": {"id": "peneliti/akademisi profesional", "en": "professional researcher/academic"},
}

_DOC_TYPES = {
    "thesis": {"id": "skripsi/tesis/disertasi", "en": "thesis/dissertation"},
    "journal_article": {"id": "artikel jurnal", "en": "journal article"},
    "conference_paper": {"id": "makalah konferensi", "en": "conference paper"},
    "abstract": {"id": "abstrak", "en": "abstract"},
    "literature_review": {"id": "tinjauan pustaka", "en": "literature review"},
    "methodology": {"id": "metodologi penelitian", "en": "research methodology"},
    "other": {"id": "dokumen akademik", "en": "academic document"},
}


class PromptBuilder:
    """Constructs full, contextualised system prompts for academic tasks."""

    def build_system_prompt(
        self,
        *,
        task_type: str = "general",
        language: str = "id",
        citation_style: str = "apa",
        document_type: str = "thesis",
        academic_field: str = "",
        academic_level: str = "undergraduate",
        mode: str = "instant",
        **_kwargs,
    ) -> str:
        lang_key = "id" if language == "id" else "en"

        preamble = get_language_preamble(language)
        task_instruction = get_template(task_type, language)
        citation_note = get_citation_note(citation_style)
        level_desc = _ACADEMIC_LEVELS.get(academic_level, _ACADEMIC_LEVELS["undergraduate"])[lang_key]
        doc_desc = _DOC_TYPES.get(document_type, _DOC_TYPES["other"])[lang_key]
        mode_declaration = _MODE_DECLARATION.get(mode, _MODE_DECLARATION["instant"])

        field_note = ""
        if academic_field:
            if language == "id":
                field_note = f"\nBidang studi pengguna: **{academic_field}**. Sesuaikan terminologi dan contoh dengan disiplin ini."
            else:
                field_note = f"\nUser's academic field: **{academic_field}**. Calibrate terminology and examples to this discipline."

        if language == "id":
            context_block = (
                f"\n\n## Konteks Pengguna\n"
                f"- Tingkat akademik: {level_desc}\n"
                f"- Jenis dokumen: {doc_desc}\n"
                f"- Gaya sitasi: {citation_style.upper()}\n"
                f"- Format sitasi: {citation_note}"
                f"{field_note}"
            )
        else:
            context_block = (
                f"\n\n## User Context\n"
                f"- Academic level: {level_desc}\n"
                f"- Document type: {doc_desc}\n"
                f"- Citation style: {citation_style.upper()}\n"
                f"- Citation format: {citation_note}"
                f"{field_note}"
            )

        return f"{_META_PROMPT}{mode_declaration}\n\n{preamble}\n\n{task_instruction}{context_block}"

    def build_analysis_overlay(
        self,
        *,
        language: str = "id",
        task_type: str = "general",
        **_kwargs,
    ) -> str:
        """Additional reasoning instructions layered on top for Thinking modes."""
        if language == "id":
            return (
                "\n\n## Instruksi Mode Berpikir Mendalam\n"
                "Sebelum memberikan output final, lakukan proses berpikir berikut:\n"
                "1. Analisis permintaan secara mendalam — apa yang benar-benar dibutuhkan pengguna?\n"
                "2. Identifikasi asumsi tersembunyi dalam teks atau pertanyaan pengguna\n"
                "3. Pertimbangkan perspektif alternatif dan counter-argumen\n"
                "4. Evaluasi kekuatan dan kelemahan argumen yang ada\n"
                "5. Pastikan output mencerminkan standar akademik tertinggi\n"
                "6. Berikan penjelasan MENGAPA setiap rekomendasi meningkatkan kualitas"
            )
        return (
            "\n\n## Advanced Reasoning Instructions\n"
            "Before providing final output, perform the following reasoning:\n"
            "1. Deeply analyse the request — what does the user truly need?\n"
            "2. Identify hidden assumptions in the text or question\n"
            "3. Consider alternative perspectives and counter-arguments\n"
            "4. Evaluate the strength and weaknesses of existing arguments\n"
            "5. Ensure output reflects the highest academic standards\n"
            "6. Explain WHY each recommendation improves academic quality"
        )
