# Sensoria Capture — Technical Implementation Plan

**Version:** 1.0
**Date:** April 2026
**Purpose:** Bridge the PRD to buildable infrastructure. Guide Claude Code sessions and developer handoffs.

---

## 1. Current State

### 1.1 What exists

A single `index.html` file (~48KB) running client-side React via CDN with Babel transpilation. No build step. No backend. No persistence. Deploys on GitHub Pages.

```
index.html
├── CSS (inline <style> block, ~3KB)
├── React app (inline <script type="text/babel">, ~45KB)
│   ├── Crypto functions (AES-256-GCM, PBKDF2)
│   ├── Constants (179-item method taxonomy, PPIA types, body regions, etc.)
│   ├── UI components (Slider, BodyMap)
│   └── Main App (state management, recording, export)
└── CDN dependencies
    ├── React 18.3.1
    ├── ReactDOM 18.3.1
    └── Babel Standalone 7.24.7
```

### 1.2 What works

- Voice recording via MediaRecorder API
- Multi-compound selection with per-compound dosing and prime/probe tagging
- 3-level body map intensity
- Physical factors multi-select
- AES-256-GCM encryption via Web Crypto API
- Encrypted file export (JSON + optional audio)
- All UI renders correctly on mobile Safari and Chrome

### 1.3 What doesn't exist yet

- Build system (no bundler, no TypeScript, no component library)
- Backend / API
- Persistent storage (each session is ephemeral)
- User authentication (handle + passphrase is per-session, not persistent)
- Voice transcription pipeline
- LLM integration (Diary product)
- SDRF vault connection
- Analytics or telemetry of any kind

---

## 2. Target Architecture

### 2.1 Phase 1: Structured app (weeks 1-2)

Migrate the monolith `index.html` into a proper React app with a build system, component library, and clean separation of concerns. No backend yet — still static, still GitHub Pages deployable.

```
sensoria-capture/
├── public/
│   └── index.html
├── src/
│   ├── app.jsx                    Main app shell, step routing
│   ├── components/
│   │   ├── VaultScreen.jsx        Handle + passphrase creation
│   │   ├── VoiceCapture.jsx       Recording orb, audio management
│   │   ├── MethodSelector.jsx     Multi-select dropdown, per-compound dose
│   │   ├── ContextForm.jsx        Setting, social, date, intention
│   │   ├── ExplorerProfile.jsx    PPIA typology, experience frequency
│   │   ├── DimensionSliders.jsx   Arousal, valence, ego dissolution
│   │   ├── TimePerception.jsx     7-point categorical grid
│   │   ├── BodyMap.jsx            SVG body map with intensity
│   │   ├── PhysicalFactors.jsx    Multi-select chips
│   │   ├── Connectedness.jsx      Self, others, world sliders
│   │   ├── ReviewExport.jsx       Summary, encryption, download
│   │   ├── SignalHandoff.jsx      Signal contact and instructions
│   │   ├── CertificationCTA.jsx   Sovereign Explorer program link
│   │   └── ui/                    Shared UI primitives
│   │       ├── Slider.jsx
│   │       ├── Chip.jsx
│   │       ├── Card.jsx
│   │       ├── ProgressBar.jsx
│   │       └── ShieldRow.jsx
│   ├── lib/
│   │   ├── crypto.js              AES-256-GCM encrypt/decrypt functions
│   │   ├── audio.js               MediaRecorder wrapper
│   │   ├── export.js              Artifact assembly and file download
│   │   └── schema.js              Artifact schema definition + validation
│   ├── data/
│   │   ├── methods.js             179-item grouped taxonomy
│   │   ├── ppia-types.js          9 PPIA typology options
│   │   ├── body-regions.js        Body map region definitions
│   │   ├── physical-factors.js    21-item factor list
│   │   ├── time-options.js        7-point temporal scale
│   │   └── social-contexts.js     Social context options
│   ├── hooks/
│   │   ├── useRecording.js        Audio recording state machine
│   │   └── useEncryption.js       Web Crypto wrapper hooks
│   ├── config.js                  Signal contact, version, feature flags
│   └── styles/
│       └── tokens.css             Design tokens (Sensoria brand)
├── package.json
├── vite.config.js                 Vite for dev + build
└── README.md
```

