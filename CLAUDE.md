# Sensoria Experience Capture — Claude Code Project

## What this is

A voice-first phenomenological data capture tool — the "Ear" of the Sensoria NeuroPhenSuite. Explorers open a link, create an encrypted vault, record their experience, tap through structured dimensions, and export a sovereign phenomenological artifact they own. The tool is the primary data collection instrument for the Neurophenomenological State Space (NPSS).

**Product positioning:** "Existential fitness tracker" — the Fitbit for lived experience. Core outcomes: insight and well-being. Dual value: explorers get longitudinal self-knowledge; institutions/retreats can demonstrate efficacy without building HIPAA infrastructure.

## Key metric

**Phenomenological Fidelity (PF):** percentage of experiential signal that survives compression into structured data. Currently ~48%. Target: 55%. Every change should be evaluated against PF impact within the friction budget.

## Friction budget

- Structured inputs (everything except voice): ≤ 4 minutes
- Voice recording: unlimited
- Total: voice + structured ≤ 12 minutes
- If completion rate drops below 70%, simplify the highest-abandonment step

## Architecture

**Framework:** Vite + React (JSX, no TypeScript for now)
**Storage:** IndexedDB for local vault (encrypted, per-explorer). No backend.
**Encryption:** AES-256-GCM via Web Crypto API, PBKDF2 310k iterations
**Voice:** MediaRecorder API (WebM), multiple recordings per session
**Hosting:** GitHub Pages (static build, `npm run build` → `dist/`)
**LLM:** Not integrated yet. `src/lib/diary-agent.js` is a stub with interface spec.
**SDRF:** Not integrated yet. `src/lib/sdrf-client.js` is a stub with interface spec.

## Source structure

```
src/
├── app.jsx                     Main app, step router, global state
├── config.js                   Signal contact, version, feature flags
├── components/
│   ├── VaultScreen.jsx         Handle + passphrase creation / returning login
│   ├── VoiceCapture.jsx        Recording orb, multi-recording, prompted mode
│   ├── MethodSelector.jsx      Multi-select dropdown, per-compound dose
│   ├── ContextForm.jsx         Setting, social context, intention
│   ├── ExplorerProfile.jsx     PPIA multi-select, experience frequency
│   ├── DimensionSliders.jsx    Arousal, valence, ego dissolution
│   ├── TimePerception.jsx      7-point categorical grid
│   ├── BodyMap.jsx             SVG body map, 3-level intensity
│   ├── PhysicalFactors.jsx     Multi-select chips + notes
│   ├── Connectedness.jsx       Self, others, world sliders
│   ├── ReviewExport.jsx        Summary grid, encrypt, download
│   ├── SignalHandoff.jsx       Signal contact card + instructions
│   ├── InsightDashboard.jsx    Longitudinal view of past captures (local vault)
│   └── ui/
│       ├── Slider.jsx
│       ├── Chip.jsx
│       ├── Card.jsx
│       ├── ProgressBar.jsx
│       └── ShieldRow.jsx
├── lib/
│   ├── crypto.js               AES-256-GCM encrypt/decrypt
│   ├── audio.js                MediaRecorder wrapper
│   ├── export.js               Artifact assembly + file download
│   ├── schema.js               Artifact schema definition + validation
│   ├── vault.js                IndexedDB local vault (encrypted at rest)
│   ├── identity.js             Hash derivation from handle + passphrase
│   ├── sdrf-client.js          STUB — Patrick's vault API interface
│   └── diary-agent.js          STUB — LLM interview interface
├── data/
│   ├── methods.js              179-item grouped taxonomy
│   ├── ppia-types.js           9 PPIA typology options
│   ├── body-regions.js         10 body map regions
│   ├── physical-factors.js     21-item factor list
│   ├── time-options.js         7-point temporal scale
│   └── social-contexts.js      6 social context options
├── hooks/
│   ├── useRecording.js         Audio recording state machine
│   ├── useVault.js             IndexedDB CRUD operations
│   └── useEncryption.js        Web Crypto wrapper
└── styles/
    └── tokens.css              Sensoria brand design tokens
```

## Brand constraints (v3.1 — STRICT)

**Mode:** Infrastructure Dark ONLY. No light theme. No white backgrounds.

**Typography:**
- Display/Headlines: Plus Jakarta Sans 600-700, letter-spacing -0.02em
- Body/UI: Plus Jakarta Sans 400-500, line-height 1.6
- Data/Metrics: IBM Plex Mono 400
- Google Fonts CDN: `https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400&display=swap`
- NEVER use: DM Sans, JetBrains Mono, Cormorant Garamond, Inter, Roboto, Space Grotesk

**Colors (CSS custom properties — use these, not hex literals):**
- Backgrounds: `--bg-void: #0A0A0A`, `--bg-primary: #0F1210`, `--bg-surface: #141A16`, `--bg-elevated: #1A221D`
- Phthalo green (brand): `--phthalo-deep: #0A2E1F`, `--phthalo: #0D4A32`, `--phthalo-bright: #12755A`, `--phthalo-glow: #1AE6A0`
- Golden (CTAs only): `--gold: #C9A84C`, `--gold-bright: #E8C85A`
- Cyan (categorical): `--cyan: #00BCD4`
- Text: `--text-primary: #E8E4DF`, `--text-secondary: #9B9689`, `--text-tertiary: #6B675F`
- Borders: `--border-subtle: rgba(232,228,223,0.06)`, `--border-medium: rgba(232,228,223,0.12)`
- Danger: `--red-danger: #C62828`

