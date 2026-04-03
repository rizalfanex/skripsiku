"""
Prompt Builder — assembles final system prompts from templates and context.
"""
from __future__ import annotations

from app.services.prompts.templates import (
    get_citation_note,
    get_language_preamble,
    get_template,
)

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
        **_kwargs,
    ) -> str:
        lang_key = "id" if language == "id" else "en"

        preamble = get_language_preamble(language)
        task_instruction = get_template(task_type, language)
        citation_note = get_citation_note(citation_style)
        level_desc = _ACADEMIC_LEVELS.get(academic_level, _ACADEMIC_LEVELS["undergraduate"])[lang_key]
        doc_desc = _DOC_TYPES.get(document_type, _DOC_TYPES["other"])[lang_key]

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

        return f"{preamble}\n\n{task_instruction}{context_block}"

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