**Why Vite:** Fastest dev server, native ESM, trivial React setup, produces a single static build that still deploys to GitHub Pages. No server-side runtime required.

**Why not Next.js / Remix:** No SSR needed. No routing beyond step progression. Adding a full framework introduces complexity that doesn't serve the product at this stage.

### 2.2 Phase 2: Local sovereign vault + insight dashboard (weeks 3-5)

Before Patrick's SDRF API exists, the app needs persistence. The solution: an IndexedDB-based local vault that encrypts artifacts at rest on the explorer's device. This demonstrates the sovereign vault concept and gives explorers immediate longitudinal value. When SDRF is ready, the local vault syncs to the remote vault through a clean interface.

```
sensoria-capture/
├── src/
│   ├── lib/
│   │   ├── vault.js              IndexedDB local vault (encrypted at rest)
│   │   ├── identity.js           Hash derivation from handle + passphrase
│   │   ├── sdrf-client.js        STUB — future remote vault sync
│   │   └── consent.js            Sharing level management
│   ├── components/
│   │   ├── VaultScreen.jsx       Create vault OR returning explorer login
│   │   ├── InsightDashboard.jsx  Longitudinal view of past captures
│   │   ├── SharingConsent.jsx    Granular consent UI (Level 0-2)
│   │   └── ...
```

**Local vault architecture:**

1. **Identity persistence:** Handle + passphrase derives a vault key (PBKDF2 → AES-256). The key encrypts all IndexedDB entries. Returning explorers enter their handle + passphrase → vault key derived → IndexedDB decrypted → previous captures visible.

2. **Artifact storage:** On export, the artifact writes to both IndexedDB (local vault) AND downloads as a `.sensoria.enc` file. Belt and suspenders. The local copy enables longitudinal features. The downloaded file enables Signal handoff.

3. **SDRF sync stub:** `sdrf-client.js` defines the interface Patrick will implement. `vault.js` calls it if available, falls back to IndexedDB-only when it's not. This means SDRF integration is a single-file implementation task — swap the stub for real API calls.

4. **Offline-first:** Everything works without network after initial page load. The local vault is the primary data store. SDRF sync is eventual, not required.

**Insight dashboard (`InsightDashboard.jsx`):**

The core value proposition for the "existential fitness tracker" framing. The explorer opens the dashboard and sees their own phenomenological trajectory — where they've been, what their attractors are, how their state profile changes across methods, contexts, and time.

```
┌─────────────────────────────────────────────────────┐
│  MY CAPTURES                                         │
│                                                       │
│  Time: [Last week ▼]  Context: [All methods ▼]       │
│  Axes: [Arousal ✓] [Valence ✓] [Ego diss. ✓]        │
│                                                       │
│  ┌───────────────────────────────────────────┐       │
│  │     *              Valence                 │       │
│  │  *     *  *                                │       │
│  │     *        *                             │       │
│  │  *                                         │       │
│  │                     Arousal →              │       │
│  └───────────────────────────────────────────┘       │
│                                                       │
│  Captures: 12  |  Methods: Ketamine (5), Cannabis (3) │
│  Attractor: High valence, moderate arousal, low ego   │
│                                                       │
│  [Mar 25] Ketamine + Cannabis — Arousal: 78, Val: 62  │
│  [Mar 18] Breathwork — Arousal: 45, Val: 85           │
│  [Mar 10] Meditation — Arousal: 22, Val: 70           │
└─────────────────────────────────────────────────────┘
```

**Data source:** Reads from local IndexedDB vault. Decrypts artifacts using the explorer's vault key (already in memory from login). No network required.

**Axes available:** All dimensions from the capture schema — arousal, valence, ego dissolution, temporal perception, connectedness (self/others/world), somatic intensity (aggregate), plus method and context as categorical filters.