**Color discipline:**
- Golden is RESERVED for primary CTAs. Not decoration.
- Cyan is CATEGORICAL (states, tools, tags).
- Phthalo green is IDENTITY (brand accents, borders, glows).
- Never use bright saturated colors for large areas.

**Animation:** CSS-only. Ease-out only. No bounce, no elastic. Calm authority.

**Cards:** `--bg-surface` background, `--border-subtle` border, 12px radius, 32px padding.

## Copy guidelines (COM voice)

- Direct, warm, peer-to-peer. No clinical language.
- "Explorer" not "user." "Artifact" not "file." "Vault" not "account."
- No "delve," "tapestry," "landscape," "at its core," "reimagine"
- No "We believe" hedging — state things directly
- No "Wellness" unqualified — say "human flourishing" or be specific
- No exclamation marks

## Schema

See `docs/CAPTURE-PRD.md` §3.2 for the full artifact JSON schema. Key points:
- `_schema` field tracks version (currently `sensoria-capture-v0.4`)
- Methods is an array of `{name, dose, is_primary}` objects
- PPIA typology is an array (multi-select)
- Voice is an array of `{recording_index, duration_seconds, has_audio}` objects
- Timing metadata: `vault_created_at`, `voice_started_at`, `export_at`
- Consent level: integer 0-4
- Backward compatible: consumers must tolerate unknown keys

## Build and deploy

```bash
npm run dev      # Local dev server (Vite)
npm run build    # Production build → dist/
npm run preview  # Preview production build locally
```

Deploy `dist/` to GitHub Pages. The repo should have GitHub Actions for auto-deploy on push to main.

## Testing priorities

1. Voice recording on iOS Safari and Android Chrome (the critical path)
2. Method selector works for single and multi-compound selection
3. Encryption round-trip: export → decrypt → valid JSON
4. Local vault: create, store, retrieve, list captures
5. Offline: full flow works with no network after initial page load
6. All tappable targets ≥ 44px on mobile

## When making changes

- One variable per change (autoresearch principle)
- Reference the specific PRD section or backlog item being addressed
- Estimate PF impact of any dimensional change
- Do not exceed the 4-minute structured input friction budget
- Do not remove existing dimensions — only add, reorder, or rephrase
- Test encryption round-trip after any schema change
- Verify brand compliance: dark mode, correct fonts, correct color usage

## Key documents

- `docs/CAPTURE-PRD.md` — Full product requirements (19 sections, 47 user stories, 23 edge cases)
- `docs/TECHNICAL-PLAN.md` — Build plan with sprint breakdown
- `docs/capture-backlog.md` — Feature backlog with PF scoring
- `docs/sensoria-autoresearch-program.md` — Autoresearch loop and eval protocol
- `docs/voice-notes-analysis.md` — Pending features from team discussion
- `docs/method-taxonomy.md` — Full 178-item method taxonomy
- `legacy/index.html` — The current working v0.3 tool (reference implementation)

## Integration stubs

### SDRF Client (`src/lib/sdrf-client.js`)
Patrick Deegan's Sovereign Data Research Fabric. Not available yet. The stub defines:
```javascript
export const SDRFClient = {
  connect(vaultId, credentials) {},     // Connect to remote vault
  syncArtifact(artifact) {},            // Push local artifact to remote vault
  listArtifacts(vaultId) {},            // List artifacts in remote vault
  getArtifact(vaultId, artifactId) {},  // Retrieve specific artifact
  revokeConsent(artifactId) {},         // Revoke sharing for an artifact
  extractFeatures(artifact, consentLevel) {} // Feature extraction at boundary
}
```
When Patrick has his API, implement these methods. The rest of the app calls them through `useVault.js` which falls back to IndexedDB when SDRF is unavailable.

### Diary Agent (`src/lib/diary-agent.js`)
LLM-guided phenomenological interview. Not integrated yet. The stub defines:
```javascript
export const DiaryAgent = {
  async startInterview(captureArtifact) {},  // Read capture, generate opening
  async respondToExplorer(message, history) {}, // Continue conversation
  async extractDimensions(transcript) {},    // Extract Tier 3-4 dimensions
  async validateWithExplorer(dimensions) {}  // Explorer reviews extractions
}
```
Requires Anthropic API key (not yet provisioned). When available, implement as a thin proxy through a Cloudflare Worker.

## Insight Dashboard (`src/components/InsightDashboard.jsx`)

This is a longitudinal view of the explorer's captures from their local vault. The explorer can:
- Select a time period (last week, last month, all time)
- Select context filters (method, social context, setting)
- Select axes of interest (arousal, valence, ego dissolution, connectedness, etc.)
- See where they've been — their phenomenological attractor in a given domain/context/time horizon

This reads from the local IndexedDB vault. It does not require SDRF. It's the explorer's personal view of their own state trajectory over time.
