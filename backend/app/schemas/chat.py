from __future__ import annotations
from typing import Literal, Optional
from pydantic import BaseModel, Field

# ── Request Types ─────────────────────────────────────────────────────────────

AiMode = Literal["instant", "thinking_standard", "thinking_extended"]
Language = Literal["id", "en", "bilingual"]
CitationStyle = Literal["apa", "ieee", "mla", "chicago", "harvard"]
DocumentType = Literal[
    "thesis", "journal_article", "conference_paper", "abstract",
    "literature_review", "methodology", "other"
]
TaskType = Literal[
    "general",
    # Thesis tasks
    "thesis_title_generation",
    "problem_formulation",
    "research_gap_analysis",
    "research_novelty",
    "hypothesis_drafting",
    "conceptual_framework",
    "literature_review_synthesis",
    "methodology_drafting",
    "results_interpretation",
    "discussion_strengthening",
    "conclusion_improvement",
    "abstract_generation",
    # Journal tasks
    "journal_upgrade",
    "cover_letter",
    "rebuttal_letter",
    "reviewer_simulation",
    # Writing improvement
    "academic_rewrite",
    "grammar_correction",
    "paraphrasing",
    "expand_argument",
    "formalize_text",
    "reduce_similarity",
    # Translation
    "translate_id_to_en",
    "translate_en_to_id",
    # Citation
    "citation_formatting",
    "reference_cleanup",
    "originality_analysis",
]


class ChatMessage(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str


class ChatRequest(BaseModel):
    project_id: Optional[str] = None
    conversation_id: Optional[str] = None
    messages: list[ChatMessage] = Field(..., min_length=1)
    mode: AiMode = "instant"
    task_type: TaskType = "general"
    language: Language = "id"
    citation_style: CitationStyle = "apa"
    document_type: DocumentType = "thesis"
    academic_field: str = ""
    academic_level: str = "undergraduate"
    stream: bool = True


class ChatResponse(BaseModel):
    conversation_id: str
    message_id: str
    content: str
    model_used: str
    mode_used: str
    task_type: str
    steps: list[dict] = []
    usage: dict = {}


class StreamEvent(BaseModel):
    type: Literal["start", "chunk", "step_complete", "complete", "error"]
    step: Optional[str] = None
    model: Optional[str] = None
    content: Optional[str] = None
    data: Optional[dict] = None