**Visualizations (MVP):** Scatter plot of selected 2 axes, color-coded by method. Capture list below with summary stats. Attractor detection: "Your most common state profile when using [method] is [description]."

**Future (Diary integration):** When Diary enriches artifacts with Tier 3-4 dimensions, those dimensions appear as additional selectable axes in the dashboard.

### 2.3 Phase 3: SDRF vault sync (when Patrick's API is ready)

Connect the local vault to Patrick's SDRF remote vault. This is where the app becomes part of the sovereign data fabric.

```
sensoria-capture/
├── src/
│   ├── lib/
│   │   ├── sdrf-client.js        REAL — Patrick's vault API client
│   │   └── consent.js            Sharing level management
│   ├── components/
│   │   ├── SharingConsent.jsx    Granular consent UI (Level 0-4)
│   │   └── ...
```

**What changes:**
- `sdrf-client.js` stub gets real implementation
- Artifacts sync from IndexedDB → Patrick's remote vault
- Consent UI enables Level 3-4 (study participation, marketplace)
- Feature extraction at the boundary (consent-gated)
- Multi-device access: explorer logs in on a different device, vault syncs

**Patrick's minimum viable API:**
- Store and retrieve encrypted blobs by explorer hash
- List artifacts for a given explorer (metadata only, no decryption)
- Write consent flags per artifact
- API for feature extraction results

### 2.4 Phase 4: Diary / Euqualia layer (future)

Add LLM-guided interview on top of the Capture data.

```
sensoria-capture/
├── src/
│   ├── lib/
│   │   ├── diary-agent.js         LLM interview orchestration
│   │   ├── transcription.js       Whisper integration (local or API)
│   │   └── feature-extraction.js  NLP → dimensional extraction
│   ├── components/
│   │   ├── DiaryChat.jsx          Conversational interview UI
│   │   ├── TranscriptReview.jsx   Voice → text review/correction
│   │   ├── DimensionValidation.jsx Explorer validates extracted dims
│   │   └── ...
```

**The Diary flow:**
1. Explorer completes Capture (voice + structured data)
2. Voice is transcribed (Whisper, on-device or API)
3. LLM reads transcript + structured data
4. LLM identifies phenomenological threads worth probing
5. Guided interview via chat UI
6. New dimensions extracted from the conversation
7. Enriched artifact written to vault (references original Capture)

**LLM integration approach:**
- Anthropic Claude API for the interview agent
- System prompt includes: NPSS dimensional taxonomy, the explorer's Capture data, microphenomenological interview technique guidance, Sensoria voice guidelines
- Conversation state maintained in the client
- Each interview turn produces structured observations that feed back into the artifact

---

## 3. Data Schema Evolution

### 3.1 Current schema (v0.3)

See PRD §3.2 for the full JSON structure.

### 3.2 Schema additions for Phase 2

```json
{
  "_schema": "sensoria-capture-v0.4",
  
  "identity": {
    "explorer_hash": "sha256 of handle+passphrase",
    "device_key": "per-device session key",
    "vault_id": "SDRF vault reference"
  },
  
  "timing": {
    "experience_date": "2026-03-25",
    "vault_created_at": "ISO timestamp",
    "voice_started_at": "ISO timestamp",
    "voice_ended_at": "ISO timestamp",
    "export_at": "ISO timestamp",
    "structured_duration_seconds": "computed: export - vault_created - voice_duration"
  },
  
  "consent": {
    "level": 0-4,
    "share_features": true/false,
    "share_full_artifact": true/false,
    "participate_in_study": null or "study_id",
    "marketplace_listed": false,
    "consent_timestamp": "ISO timestamp",
    "revocable": true
  },
  
  "verification": {
    "tier": 0,
    "signals": [],
    "substance_tested": false,
    "biometric_corroboration": false,
    "peer_attestation": false
  },

  "context": { ... },    // existing, unchanged
  "voice": { ... },      // existing, unchanged
  "tier1": { ... },      // existing, unchanged
  "tier2": { ... },      // existing, unchanged
  "physical_state": { ... }  // existing, unchanged
}
```

