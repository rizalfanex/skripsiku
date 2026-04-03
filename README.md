<div align="center">

<img src="logo-skripsiku.png" alt="Skripsiku" width="180" />

<h3>AI Academic Writing Assistant</h3>
<p><i>Powered by Kimi K2 × NVIDIA — for Indonesian students, researchers & journal authors</i></p>

[![Status: Beta](https://img.shields.io/badge/status-beta-orange.svg)](https://github.com/rizalfanex/skripsiku/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-green.svg)](https://fastapi.tiangolo.com)
[![Next.js 14](https://img.shields.io/badge/Next.js-14-black.svg)](https://nextjs.org/)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED.svg)](https://www.docker.com/)
[![NVIDIA Kimi K2](https://img.shields.io/badge/NVIDIA-Kimi_K2-76B900.svg)](https://integrate.api.nvidia.com/)

<br/>

> [!WARNING]
> **This project is in Beta** — Features may be incomplete, APIs may change, and rough edges exist. Feedback and contributions are warmly welcome!

<p>
  <a href="#getting-started"><b>🚀 Quick Start</b></a> &nbsp;·&nbsp;
  <a href="#features"><b>✨ Features</b></a> &nbsp;·&nbsp;
  <a href="https://github.com/rizalfanex/skripsiku/issues"><b>🐛 Report Bug</b></a> &nbsp;·&nbsp;
  <a href="https://github.com/rizalfanex/skripsiku/issues"><b>💡 Request Feature</b></a>
</p>

</div>

---

## What is Skripsiku?

Skripsiku is a full-stack AI assistant designed specifically for academic writing in Indonesian universities. It helps you write, revise, paraphrase, analyze, and improve academic documents — from undergraduate theses to international journal papers — all powered by NVIDIA's Kimi K2 model family.

The interface is inspired by ChatGPT: you open the app and you're immediately in a chat. No mandatory project setup, no friction. Just start writing.

---

## Features

### 🧠 Three AI Modes
| Mode | Model | Best For |
|------|-------|----------|
| **Instant** | Kimi K2 Instruct | Fast drafting, grammar, paraphrasing, translation |
| **Thinking Standard** | Kimi K2 Thinking | Research gap analysis, argument expansion, critiquing |
| **Thinking Extended** | Kimi K2 Thinking (multi-step) | Journal upgrades, reviewer simulation, deep methodology review |

### ✍️ Academic Task Library (14+ tasks)
- Grammar correction & academic rewriting
- Paraphrasing & similarity reduction
- Research gap analysis & novelty identification
- Hypothesis & conceptual framework drafting
- Literature review synthesis
- Methodology drafting & results interpretation
- Abstract generation
- Journal upgrade (Q1/Q2 targeting)
- Reviewer simulation & rebuttal letter writing
- APA / IEEE / MLA / Chicago / Harvard citation formatting
- ID ↔ EN translation
- Originality analysis

### 💬 ChatGPT-like Conversation UX
- Land directly in chat — no project creation required
- Full conversation memory: previous messages are sent as context
- AI-generated conversation titles
- Sidebar history grouped by: Today, Yesterday, This Week, Older
- Projects are optional tags (for organizing chats), not mandatory gateways

### ⚡ Technical Highlights
- **Streaming** via Server-Sent Events (SSE) — words appear in real time
- **Guest mode** — works without any account
- **Auth** — JWT with refresh tokens (optional but available)
- **Persistent history** — conversations stored in SQLite (or PostgreSQL for production)
- **Docker-first** — single `docker compose up --build` to run everything
- **Bilingual** — Indonesian (PUEBI/EYD) and English academic output

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS, Framer Motion, Zustand |
| Backend | FastAPI, SQLAlchemy (async), SQLite / PostgreSQL |
| AI | NVIDIA API — Kimi K2 Instruct + Kimi K2 Thinking |
| Auth | JWT (access + refresh tokens) |
| Deployment | Docker + Docker Compose |

---

## Getting Started

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/) & Docker Compose
- An [NVIDIA API key](https://integrate.api.nvidia.com) with access to Kimi K2 models

### 1. Clone the repository
```bash
git clone https://github.com/rizalfanex/skripsiku.git
cd skripsiku
```

### 2. Configure environment variables
```bash
# Copy the example and fill in your values
cp .env.example backend/.env
```

Open `backend/.env` and set at minimum:
```env
NVIDIA_API_KEY=your-nvidia-api-key-here
SECRET_KEY=your-random-secret-key   # generate: python -c "import secrets; print(secrets.token_hex(32))"
```

### 3. Run with Docker
```bash
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

That's it. The database is created automatically on first run.

---

## Local Development (without Docker)

### Backend
```bash
cd backend
python -m venv venv
# Windows: venv\Scripts\activate | Mac/Linux: source venv/bin/activate
pip install -r requirements.txt
cp ../.env.example .env   # then edit .env
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend
```bash
cd frontend
npm install
# Create frontend/.env.local:
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
npm run dev
```

---

## Project Structure

```
skripsiku/
├── backend/
│   ├── app/
│   │   ├── api/v1/          # FastAPI routers (auth, projects, chat, conversations, export)
│   │   ├── core/            # Config, database, security
│   │   ├── models/          # SQLAlchemy ORM models
│   │   ├── schemas/         # Pydantic request/response schemas
│   │   └── services/llm/    # Orchestrator + NVIDIA API client
│   ├── Dockerfile
│   └── main.py
├── frontend/
│   ├── src/
│   │   ├── app/             # Next.js App Router pages
│   │   │   ├── (auth)/      # Login, Register
│   │   │   └── (dashboard)/ # Chat, Projects, Settings, Workspace
│   │   ├── components/      # UI & layout components
│   │   ├── hooks/           # useChat, useConversations, useProject
│   │   ├── lib/             # API client, types, utilities
│   │   └── store/           # Zustand global state
│   └── Dockerfile
├── docker-compose.yml
└── .env.example
```

---

## How It Works

### AI Mode Routing
Each message goes through the **Orchestrator**, which routes to the appropriate model and pipeline:

- **Instant** → single call to `kimi-k2-instruct`, streamed token by token
- **Thinking Standard** → single call to `kimi-k2-thinking` with extended reasoning
- **Thinking Extended** → multi-step pipeline: Initial Draft → Academic Reasoning → Final Revision

### Conversation Memory
When authenticated, every user message and assistant response is persisted to the database. On revisiting a conversation, the full message history is loaded from the backend and sent as context in subsequent requests — exactly like ChatGPT.

### Streaming
Responses stream via SSE. The frontend renders markdown in real-time using `react-markdown`. A special `meta` event carries the `conversation_id` so the URL updates immediately without a page reload.

---

## Roadmap

- [ ] File/PDF upload and extraction
- [ ] Citation database search (Semantic Scholar, CrossRef)
- [ ] Export to DOCX (in progress)
- [ ] Collaborative workspaces
- [ ] Fine-tuning on Indonesian academic corpus
- [ ] Mobile-responsive UI improvements
- [ ] Usage analytics dashboard

---

## Contributing

This project is in early beta and welcomes contributions of all kinds:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'feat: add your feature'`
4. Push to your branch: `git push origin feature/your-feature`
5. Open a Pull Request

Please open an issue first for major changes.

---

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

---

## Disclaimer

> **Skripsiku is a tool to assist academic writing, not to replace the writer.** Always review, verify, and take responsibility for the content you submit. Academic integrity is your responsibility.

---

<div align="center">
Made with ☕ for Indonesian academia
</div>

## Arsitektur

```
skripsiku/
├── backend/               # FastAPI + SQLAlchemy
│   ├── app/
│   │   ├── api/v1/        # Auth, Projects, Chat (SSE), Export
│   │   ├── core/          # Config, Database, Security
│   │   ├── models/        # User, Project, Conversation, Message
│   │   ├── schemas/       # Pydantic request/response schemas
│   │   └── services/
│   │       ├── llm/       # NVIDIA provider + Orchestrator
│   │       └── prompts/   # Templates + Builder
│   └── main.py
│
└── frontend/              # Next.js 14 + TypeScript + Tailwind
    └── src/
        ├── app/
        │   ├── page.tsx              # Homepage
        │   ├── (auth)/               # Login, Register
        │   └── (dashboard)/          # Dashboard, Projects, Workspace, Settings
        ├── components/ui/            # Button, Input, Card, Badge, Modal, Spinner
        ├── hooks/                    # useChat, useProject
        ├── lib/                      # types, utils, api client
        └── store/                    # Zustand global store
```

---

## Multi-Model Orchestration

| Mode | Model | Pipeline |
|------|-------|----------|
| **Instant** | `kimi-k2-instruct` | Single call — drafting, grammar, paraphrase, translate |
| **Thinking Standard** | `kimi-k2-thinking` | Single call with analysis overlay — research gap, discussion |
| **Thinking Extended** | instruct → thinking → instruct | 3-step pipeline — journal upgrade, thesis generation |

Beberapa task type secara otomatis di-upgrade ke mode yang lebih tinggi terlepas dari pilihan pengguna (contoh: `research_gap_analysis` → Thinking Standard minimum).

---

## Setup

### Prasyarat
- Python 3.11+
- Node.js 18+
- NVIDIA API Key (daftar di https://build.nvidia.com)

### 1. Clone & Environment

```bash
git clone <repo-url>
cd skripsiku
cp .env.example .env
```

Edit `.env` dan isi nilai berikut:

```env
NVIDIA_API_KEY=nvapi-xxxxxxxxxxxxxxxxxxxx
SECRET_KEY=ganti-dengan-string-acak-panjang-minimal-32-karakter
```

### 2. Backend

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate
# Linux/Mac
source venv/bin/activate

pip install -r requirements.txt

uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Backend API tersedia di: http://localhost:8000  
Dokumentasi interaktif: http://localhost:8000/docs

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Aplikasi tersedia di: http://localhost:3000

---

## Konfigurasi `.env`

| Variabel | Default | Keterangan |
|----------|---------|------------|
| `NVIDIA_API_KEY` | — | **Wajib.** API key dari build.nvidia.com |
| `NVIDIA_BASE_URL` | `https://integrate.api.nvidia.com/v1` | Endpoint NVIDIA API |
| `NVIDIA_DEPLOYMENT_MODE` | `hosted` | `hosted` atau `self-hosted` (NIM) |
| `MODEL_INSTANT` | `moonshotai/kimi-k2-instruct-0905` | Model untuk mode Instant |
| `MODEL_THINKING_STANDARD` | `moonshotai/kimi-k2-thinking` | Model untuk Thinking Standard |
| `MODEL_THINKING_EXTENDED` | `moonshotai/kimi-k2-thinking` | Model untuk Thinking Extended |
| `DATABASE_URL` | `sqlite+aiosqlite:///./skripsiku.db` | Dapat diganti ke PostgreSQL |
| `SECRET_KEY` | — | **Wajib.** Kunci JWT (min. 32 karakter) |
| `BACKEND_CORS_ORIGINS` | `http://localhost:3000` | URL frontend (pisahkan dengan koma) |
| `MAX_TOKENS_INSTANT` | `4096` | Batas token mode Instant |
| `MAX_TOKENS_THINKING_STANDARD` | `8192` | Batas token Thinking Standard |
| `MAX_TOKENS_THINKING_EXTENDED` | `16384` | Batas token Thinking Extended |

---

## Docker (Opsional)

```bash
cp .env.example .env
# Edit .env dengan API key Anda
docker-compose up --build
```

---

## Task Types yang Tersedia

| Task | Deskripsi |
|------|-----------|
| `academic_rewrite` | Tulis ulang teks secara akademik |
| `grammar_correction` | Koreksi tata bahasa |
| `paraphrasing` | Parafrase dengan mempertahankan makna |
| `reduce_similarity` | Kurangi kemiripan tanpa mengubah substansi |
| `expand_argument` | Kembangkan argumen ilmiah |
| `thesis_title_generation` | Generate judul penelitian |
| `problem_formulation` | Susun rumusan masalah |
| `research_gap_analysis` | Analisis celah penelitian |
| `literature_review_synthesis` | Sintesis tinjauan pustaka |
| `methodology_drafting` | Draft metodologi penelitian |
| `discussion_strengthening` | Perkuat bab diskusi |
| `abstract_generation` | Buat abstrak terstruktur |
| `conclusion_improvement` | Perbaiki bab kesimpulan |
| `journal_upgrade` | Tingkatkan ke standar jurnal internasional |
| `reviewer_simulation` | Simulasi komentar reviewer |
| `cover_letter` | Tulis cover letter pengiriman jurnal |
| `rebuttal_letter` | Balas reviewers secara profesional |
| `translate_id_to_en` | Terjemahkan ID → EN akademik |
| `translate_en_to_id` | Terjemahkan EN → ID formal |
| `citation_formatting` | Format daftar referensi sesuai gaya |
| `originality_analysis` | Analisis orisinalitas argumen |

---

## Catatan Etika

Skripsiku dirancang untuk **meningkatkan kualitas tulisan**, bukan untuk:
- Menghindari deteksi plagiarisme
- Menghasilkan karya yang sepenuhnya bukan milik pengguna
- Memfabrikasi referensi akademik

Semua prompt AI secara eksplisit mengedepankan integritas akademik.

---

## Stack Teknologi

**Backend:** FastAPI · SQLAlchemy 2.0 · SQLite/PostgreSQL · JWT · httpx · tenacity · python-docx  
**Frontend:** Next.js 14 · TypeScript · Tailwind CSS · Zustand · Framer Motion · Radix UI · react-markdown  
**AI:** NVIDIA API · Kimi K2 Instruct · Kimi K2 Thinking
