# Sensoria Capture — Claude Code Handoff

## Quick Start

```bash
# 1. Create the project
mkdir sensoria-capture && cd sensoria-capture
npm create vite@latest . -- --template react
npm install

# 2. Copy the documents into the repo
mkdir docs legacy

# Copy these files into docs/:
#   CAPTURE-PRD.md
#   TECHNICAL-PLAN.md
#   capture-backlog.md
#   sensoria-autoresearch-program.md
#   voice-notes-analysis.md
#   method-taxonomy.md

# Copy the current working tool:
#   legacy/index.html  (the v0.3 HTML file)

# Copy CLAUDE.md to the project root:
#   CLAUDE.md

# Copy README.md to the project root:
#   README.md

# 3. Open in Claude Code
claude
```

## Complete Folder Structure

```
sensoria-capture/
├── CLAUDE.md                              ← Claude Code reads this automatically
├── README.md                              ← Deployment + decryption instructions
├── package.json                           ← Vite + React dependencies
├── vite.config.js                         ← Build config (static output for GitHub Pages)
├── index.html                             ← Vite entry point (minimal shell)
│
├── docs/                                  ← Product context (Claude Code reads these)
│   ├── CAPTURE-PRD.md                     ← Full PRD (19 sections, 47 user stories)
│   ├── TECHNICAL-PLAN.md                  ← Build plan + sprint breakdown
│   ├── capture-backlog.md                 ← Feature backlog with PF scoring
│   ├── sensoria-autoresearch-program.md   ← Autoresearch loop spec
│   ├── voice-notes-analysis.md            ← Pending features from team discussion
│   └── method-taxonomy.md                 ← Full 178-item taxonomy reference
│
├── legacy/                                ← Current working tool (reference)
│   └── index.html                         ← v0.3 monolith — the source of truth for
│                                             what currently works. Claude Code should
│                                             extract components FROM this file.
│
├── public/                                ← Static assets
│   └── (empty — Vite handles index.html)
│
└── src/                                   ← Application source
    ├── app.jsx                            ← Main app shell, step routing
    ├── config.js                          ← Version, Signal contact, feature flags
    ├── main.jsx                           ← Vite entry (renders <App/>)
    │
    ├── components/                        ← One component per step/feature
    │   ├── VaultScreen.jsx                ← Create vault OR returning explorer login
    │   ├── VoiceCapture.jsx               ← Recording orb, multi-voice, prompts
    │   ├── MethodSelector.jsx             ← Multi-select + per-compound dosing
    │   ├── ContextForm.jsx                ← Setting, social, intention
    │   ├── ExplorerProfile.jsx            ← PPIA multi-select, familiarity
    │   ├── DimensionSliders.jsx           ← Arousal, valence, ego dissolution
    │   ├── TimePerception.jsx             ← 7-point categorical grid
    │   ├── BodyMap.jsx                    ← SVG body, 3-level intensity
    │   ├── PhysicalFactors.jsx            ← Chip multi-select + notes
    │   ├── Connectedness.jsx              ← Self/others/world sliders
    │   ├── ReviewExport.jsx               ← Summary, encrypt, download
    │   ├── SignalHandoff.jsx              ← Signal contact + instructions
    │   ├── InsightDashboard.jsx           ← Longitudinal view from local vault
    │   └── ui/                            ← Shared UI primitives
    │       ├── Slider.jsx
    │       ├── Chip.jsx
    │       ├── Card.jsx
    │       ├── ProgressBar.jsx
    │       └── ShieldRow.jsx
    │
    ├── lib/                               ← Core logic (no UI)
    │   ├── crypto.js                      ← AES-256-GCM encrypt/decrypt
    │   ├── audio.js                       ← MediaRecorder wrapper
    │   ├── export.js                      ← Artifact assembly + file download
    │   ├── schema.js                      ← JSON schema + validation
    │   ├── vault.js                       ← IndexedDB local vault
    │   ├── identity.js                    ← Hash derivation from handle+passphrase
    │   ├── sdrf-client.js                 ← STUB — future SDRF vault API
    │   └── diary-agent.js                 ← STUB — future LLM interview
    │
    ├── data/                              ← Constants (extracted from legacy HTML)
    │   ├── methods.js                     ← 178 items, 19 categories
    │   ├── ppia-types.js                  ← 9 PPIA codes
    │   ├── body-regions.js                ← 10 body map regions with SVG coords
    │   ├── physical-factors.js            ← 21 factor strings
    │   ├── time-options.js                ← 7-point temporal scale
    │   └── social-contexts.js             ← 6 social context options
    │
    ├── hooks/                             ← React hooks
    │   ├── useRecording.js                ← Audio recording state machine
    │   ├── useVault.js                    ← IndexedDB CRUD + SDRF fallback
    │   └── useEncryption.js               ← Web Crypto wrapper
    │
    └── styles/
        └── tokens.css                     ← Sensoria brand design tokens (CSS vars)
```