### 3.3 Schema additions for Phase 3 (Diary)

```json
{
  "_schema": "sensoria-capture-v0.5",
  
  "diary": {
    "interview_date": "ISO timestamp",
    "interview_duration_seconds": 1200,
    "transcript": "full interview transcript",
    "source_capture_id": "reference to original Capture artifact",
    "extracted_dimensions": {
      "tier3": {
        "interoceptive_resolution": { "value": 82, "confidence": 0.7 },
        "awareness_structure": { "breadth": 90, "depth": 85 },
        "noetic_quality": { "value": 72 },
        "visual_phenomenology": { "type": "synesthetic", "detail": "..." },
        "challenging_experience": { "present": true, "catalytic": true }
      },
      "tier4": {
        "temporal_arc": [ ... ],
        "equilibrium_dynamics": { ... }
      }
    },
    "agent_observations": [
      { "dimension": "interoceptive_resolution", "evidence": "...", "confidence": 0.7 }
    ]
  }
}
```

---

## 4. Build Sequence

### 4.1 Sprint 1: App scaffolding (3-5 days)

**Goal:** Migrate `index.html` monolith to Vite + React component architecture. Identical functionality, better developer experience.

```
Tasks:
  1. Initialize Vite + React project
  2. Extract CSS into design tokens file (Sensoria brand variables)
  3. Extract constants into data modules (methods, PPIA, body regions, etc.)
  4. Extract crypto functions into lib/crypto.js
  5. Extract audio recording into lib/audio.js + hooks/useRecording.js
  6. Break App component into per-step components
  7. Create shared UI primitives (Slider, Chip, Card, etc.)
  8. Verify: build output deploys to GitHub Pages identically
  9. Add schema validation (zod or simple runtime checks)
  10. Add timing metadata to export payload

Acceptance criteria:
  - `npm run build` produces a static site
  - Deployed version is functionally identical to current index.html
  - All components render correctly on mobile Safari + Chrome
  - Voice recording works on iOS and Android
  - Export produces valid .sensoria.enc files
  - Timing metadata captured in artifact
```

### 4.2 Sprint 2: Voice pipeline (3-5 days)

**Goal:** Add multi-recording support, prompted recording mode, and optional voice-to-text.

```
Tasks:
  1. Refactor VoiceCapture to support multiple recordings per session
  2. Implement prompted recording mode (visual prompts fade during recording)
  3. Add voice-to-text option using browser SpeechRecognition API
  4. Update artifact schema for voice array + transcript
  5. Add "follow-up recording" capability (record additional notes later in flow)
  6. Test on iOS Safari (SpeechRecognition support varies)

Acceptance criteria:
  - Explorer can record 1-N voice notes
  - Prompts appear on screen during recording (dismissible)
  - Voice-to-text option produces editable transcript
  - All recordings included in encrypted export
```

### 4.3 Sprint 3: Local vault + insight dashboard (5-7 days)

**Goal:** Persistent local storage with encrypted IndexedDB vault. Returning explorer login. Insight dashboard showing longitudinal state trajectory.

```
Prerequisites:
  - Sprint 1 complete (component architecture)
  - Sprint 2 complete (multi-voice)

Tasks:
  1. Implement vault.js — IndexedDB wrapper with AES-256-GCM at rest
  2. Implement identity.js — PBKDF2 hash derivation from handle + passphrase
  3. Update VaultScreen to support returning explorer login
  4. On export: write artifact to IndexedDB AND download as file
  5. Build InsightDashboard component:
     - Time period selector (week, month, all)
     - Context filters (method, social, setting)
     - Axis selector (arousal, valence, ego, connectedness, etc.)
     - Scatter plot of selected 2 axes, color-coded by method
     - Capture list with summary stats
     - Attractor detection (most common state profile per method)
  6. Add dashboard access from review/export step and vault login
  7. Implement consent level selection (Level 0-2)
  8. Create sdrf-client.js stub with full interface spec
  9. vault.js calls sdrf-client if available, falls back to IndexedDB

Acceptance criteria:
  - Returning explorer enters handle + passphrase → sees previous captures
  - New captures stored locally AND downloadable
  - Insight dashboard renders with real data from vault
  - Axis selection changes the visualization
  - Method filter works
  - Works fully offline
  - SDRF stub is clean and documented
```

