# Changelog — Skripsiku

Semua perubahan signifikan pada proyek ini didokumentasikan di sini.
Format mengacu pada [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

---

## [0.3.0] — 2026-04-04

### Fitur Baru
- **Thinking Panel (Collapsible)**  
  Proses berpikir AI (langkah 1 & 2 dari mode `thinking_extended`) kini ditampilkan sebagai panel lipat, bukan sebagai bagian dari respons utama.  
  - Saat streaming: panel "Sedang berpikir..." terbuka otomatis dan konten mengalir ke dalamnya.  
  - Setelah selesai: muncul tombol **"Lihat proses berpikir"** (ikon 🧠) di bawah pesan — klik untuk buka/tutup.  
  - Jawaban final (Step 3) tetap tampil sebagai bubble chat utama, bersih tanpa draft.

### Perbaikan Bug

#### 1. Riwayat Chat Tidak Tersimpan / Sidebar Tidak Diperbarui
- **Akar masalah (Race condition):** Backend menyimpan data ke database di blok `finally` — artinya event SSE `complete` dikirim terlebih dahulu ke frontend, lalu frontend melakukan navigasi dan memuat ulang riwayat yang masih kosong.
- **Perbaikan di `backend/app/api/v1/chat.py`:**  
  Urutan dibalik: simpan ke database **dulu**, baru kirim event `complete`. Navigasi di frontend hanya terpicu setelah stream benar-benar selesai.
- **Perbaikan di `frontend/src/hooks/useChat.ts`:**  
  `onConversationId` (yang memicu `router.replace`) kini hanya dipanggil saat event `complete` diterima, bukan saat `meta`. Ditambahkan `pendingConvIdRef` untuk menyimpan ID sementara.

#### 2. Router Next.js Desinkron (URL Berubah tapi State Tidak Update)
- **Akar masalah:** Perbaikan sebelumnya menggunakan `window.history.replaceState()` untuk menghindari re-render — ini mengubah URL browser tapi tidak memberi tahu Next.js router, sehingga `usePathname()` mengembalikan nilai lama.
- **Perbaikan:** Dikembalikan ke `router.replace('/chat/${id}')` yang proper, namun kini dipanggil setelah stream selesai (bukan di tengah stream) sehingga aman dari masalah timing.

#### 3. Tombol "New Chat" di Sidebar Tidak Berfungsi
- **Akar masalah:** Signal Zustand (`newChatKey`, `triggerNewChat`, dll.) yang ditambahkan sebagai workaround membuat kondisi `useEffect` di Sidebar tidak pernah terpenuhi secara konsisten.
- **Perbaikan:** Semua signal Zustand untuk navigasi dihapus. Sidebar kembali menggunakan `router.push('/chat')` langsung, dan `useEffect` di Sidebar me-refresh daftar percakapan berdasarkan `pathname` saja.

#### 4. Mode Thinking Tidak Memiliki Perbedaan Algoritmik (Hanya Token)
- **Akar masalah:** Ketiga mode (`instant`, `thinking_standard`, `thinking_extended`) menggunakan pipeline yang hampir sama — perbedaannya hanya `max_tokens`. Ini tidak mencerminkan niat desain.
- **Perbaikan di `backend/app/services/llm/orchestrator.py`:**
  - `instant` → satu panggilan ke model `kimi-k2-instruct` (cepat).
  - `thinking_standard` → satu panggilan ke model `kimi-k2-thinking` dengan CoT built-in.
  - `thinking_extended` → **pipeline tiga langkah**:
    - **Step 1** (`kimi-k2-instruct`): Draft struktural awal — emit `thinking_chunk`.
    - **Step 2** (`kimi-k2-thinking`): Analisis akademik mendalam & kritik — emit `thinking_chunk`.
    - **Step 3** (`kimi-k2-instruct`): Revisi final bersih — emit `chunk` (tampil di chat).
  - Step 1 & 2 dikemas dalam `thinking_start` / `thinking_end` agar frontend tahu kapan menampilkan/menyembunyikan panel berpikir.

### Perubahan Teknis

| File | Perubahan |
|---|---|
| `backend/app/api/v1/chat.py` | Simpan DB sebelum `complete` SSE; track `full_thinking` terpisah dari `full_content` |
| `backend/app/services/llm/orchestrator.py` | Step 1 & 2 emit `thinking_chunk`; Step 3 tetap `chunk`; tambah event `thinking_start`/`thinking_end` |
| `frontend/src/lib/types.ts` | Tambah field `thinkingContent?: string` ke interface `ChatMessage` |
| `frontend/src/hooks/useChat.ts` | State baru `streamingThinking`, `isThinking`; handling event `thinking_start/chunk/end`; navigasi defer ke `complete` |
| `frontend/src/components/chat/ChatInterface.tsx` | Komponen `ThinkingPanel`; streaming block & completed messages diperbarui |
| `frontend/src/store/useAppStore.ts` | Hapus signal Zustand yang tidak perlu (`conversationRefreshKey`, `newChatKey`, dll.) |
| `frontend/src/components/layout/Sidebar.tsx` | Kembalikan ke `router.push('/chat')`, hapus listener signal Zustand |

---

## [0.2.0] — 2026-04-03

### Fitur Baru
- Mode selector dipindah ke atas textarea input (sebelumnya di sidebar/topbar).
- Mode pills (`Instan` / `Berpikir` / `Berpikir Mendalam`) kini mudah dijangkau langsung dari area input.

### Perubahan
- README diperbarui: logo, badge flat, callout `[!WARNING]` untuk disclaimer akademik.
- `LICENSE` ditambahkan (MIT, 2026).

---

## [0.1.0] — 2026-04-02

### Rilis Awal
- Backend FastAPI + SQLAlchemy async + SQLite.
- Integrasi NVIDIA API (Kimi K2 instruct + thinking).
- Frontend Next.js 14 (App Router) + TypeScript + Tailwind CSS + Zustand + Framer Motion.
- Autentikasi JWT (register, login, refresh token).
- Manajemen proyek akademik (buat, edit, hapus).
- Chat dengan riwayat percakapan per proyek.
- 14 task type akademik (rewrite, grammar, parafrase, analisis celah, dll.).
- Streaming SSE dari backend ke frontend.
- Docker Compose untuk development & deployment.
- Push ke GitHub: `https://github.com/rizalfanex/skripsiku`.