## Files You Upload to the Repo

From this chat session, you have these files in your downloads:

| File | Destination in repo |
|------|-------------------|
| `CLAUDE.md` | `./CLAUDE.md` (project root) |
| `README.md` | `./README.md` (project root) |
| `CAPTURE-PRD.md` | `./docs/CAPTURE-PRD.md` |
| `TECHNICAL-PLAN.md` | `./docs/TECHNICAL-PLAN.md` |
| `capture-backlog.md` | `./docs/capture-backlog.md` |
| `sensoria-autoresearch-program.md` | `./docs/sensoria-autoresearch-program.md` |
| `voice-notes-analysis.md` | `./docs/voice-notes-analysis.md` |
| `method-taxonomy.md` | `./docs/method-taxonomy.md` |
| `index.html` (the v0.3 tool) | `./legacy/index.html` |
| `capture-integration-handoff.md` | `./docs/capture-integration-handoff.md` |

## What to Tell Claude Code

After setting up the folder and opening Claude Code, your first prompt should be:

```
Read CLAUDE.md and docs/CAPTURE-PRD.md. Then read legacy/index.html — this is
the current working tool. Your job is to migrate it into the Vite + React
component architecture defined in CLAUDE.md.

Start with Sprint 1 from docs/TECHNICAL-PLAN.md:
1. Extract CSS into src/styles/tokens.css using the Sensoria brand tokens
2. Extract all constants into src/data/ modules
3. Extract crypto functions into src/lib/crypto.js
4. Extract audio recording into src/lib/audio.js + src/hooks/useRecording.js
5. Break the App component into per-step components in src/components/
6. Create shared UI primitives in src/components/ui/
7. Create src/lib/vault.js with IndexedDB-based local vault
8. Create src/lib/identity.js for hash derivation
9. Add timing metadata to the export payload
10. Verify the build deploys to GitHub Pages identically

The legacy/index.html is the reference implementation. The new app must be
functionally identical but with proper component architecture, brand-compliant
styling, local vault persistence, and multi-voice recording support.
```

## Follow-up Prompts

After Sprint 1 is complete:

```
Now implement the InsightDashboard component (src/components/InsightDashboard.jsx).
This reads from the local IndexedDB vault and provides:
- Time period selector (last week, month, all time)
- Context filters (method, social context, setting)
- Selectable axes (arousal, valence, ego dissolution, connectedness, etc.)
- Visualization of the explorer's phenomenological trajectory over time
Reference: CLAUDE.md "Insight Dashboard" section and PRD §17 for the
longitudinal tracking vision.
```

For the multi-voice recording:

```
Refactor VoiceCapture to support multiple recordings per session.
The explorer should be able to:
- Record, stop, record again (multiple voice notes)
- See a list of their recordings with timestamps and durations
- Delete individual recordings
- Each recording appears in the artifact as an array element
Reference: PRD §13.3 (multi-recording) and §14 (prompted recording mode).
Add gentle visual prompts that fade onto screen during recording.
```

## GitHub Pages Deployment

Add to `vite.config.js`:

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/',  // adjust if deploying to a subpath
})
```

Add `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
permissions:
  contents: read
  pages: write
  id-token: write
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
      - uses: actions/deploy-pages@v4
```

Then in repo Settings → Pages → Source: GitHub Actions.

## What Claude Code Produces

After following these instructions, Claude Code will produce a working Vite + React app that:

1. Looks and behaves identically to the current v0.3 tool
2. Uses proper Sensoria brand tokens (Plus Jakarta Sans, IBM Plex Mono, phthalo dark mode)
3. Has clean component architecture (one file per step)
4. Supports multiple voice recordings per session with prompted mode
5. Has a local encrypted vault (IndexedDB) for persistent capture history
6. Has a returning explorer login flow (handle + passphrase → vault access)
7. Has an insight dashboard showing longitudinal state trajectory
8. Exports backward-compatible .sensoria.enc artifacts (v0.4 schema)
9. Has clean stubs for SDRF and Diary integration
10. Deploys to GitHub Pages via GitHub Actions