### 4.4 Sprint 4: SDRF integration (when Patrick's API is ready)

**Goal:** Connect local vault to Patrick's remote vault. Sync, consent-gated sharing, multi-device access.

```
Prerequisites:
  - Patrick's SDRF vault API available (minimum: store/retrieve/list)
  - Identity model agreed (hash derivation + device key)

Tasks:
  1. Implement sdrf-client.js against Patrick's actual API
  2. Add sync logic: local vault ↔ remote vault
  3. Add consent management UI for Level 3-4
  4. Enable multi-device access (login on new device, vault syncs)
  5. Feature extraction at boundary (consent-gated)

Acceptance criteria:
  - Artifacts sync to remote vault
  - Consent levels respected at extraction boundary
  - Offline-first: local vault always works, sync is eventual
```

### 4.5 Sprint 5: Diary MVP (when Anthropic API key is provisioned)

**Goal:** LLM-guided follow-up interview that reads Capture data and probes for deeper dimensions.

```
Prerequisites:
  - Anthropic API key provisioned
  - Whisper API or local deployment available
  - Sprint 3 complete (vault stores Capture artifacts)

Tasks:
  1. Build transcription pipeline (Whisper API or browser SpeechRecognition)
  2. Design Diary agent system prompt (microphenomenology technique, NPSS taxonomy)
  3. Build DiaryChat component (conversational UI)
  4. Implement: agent reads Capture artifact, generates opening questions
  5. Implement: agent extracts Tier 3-4 dimensions from conversation
  6. Build DimensionValidation component (explorer reviews extracted dimensions)
  7. Write enriched artifact to vault (linked to source Capture)
  8. Test with real experience reports

Acceptance criteria:
  - Agent produces relevant, non-generic follow-up questions
  - Extracted dimensions are plausible and validated by explorer
  - Enriched artifact references source Capture artifact
  - Conversation feels like a skilled interviewer, not a chatbot
```

---

## 5. Infrastructure Decisions

### 5.1 Hosting

| Phase | Hosting | Rationale |
|-------|---------|-----------|
| Phase 1 | GitHub Pages | Free, static, zero ops |
| Phase 2 | GitHub Pages + SDRF API | Static frontend, Patrick's vault backend |
| Phase 3 | Vercel or Cloudflare Pages + SDRF API | Need API routes for LLM proxy |

The frontend should remain a static build as long as possible. The only reason to move to Vercel/Cloudflare is if we need server-side API routes to proxy the Anthropic API (keeping the API key off the client).

### 5.2 LLM API architecture

The Diary agent needs an LLM API. Options:

**Option A: Direct client-side API call**
- Explorer's browser calls Anthropic API directly
- Requires API key in client (unacceptable for production)
- Acceptable for alpha testing with a limited-budget key

**Option B: Thin API proxy**
- Minimal server function (Cloudflare Worker, Vercel Edge Function, or AWS Lambda)
- Receives conversation from client, forwards to Anthropic API, returns response
- API key stays server-side
- Adds ~50ms latency, negligible cost

**Option C: SDRF-integrated**
- LLM calls go through SDRF infrastructure
- Conversation history stored in vault
- Maximum sovereignty but highest implementation cost

**Recommendation:** Option B for Diary MVP. A single Cloudflare Worker (~30 lines) proxies the Anthropic API. Migrate to Option C when SDRF is mature.

### 5.3 Transcription

| Option | Quality | Privacy | Latency | Cost |
|--------|---------|---------|---------|------|
| Browser SpeechRecognition | Medium | High (on-device) | Real-time | Free |
| Whisper API (OpenAI) | High | Medium (data sent to OpenAI) | 5-15s per minute | ~$0.006/min |
| Whisper local (whisper.cpp) | High | High (on-device) | Varies | Free |
| Deepgram API | High | Medium | Real-time | ~$0.01/min |

**Recommendation:** Browser SpeechRecognition for MVP (free, on-device, works on Chrome/Safari). Upgrade to local Whisper when the processing pipeline matures. Avoid sending audio to third-party APIs until SDRF consent model supports it.

---

## 6. Sensoria Brand Implementation

### 6.1 Design tokens

```css
/* Sensoria Capture design tokens */

/* Colors — Phthalo green primary, infrastructure dark mode */
--sensoria-phthalo: #00796B;
--sensoria-phthalo-deep: #004D40;
--sensoria-phthalo-light: #26A69A;
--sensoria-phthalo-glow: rgba(0, 121, 107, 0.35);
--sensoria-phthalo-dim: rgba(0, 121, 107, 0.12);
--sensoria-gold: #FFD28D;
--sensoria-bg: #080d12;
--sensoria-bg-card: #0f151c;
--sensoria-bg-elevated: #1a232e;
--sensoria-text: #e4e9ee;
--sensoria-text-secondary: #8899aa;
--sensoria-text-dim: #4d5e6f;
--sensoria-border: rgba(255, 255, 255, 0.06);
--sensoria-danger: #ef6b73;
--sensoria-accent-warm: #ffb86c;
--sensoria-accent-cool: #7dcfff;

/* Typography — v3.1 canonical stack */
/* NOTE: Current tool uses DM Sans + JetBrains Mono. 
   v3.1 spec is Plus Jakarta Sans + IBM Plex Mono.
   Migration to canonical stack is a future task. */
--sensoria-font-display: 'Plus Jakarta Sans', sans-serif;  /* 700-800 weight */
--sensoria-font-body: 'Plus Jakarta Sans', sans-serif;     /* 400-500 weight */
--sensoria-font-data: 'IBM Plex Mono', monospace;          /* data and code */

/* Spacing */
--sensoria-radius-sm: 8px;
--sensoria-radius-md: 12px;
--sensoria-radius-lg: 16px;
--sensoria-radius-pill: 22px;
```

### 6.2 Voice guidelines for copy

All user-facing copy follows Sensoria COM voice (see PRD §14, autoresearch program §6 constraints):

- Direct without being terse
- Warm without being soft
- Treats the explorer as a peer
- No clinical or extractive language ("subjects," "data collection," "study")
- No corporate hedging ("we believe," "it is our intention")
- No superlatives unless earned ("revolutionary," "groundbreaking")
- Use Sensoria terminology: "explorer" not "user," "artifact" not "file," "vault" not "account"

---

## 7. Testing Strategy

### 7.1 Critical paths to test

```
1. VAULT CREATION → VOICE → EXPORT
   The golden path. Must work on iOS Safari, Android Chrome,
   and desktop Chrome/Firefox. Test with:
   - Short recording (30s)
   - Long recording (10min)
   - No recording (skip)
   - Re-recording (clear and redo)

2. MULTI-COMPOUND SELECTION + DOSING
   - Select 1 compound → dose field appears
   - Select 3 compounds → 3 dose fields, prime tag works
   - Remove the prime → next auto-promotes
   - Select "Other" → text input appears

3. ENCRYPTION + DECRYPTION
   - Export produces valid .sensoria.enc
   - Decryption with correct passphrase returns valid JSON
   - Decryption with wrong passphrase fails gracefully
   - Schema version is correct
   - All dimensions present in output

4. BODY MAP INTENSITY
   - Tap cycles through 4 states (off → mild → strong → intense → off)
   - Visual feedback matches state
   - Export includes per-region intensity

5. OFFLINE CAPABILITY
   - Load page → disconnect wifi → complete full flow → export
   - Voice recording works offline
   - Encryption works offline (Web Crypto is synchronous)

6. MOBILE UX
   - Native select picker renders grouped options on iOS and Android
   - All tappable targets are ≥ 44px
   - Keyboard doesn't obscure inputs
   - Scroll behavior is smooth through all steps
   - Fixed nav footer doesn't overlap content
```

### 7.2 Devices to test

| Device | OS | Browser | Priority |
|--------|-----|---------|----------|
| iPhone 13+ | iOS 17+ | Safari | Critical |
| iPhone SE | iOS 17+ | Safari | High (small screen) |
| Pixel / Samsung | Android 13+ | Chrome | Critical |
| iPad | iPadOS 17+ | Safari | Medium |
| MacBook | macOS | Chrome | Medium |
| MacBook | macOS | Safari | Medium |

---

## 8. Claude Code Deployment Guide

### 8.1 Recommended approach

Claude Code is optimized for projects where the AI agent has full context of the codebase and can make changes across multiple files. The Capture tool is well-suited to this because:

- The entire codebase fits within context (~48KB of source)
- The PRD, backlog, and autoresearch spec provide complete product requirements
- Changes are measurable against PF (the scalar metric)
- The component architecture (Phase 1) creates clean edit boundaries

### 8.2 Setting up a Claude Code project

```bash
# Initialize the project
mkdir sensoria-capture && cd sensoria-capture
npm create vite@latest . -- --template react
npm install

# Copy source files
# (migrate from index.html into component structure)

# Create CLAUDE.md — the project instruction file
```

### 8.3 CLAUDE.md specification

Create a `CLAUDE.md` file in the project root. Claude Code reads this automatically on every session. Include:

```markdown
# Sensoria Capture — Claude Code Instructions

## Project overview
Voice-first phenomenological data capture tool for consciousness research.
See CAPTURE-PRD.md for full product requirements.

## Key metric
Phenomenological Fidelity (PF): percentage of experiential signal that
survives compression into structured data. Currently ~48%. Target: 55%.

## Architecture
React + Vite. Client-side only (no backend until SDRF integration).
Components in src/components/. Data constants in src/data/.
Crypto in src/lib/crypto.js. Audio in src/lib/audio.js.

## Brand constraints
- Phthalo green primary (#00796B), infrastructure dark mode
- Plus Jakarta Sans display, IBM Plex Mono data
- COM voice: direct, warm, peer-to-peer, no clinical language
- "Explorer" not "user," "artifact" not "file," "vault" not "account"

## Build and deploy
- `npm run dev` for local development
- `npm run build` for production build (static output in dist/)
- Deploy dist/ to GitHub Pages

## Testing
- Must work on iOS Safari and Android Chrome
- Voice recording is the critical path
- Export must produce valid, decryptable .sensoria.enc files
- All changes must maintain backward compatibility with existing schema

## When making changes
- One variable per change (autoresearch principle)
- Reference the specific PRD section or backlog item you're addressing
- Estimate PF impact of any dimensional change
- Do not exceed the 4-minute structured input friction budget
- Do not remove existing dimensions — only add, reorder, or rephrase
- Test encryption round-trip after any schema change
```

### 8.4 Recommended Claude Code skills

Create or load the following skills for higher-quality output:

**sensoria-brand skill** (already exists at `/mnt/skills/user/sensoria-brand/SKILL.md`)
- Load for any UI work to ensure brand consistency
- Contains design tokens, typography rules, color system, layout patterns

**frontend-design skill** (exists at `/mnt/skills/public/frontend-design/SKILL.md`)
- Load for component creation to avoid generic AI aesthetics
- Guides distinctive, production-grade visual design

**Custom skill: capture-context** (create this)
- Bundle the PRD, backlog, and autoresearch spec into a loadable context
- Include the artifact schema, method taxonomy, and instrument references
- This gives Claude Code full product context on every session

### 8.5 Workflow for iterative improvement

```
1. Start Claude Code session
   → Claude reads CLAUDE.md + loads relevant skills
   → Load the latest PF eval results if available

2. Identify the highest-priority backlog item
   → Reference capture-backlog.md
   → Pick the item with highest efficiency score (weighted_loss / effort)

3. Implement one change
   → Claude Code makes the modification across relevant files
   → Runs build to verify
   → Tests critical paths

4. Verify
   → Build succeeds
   → Export schema is backward-compatible
   → Copy follows COM voice guidelines
   → Change is minimal and reversible

5. Deploy
   → Push to GitHub → Pages auto-deploys
   → Collect new reports
   → Run PF eval
   → Did PF improve? → Keep. Did it drop? → Revert.
```

---

## 9. Migration Checklist

### Phase 1 readiness (app scaffolding)

```
[ ] Vite + React project initialized
[ ] All constants extracted to data modules
[ ] All components extracted and rendering correctly
[ ] Crypto functions extracted and tested (encrypt/decrypt round-trip)
[ ] Audio recording hook working on iOS Safari + Android Chrome
[ ] Design tokens in CSS variables
[ ] Build output deploys to GitHub Pages
[ ] Timing metadata added to artifact
[ ] CLAUDE.md written and tested with Claude Code
[ ] Existing .sensoria.enc files from v0.3 still decryptable
```

### Phase 2 readiness (local vault + insight dashboard)

```
[ ] IndexedDB vault implemented with AES-256-GCM at rest
[ ] Identity hash derivation working (handle + passphrase → vault key)
[ ] Returning explorer login flow implemented
[ ] Artifacts write to IndexedDB AND download as file
[ ] Insight dashboard renders captures from local vault
[ ] Time period, context, and axis selectors working
[ ] Scatter plot visualization with method color coding
[ ] SDRF client stub created with full interface spec
[ ] Vault.js falls back to IndexedDB when SDRF unavailable
[ ] Consent UI implemented (Level 0-2)
[ ] Works fully offline
```

### Phase 3 readiness (SDRF integration — when Patrick's API exists)

```
[ ] Patrick's vault API documented and accessible
[ ] sdrf-client.js implemented against real API
[ ] Local vault syncs to remote vault
[ ] Multi-device login works (sync across devices)
[ ] Consent UI extended to Level 3-4
[ ] Feature extraction at boundary tested
[ ] REQ-ID-01 through REQ-ID-06 from PRD §9.4 satisfied
```

### Phase 4 readiness (Diary MVP)

```
[ ] Transcription pipeline working (browser SpeechRecognition minimum)
[ ] Diary agent system prompt designed and tested
[ ] Conversational UI component built
[ ] Agent reads Capture artifact and generates relevant follow-ups
[ ] Dimension extraction produces plausible Tier 3-4 data
[ ] Explorer validation flow works
[ ] Enriched artifact writes to vault with source reference
[ ] LLM proxy deployed (Cloudflare Worker or equivalent)
```

---

## 10. Risk Register

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|------------|
| iOS Safari blocks MediaRecorder in future update | Voice capture breaks for ~50% of mobile users | Low | Monitor WebKit changelogs. Fallback to voice-to-text. |
| Patrick's SDRF prototype delays | Phase 2-3 blocked | Medium | Phase 1 is independent. File export remains functional. Design vault client against agreed API spec, not implementation. |
| Web Crypto API deprecated or restricted | Encryption breaks | Very low | Web Crypto is a W3C standard with broad support. No deprecation signals. |
| LLM costs exceed budget at scale | Diary sessions become expensive | Medium | Set per-session token limits. Cache common follow-up patterns. Consider open-source models (Llama) for cost reduction. |
| Explorers forget passphrases | Data permanently locked | High (by design) | This is the sovereignty model working correctly. UX should emphasize this during vault creation. Consider optional passphrase hint (stored locally only). |
| Low completion rates | PF measurement unreliable, insufficient data | Medium | Monitor per-step dropout. If completion < 70%, simplify the step with highest abandonment. |
| Voice recordings too large for Signal | Manual handoff breaks | Low | Warn at 20-minute recording. Offer voice-to-text as alternative. Consider chunked upload in Phase 2. |
