# Sensoria Capture — Product Requirements Document

**Version:** 0.3
**Date:** March 2026
**Authors:** Knux (Nick Synodis), Sensoria Research
**Handoff to:** Patrick Deegan (SDRF integration), Gantasmo (NeuroPhenSuite)

---

## 1. Vision

Sensoria Capture is the simplest possible tool for turning a lived experience into a structured, encrypted, sovereign data artifact — a modular piece of your own phenomenology that you own, can track over time, and can choose to contribute to the collective map of human consciousness.

The output of every capture session is a **Phenomenological Artifact** — a self-contained, encrypted record that belongs to the explorer. It's useful to them on its own (self-knowledge, longitudinal tracking, integration support). It's useful to Sensoria when voluntarily shared (NPSS mapping, research, instrument validation).

**This is not a survey. It's a personal cartography tool that also feeds science.**

---

## 2. Product Philosophy

### 2.1 Core principles

- **Sovereignty first.** Data is encrypted on-device. Nothing leaves without an intentional act. The explorer can burn everything at any time.
- **Voice-first.** The richest data comes from people talking freely. Structured inputs exist to anchor the voice narrative to quantified dimensions, not to replace it.
- **Friction is the enemy of fidelity.** Every additional input must justify its existence against completion rate. The tool should be usable 30 minutes after a peak experience, by someone who's still integrating.
- **The explorer gets value back.** Each capture is a personal record — a snapshot of where they were. Over time, a collection of captures becomes a longitudinal map of their own consciousness.
- **Stacking is normal.** Most deep experiences involve multiple methods, compounds, or practices layered together. The tool must treat this as the default, not an edge case.

### 2.2 Product positioning

```
Capture         = field tool. What happened, how it felt.
                  Structured inputs ≤ 4 min. Voice unlimited.
                  Static HTML. Ships now.

Diary /          = depth tool. LLM-guided microphenomenological interview.
Euqualia          Adaptive, responsive, goes as deep as the explorer can.
                  Produces Tier 3-4 data. Requires LLM API + SDRF.
                  Consumer framing: "Strava for your inner life."
                  B2B framing: "Integration companion for retreats."
                  Research framing: "NeuroPhenSuite."
                  See §17 for full product definition.

SDRF            = sovereignty layer. Persistent vault, longitudinal tracking,
                  selective sharing, feature extraction, data marketplace.
```

Capture is the entry point and training data generator. It works standalone today. When SDRF exists, Capture writes into the explorer's sovereign vault. When Diary exists, Capture provides the initial data that Diary deepens. The quality of the Diary product is directly proportional to the volume and diversity of the Capture corpus.

### 2.3 Key metric

**Phenomenological Fidelity (PF):** the percentage of experientially meaningful signal that survives compression from lived experience into structured data.

```
PF = 1 - [ Σ(loss_i × salience_i) / Σ(salience_i) ]
```

Current PF: ~48% (v0.3). Target for Capture v1.0: 55%. Theoretical ceiling for Capture (without LLM): ~58%. See `sensoria-autoresearch-program.md` for the full measurement protocol.

---

## 3. The Phenomenological Artifact

### 3.1 What is it?

A `.sensoria.enc` file. AES-256-GCM encrypted. Contains a JSON object with structured phenomenological data plus metadata. Optionally accompanied by an encrypted voice file.

The artifact is:
- **Self-contained.** Everything needed to understand the experience is in one file.
- **Encrypted.** Unreadable without the explorer's passphrase.
- **Pseudonymous.** Identified by a chosen handle, not a real identity.
- **Versioned.** Schema version tracks which tool version produced it.
- **Composable.** Multiple artifacts from the same explorer can be analyzed together for longitudinal patterns.

### 3.2 Data schema (v0.3)

```json
{
  "_schema": "sensoria-capture-v0.3",
  "_encryption": "AES-256-GCM PBKDF2-310k",
  "_instrument_refs": [
    "EDI-8 (Nour et al. 2017)",
    "Watts Connectedness Scale (Watts et al. 2022)",
    "VAS arousal/valence — Tier 1 primitives",
    "Temporal perception — adapted 5D-ASC (Dittrich 1998)",
    "Somatic body map — Tier 1 interoceptive/proprioceptive"
  ],
  "captured_at": "ISO-8601 timestamp",
  "explorer": "pseudonymous handle",

  "context": {
    "methods": [
      {
        "name": "Ketamine — racemic",
        "dose": "100mg IM",
        "is_primary": true
      },
      {
        "name": "Cannabis (smoked/vaped)",
        "dose": "2 hits",
        "is_primary": false
      }
    ],
    "setting": "apartment, alone, evening",
    "social_context": "Solo",
    "experience_date": "2026-03-25",
    "intention": "exploration, body awareness",
    "explorer_typology": "SCI",
    "experience_frequency": "experienced"
  },

  "voice": {
    "has_recording": true,
    "duration_seconds": 342,
    "audio": "voice.enc | discarded"
  },

  "tier1": {
    "arousal": 78,
    "valence": 62,
    "temporal": {
      "value": 3,
      "label": "Timeless"
    },
    "somatic": {
      "regions": [
        { "region": "Heart / Chest", "intensity": 3, "intensity_label": "intense" },
        { "region": "Gut", "intensity": 2, "intensity_label": "strong" },
        { "region": "Head", "intensity": 1, "intensity_label": "mild" }
      ],
      "notes": "Swirling sensation in chest, pulsing in gut, warmth radiating outward"
    }
  },

  "physical_state": {
    "factors": ["Respiratory difficulty", "Congestion / sinus"],
    "notes": "Coughing from smoke triggered hyperawareness of respiratory system"
  },

  "tier2": {
    "ego_dissolution": 35,
    "connectedness": {
      "self": 88,
      "others": 42,
      "world": 65
    }
  }
}
```

### 3.3 Schema evolution rules

- New fields may be added at any level. Consumers must tolerate unknown keys.
- Existing fields must not be renamed or removed without a major version bump.
- The `_schema` field indicates which version produced the artifact.
- Backward compatibility: any consumer that reads v0.2 must also read v0.3.

### 3.4 Longitudinal tracking (SDRF integration point)

When SDRF exists, the explorer's vault stores a collection of artifacts. Each artifact is one snapshot. The collection enables:

- **State trajectory mapping.** How does this explorer's phenomenological profile change over time?
- **Method comparison.** How do different compounds/practices produce different state profiles for this person?
- **Competency tracking.** Does phenomenological resolution (the ability to describe experience with precision) improve with practice?
- **Personal baselines.** What's this explorer's typical arousal, valence, connectedness pattern? What deviates?

**Patrick's integration point:** The artifact schema above is the write format. SDRF needs to define the read/query layer — how an explorer retrieves their own artifacts, how researchers query across consented artifacts, and how longitudinal analysis runs without decrypting at the collection level (homomorphic or aggregation-level access).

---

## 4. Current Architecture (v0.3)

### 4.1 Technical stack

```
Runtime:        Browser (client-side only, no server)
Framework:      React 18 via CDN (Babel transpilation, no build step)
Encryption:     Web Crypto API — AES-256-GCM, PBKDF2 310k iterations
Voice capture:  MediaRecorder API → WebM blobs
Hosting:        GitHub Pages (static HTML)
Data pipeline:  Manual Signal handoff (encrypted file + passphrase)
```

### 4.2 File inventory

```
index.html                        The tool. Single self-contained file.
README.md                         Setup and deployment instructions.
capture-backlog.md                Feature backlog with PF scoring.
sensoria-autoresearch-program.md  Autoresearch loop specification.
capture-integration-handoff.md    Ops handoff for website integration.
```

### 4.3 Deployment

GitHub Pages. The live URL is configured via the repo's Pages settings. A CNAME record at `capture.sensoriaresearch.org` points to the GitHub Pages URL. See `capture-integration-handoff.md` for setup.

### 4.4 Data flow

```
Explorer's phone
  ├── Opens capture URL
  ├── Creates vault (handle + passphrase)
  ├── Records voice narrative
  ├── Taps through structured dimensions
  ├── Exports → AES-256-GCM encrypted .sensoria.enc file saved to device
  ├── (Optional) Encrypted voice file saved to device
  └── Sends files to Sensoria via Signal

Sensoria Research
  ├── Receives encrypted files on Signal
  ├── Explorer shares passphrase (separate message or in person)
  ├── Decrypt using Web Crypto API (decryption function in README)
  └── JSON artifact available for analysis
```

---

## 5. Measurement Dimensions

### 5.1 Current dimensions (v0.3)

| ID | Dimension | Type | Instrument ref | Step |
|----|-----------|------|---------------|------|
| D01 | Methods (multi-select) | Grouped dropdown, per-compound dose | 179 items, 19 categories | Context |
| D02 | Primary method tag | Tap to designate | Prime/probe framework | Context |
| D03 | Setting | Free text | — | Context |
| D04 | Social context | Chip select (6 options) | — | Context |
| D05 | Experience date | Date picker | — | Context |
| D06 | Intention | Free text | — | Context |
| D07 | Explorer typology | Chip select (9 PPIA types) | PPIA-lite | Context |
| D08 | Experience frequency | Chip select (4 levels) | — | Context |
| D09 | Voice narrative | Audio recording | Freeform | Voice |
| D10 | Arousal / Intensity | VAS 0–100 slider | Tier 1 primitive | Peak |
| D11 | Valence / Emotional tone | VAS 0–100 slider | Tier 1 primitive | Peak |
| D12 | Ego dissolution | VAS 0–100 slider | EDI-8 proxy | Peak |
| D13 | Temporal perception | 7-point categorical tap | Adapted 5D-ASC | Peak |
| D14 | Somatic body map | 10 regions × 3 intensity | Tier 1 interoceptive | Body |
| D15 | Body sensation notes | Free text | — | Body |
| D16 | Physical factors | Chip multi-select (21 items) + notes | — | Body |
| D17 | Connectedness: self | VAS 0–100 slider | Watts proxy | Connection |
| D18 | Connectedness: others | VAS 0–100 slider | Watts proxy | Connection |
| D19 | Connectedness: world | VAS 0–100 slider | Watts proxy | Connection |

### 5.2 Method taxonomy

19 categories, 179 items:

Classical Psychedelics · Plant Medicines & Traditional · Empathogens & Entactogens · Dissociatives · Cannabis & Cannabinoids · Breathwork · Meditation & Contemplative · Movement & Embodiment · Sound & Frequency · Somatic & Bodywork · Sexual & Tantric · Fasting & Metabolic · Social & Relational · Sensory & Environmental · Extreme Environment & Ordeal · Pharmacological (Non-Psychedelic) · Dream & Liminal States · Endogenous & Spontaneous · Other

Full item list is in the source code.

### 5.3 Validated instrument references

| Instrument | Items | Use in Capture | Proxy type |
|-----------|-------|---------------|------------|
| EDI-8 (Nour et al. 2017) | 8 | Single VAS slider for ego dissolution | Single-item proxy |
| Watts Connectedness Scale (Watts et al. 2022) | 19 (3 subscales) | Three VAS sliders (self, others, world) | Single-item per subscale |
| 5D-ASC (Dittrich 1998) | 94 | 7-point temporal perception scale | Adapted single dimension |
| PPIA | 30 | 9-type chip selector | Single-item typology |

These are explicitly single-item proxies, not psychometric equivalents. Full instrument deployment is a Diary/SDRF milestone.

---

## 6. User Flow

```
VAULT          Create handle + passphrase
  │            (~30 seconds)
  ▼
VOICE          Record experience narrative
  │            (~1-10 minutes, or skip)
  ▼
CONTEXT        Methods + doses + setting + social + date + intention
  │            + explorer type + familiarity
  │            (~60-90 seconds)
  ▼
PEAK           Intensity, emotional tone, ego dissolution, time perception
  │            (~30 seconds)
  ▼
BODY           Body map with intensity + notes + physical factors
  │            (~30-45 seconds)
  ▼
CONNECTION     Self, others, world
  │            (~15 seconds)
  ▼
REVIEW         Summary → Encrypt & Save → Signal handoff instructions
               + Certification CTA → Burn option
               (~30 seconds)

TOTAL: 4-12 minutes with voice, 3-4 minutes without
```

---

## 7. Security & Privacy

### 7.1 Threat model

| Threat | Mitigation |
|--------|-----------|
| Server breach | No server exists. Zero attack surface. |
| Man-in-the-middle | AES-256-GCM encryption before export. Signal E2EE for transit. |
| Identity exposure | Pseudonymous handles only. No email, phone, OAuth, cookies, analytics. |
| Voice biometrics | Explicit opt-in toggle with warning. Default: audio discarded. |
| Metadata leakage | No third-party services. No form endpoints. No tracking. |
| Coerced disclosure | Burn capability destroys all local state instantly. |
| Retrospective linking | Each export uses random salt + IV. Same passphrase produces different ciphertext. |

### 7.2 What's not yet protected (SDRF roadmap)

- **Persistent storage.** Currently, each session is ephemeral. No cross-session vault.
- **Selective sharing.** Currently all-or-nothing. Future: share specific dimensions or time ranges.
- **Data revocation.** Once shared, the explorer can't recall data. Future: SDRF revocation mechanism.
- **Differential privacy.** Aggregate research queries should use DP. Not implemented.
- **Homomorphic access.** Research queries on encrypted data without decryption. Long-term.

---

## 8. User Stories & Storyboard

### 8.1 Primary personas

**Luna (COM-01: Experienced Explorer)**
28, festival community, has done 30+ psychedelic experiences, already journals informally. Wants to contribute to research without being "studied." Cares deeply about data sovereignty. Will do this at 2am in a tent.

**Ravi (SCI: Scientific Explorer)**
34, neuroscience background, methodical about set/setting/dose, keeps a spreadsheet. Wants structured data he can analyze himself. Will compare his captures across different compounds and protocols.

**Anya (COM-02: Curious Seeker)**
22, second psychedelic experience, doesn't have vocabulary for what happened. Needs the tool to feel safe and non-judgmental. Might not finish if it feels clinical or overwhelming.

**Marco (NEO: Facilitator)**
41, runs breathwork ceremonies, wants to capture participant experiences post-session. Will share the link with a group of 15 people and collect their reports. Needs the tool to work without any explanation.

### 8.2 User stories

```
VAULT & IDENTITY

US-01  As Luna, I want to create a pseudonymous identity in under
       30 seconds so I can start capturing without friction.

US-02  As Ravi, I want to understand exactly what encryption is applied
       so I can trust the tool with sensitive substance data.

US-03  As Anya, I want to feel safe before I start, knowing that
       nothing I share can be traced back to me.

US-04  As any explorer, I want to burn my vault and start completely
       fresh so there's no residue if I change my mind.

VOICE CAPTURE

US-05  As Luna, I want to record a voice note at 2am in a dark tent
       with one tap so I can capture the experience while it's fresh.

US-06  As Anya, I want to skip the voice step without feeling like
       I'm doing it wrong so I don't abandon the tool.

US-07  As Ravi, I want to decide whether to include my voice in the
       export, understanding the biometric tradeoff.

US-08  As Marco, I want to re-record if my first attempt was
       incoherent so the data is actually useful.

METHOD & CONTEXT

US-09  As Luna, I want to select multiple compounds and tag which
       was the primary so my ketamine+MDMA experience is properly
       categorized.

US-10  As Luna, I want to enter a dose for each compound separately
       so the data accurately reflects the stack.

US-11  As Ravi, I want to record the exact date so I can correlate
       with my own notes and biometric data later.

US-12  As Marco, I want participants to quickly identify their
       experience from 179 options without scrolling forever.

US-13  As Anya, I want to select "Breathwork" without needing to
       know which specific type it was.

US-14  As any explorer, I want to indicate who I was with because
       social context profoundly shapes the experience.

PHENOMENOLOGICAL DIMENSIONS

US-15  As Luna, I want the sliders to feel intuitive and anchored
       to how I actually talk about my experiences.

US-16  As Ravi, I want to know what validated instruments these
       dimensions reference so I can trust the research value.

US-17  As Anya, I want to tap body regions without needing to
       articulate what I felt in words.

US-18  As any explorer, I want the time perception options to
       cover the full range of temporal distortion, including
       "time was irrelevant" as distinct from "time was slow."

US-19  As Luna, I want to note physical factors like nausea or
       respiratory difficulty that shaped my experience.

EXPORT & SHARING

US-20  As any explorer, I want to export my encrypted data with
       one tap and understand exactly what's in the file.

US-21  As Luna, I want clear instructions for sending my file on
       Signal so I don't need to ask anyone how to do it.

US-22  As Ravi, I want to keep a copy of my artifact for personal
       analysis and longitudinal tracking.

US-23  As Marco, I want to share the capture link with 15 people
       and have them all submit independently without any setup.

US-24  As Anya, I want to understand that I'm not committing to
       anything by exporting — it just saves to my phone.

LONGITUDINAL (SDRF FUTURE)

US-25  As Ravi, I want to see my captures over time and compare
       state profiles across different methods and doses.

US-26  As Luna, I want to selectively share specific captures with
       Sensoria without giving access to my entire history.

US-27  As any explorer, I want to revoke access to a previously
       shared capture.

US-28  As Marco, I want to see aggregate patterns across the group
       I facilitated without seeing individual identities.

DATA SHARING & SOVEREIGNTY

US-29  As Luna, I want to share only extracted features (dimensional
       vectors, tags) with Sensoria's models — not my raw voice or
       narrative text.

US-30  As Ravi, I want to explicitly consent to having my data used
       in a specific research study, separate from general model
       training.

US-31  As any explorer, I want to understand exactly what "sharing"
       means in each context — what goes where, who sees what, and
       what I can take back.

US-32  As a deep practitioner, I want to be compensated for providing
       verified, high-quality phenomenological data to research
       initiatives.

US-33  As Ravi, I want my agent to automatically list matching captures
       on the data marketplace when they meet criteria I've set.

GROUND TRUTH & VERIFICATION

US-34  As a researcher, I want to filter reports by verification tier
       so I can weight my analysis by data confidence.

US-35  As Luna, I want to upload a photo of my reagent test result
       to increase the verification level of my capture.

US-36  As Marco, I want to attest that a participant was present at
       my ceremony, adding peer verification to their capture.

US-37  As a researcher, I want biometric corroboration (HRV timestamp
       correlation) to confirm that an altered state occurred at the
       reported time.

READABILITY & NARRATIVE (EROWID PARITY)

US-38  As any explorer, I want to read other people's experience
       reports (with their consent) to learn about states I haven't
       explored yet.

US-39  As Luna, I want my capture rendered as a readable narrative —
       voice transcript + structured data formatted into something
       I'd want to share with friends.

US-40  As Anya, I want to browse a library of anonymized, consented
       reports organized by method, typology, and state profile.

US-41  As a community member, I want the reports to feel human and
       compelling — not clinical data sheets.

VOICE CAPTURE EVOLUTION

US-42  As any explorer, I want gentle prompts on screen while I'm
       recording so I know what to talk about without being
       interrupted.

US-43  As Luna, I want to record multiple voice notes throughout
       an experience (not just one post-hoc recording).

US-44  As Ravi, I want the option to capture voice-to-text instead
       of audio, avoiding biometric storage while keeping the
       convenience of speaking.

US-45  As Marco, I want to record a voice note for a participant
       who can't hold their phone — capturing their words in
       their voice, through my device.

US-46  As any explorer, I want to add a follow-up voice note the
       next morning when I remember something important.

US-47  As Anya, I want to see prompting questions before I start
       recording so I have a sense of what to cover.
```

### 8.3 Edge case scenarios

```
EDGE CASES TO TEST

EC-01  MULTI-COMPOUND WITH NO PRIMARY
       Explorer selects 3 methods but doesn't tap any as primary.
       Expected: first selected auto-designates as primary.
       Status: implemented.

EC-02  VOICE RECORDING ON LOCKED PHONE
       Explorer's phone auto-locks during a long voice recording.
       Expected: recording continues in background (browser-dependent).
       Risk: some mobile browsers pause MediaRecorder on lock.
       Mitigation: note in UX to keep screen on during recording.

EC-03  VERY LONG VOICE RECORDING (30+ minutes)
       Explorer talks for extended period.
       Expected: recording works, but .webm file may be large (30MB+).
       Risk: encryption of large blob may take visible time.
       Mitigation: "Encrypting..." spinner already exists.

EC-04  NO VOICE, NO METHODS SELECTED
       Explorer skips voice and skips method selection.
       Expected: tool should still allow export with whatever
       dimensions they did fill in. Partial data is still data.
       Status: currently works — no fields are required.

EC-05  SAME HANDLE USED BY TWO PEOPLE
       Two explorers independently choose "Luna" as their handle.
       Expected: no collision — handle is just a label inside the
       encrypted file. No account system means no uniqueness constraint.
       Future: SDRF may need to handle this.

EC-06  PASSPHRASE FORGOTTEN
       Explorer exports, sends file, then forgets passphrase.
       Expected: data is permanently locked. This is by design.
       UX: the vault screen copy makes this explicit.

EC-07  FESTIVAL WITH NO CELL SERVICE
       Explorer is at a festival, captures experience, but has
       no signal to send on Signal immediately.
       Expected: file saves to device, can be sent later.
       Status: works — tool is fully offline after initial page load.

EC-08  SOMEONE ELSE CAPTURES FOR THE EXPLORER
       Marco captures for a participant who can't use their phone.
       Expected: Marco creates a vault with the participant's chosen
       handle/passphrase, records their voice narrative, fills in
       dimensions based on conversation, exports, and gives the
       participant their file + passphrase.
       Risk: proxy capture may reduce PF. Voice is still the
       participant's own.

EC-09  BROWSER CRASH MID-CAPTURE
       Explorer is on step 4 when browser crashes.
       Expected: all data lost (no persistence).
       Future: SDRF vault would auto-save state.
       Mitigation: low risk — total flow is 4-7 minutes.

EC-10  EXPORT ON iOS SAFARI
       Safari handles file downloads differently than Chrome.
       Expected: .sensoria.enc file saves to Files app or Downloads.
       Risk: some iOS versions may open the base64 as text instead
       of downloading. Test on current iOS.

EC-11  SCREEN READER / ACCESSIBILITY
       Explorer uses a screen reader.
       Expected: form inputs have labels, sliders are accessible.
       Risk: body map SVG may not be screen-reader friendly.
       Future: add aria-labels to body regions.

EC-12  MULTIPLE CAPTURES IN ONE SESSION
       Explorer wants to capture two different experiences.
       Expected: export first, burn vault, create new vault, capture
       second. Each produces a separate artifact.
       Future: SDRF allows multiple artifacts per vault session.

EC-13  METHOD NOT IN TAXONOMY
       Explorer's specific practice isn't listed.
       Expected: select "Other (describe below)" → text input appears.
       Status: implemented.

EC-14  EXTREMELY CHALLENGING EXPERIENCE
       Explorer is emotionally activated while capturing.
       Expected: voice-first approach lets them talk without
       cognitive burden of forms. Structured dimensions are
       optional — partial capture is fine.
       UX: copy is warm, non-clinical, non-judgmental throughout.

EC-15  NON-ENGLISH SPEAKER
       Explorer's primary language isn't English.
       Expected: voice captures in any language (voice is language-
       agnostic). Structured UI is English-only for now.
       Future: i18n of UI labels. Voice remains in native language.

EC-16  EXPLORER WANTS TO SHARE FEATURES BUT NOT RAW DATA
       Explorer is comfortable contributing dimensional vectors to
       research but doesn't want their voice or narrative shared.
       Expected: sharing consent flow distinguishes Level 1 (features)
       from Level 2 (full artifact). Feature extraction happens before
       any sharing occurs.
       Status: not yet implemented. Architecture defined in §10.

EC-17  RESEARCHER QUERIES DATA WITHOUT SEEING INDIVIDUALS
       Researcher wants "average ego dissolution for ketamine+cannabis
       experiences across 50 explorers."
       Expected: aggregate query returns statistical result. No
       individual artifacts are decrypted or exposed.
       Status: SDRF requirement. Defined in §10.

EC-18  VOICE RECORDING RUNS 45+ MINUTES
       Deep practitioner produces an extremely long narrative.
       Expected: recording works, but file size (~45MB) may cause
       issues with encryption time and Signal upload.
       Mitigation: warn at 20 minutes. Future: chunked encryption.

EC-19  EXPLORER RECORDS DURING THE EXPERIENCE (NOT AFTER)
       Explorer is mid-ceremony and records fragmentary real-time
       notes — single words, sounds, non-verbal vocalizations.
       Expected: tool captures whatever is spoken. The content will
       be less coherent than retrospective reports but may have
       higher ecological validity.
       Future: ambient capture mode (separate UX optimized for
       minimal cognitive load during experience).

EC-20  FACILITATOR CAPTURES FOR MULTIPLE PARTICIPANTS
       Marco runs a ceremony for 15 people and wants to capture
       reports for all of them in sequence.
       Expected: capture first → export → burn → repeat for next
       participant. Each gets their own vault, handle, passphrase.
       Friction: creating 15 vaults is slow. Future: "batch capture"
       mode where facilitator creates sessions for multiple explorers
       with generated handles.

EC-21  EXPLORER WANTS TO CONTEST THEIR OWN REPORT
       Ravi reviews his capture a week later and disagrees with the
       slider values he chose. His valence was actually much lower.
       Expected: can't modify an exported artifact (it's encrypted
       and immutable). Can create a new capture for the same experience
       with corrected values, linked by experience date.
       Future: SDRF version history per experience.

EC-22  DATA MARKETPLACE — EXPLORER SETS UNREASONABLE PRICE
       Explorer lists a basic unverified report at $500.
       Expected: marketplace surfaces verification tier and community
       pricing signals. Unverified reports at high prices simply
       don't sell. No price controls needed — market self-corrects.

EC-23  VOICE-TO-TEXT PRODUCES GARBAGE TRANSCRIPTION
       Explorer uses dictation in a noisy environment. Transcription
       is 40% wrong.
       Expected: explorer reviews text before it enters the artifact.
       Future: on-device Whisper produces better transcription than
       system dictation. Offer correction step before finalizing.
```

---

## 9. SDRF Integration Requirements (for Patrick)

### 9.1 What exists now

- Client-side AES-256-GCM encryption via Web Crypto API
- Pseudonymous identity (handle + passphrase)
- Ephemeral sessions (no persistence across visits)
- Manual file export + Signal handoff
- Schema version tracking in artifact

### 9.2 What SDRF adds

```
PERSISTENCE
  Current:  Each visit starts fresh. No memory.
  SDRF:     Explorer logs in with handle + passphrase.
            Vault persists. Previous captures are visible.
            New captures append to the collection.

SELECTIVE SHARING
  Current:  Share everything or nothing.
  SDRF:     Share specific captures, specific dimensions,
            or specific time ranges. Granular consent.

DATA SOVEREIGNTY
  Current:  File sits on explorer's device.
  SDRF:     File sits in explorer's sovereign vault (encrypted
            at rest). Explorer holds the only key.
            Sensoria can query aggregates without decrypting
            individual records (differential privacy / secure
            aggregation).

REVOCATION
  Current:  Once shared, data can't be recalled.
  SDRF:     Explorer can revoke access. Previously shared
            captures become inaccessible to researchers.

LONGITUDINAL VIEW
  Current:  No cross-session awareness.
  SDRF:     Explorer sees their own state trajectory over time.
            Method-by-method comparison. Baseline detection.
            Integration of biometric data alongside phenomenological
            artifacts.
```

### 9.3 Migration path

The current `.sensoria.enc` artifact format should be the foundation. SDRF should be able to ingest existing artifacts (shared via Signal) into an explorer's vault retroactively. The schema is already versioned and backward-compatible.

**Key decision for Patrick:** Where does the vault live? Options range from a simple encrypted cloud store (S3 + client-side encryption) to a full sovereign data fabric with homomorphic query capabilities. The artifact format doesn't change — only the storage and access layer.

### 9.4 Persistent identifier architecture

*Sourced from Leo Moore and Jeremy Coltharp, April 2026 dev chat.*

The Capture tool's "handle" is currently ephemeral — the explorer picks a name that exists only inside one encrypted file. For SDRF continuity, this must evolve into a **persistent pseudonymous identifier** that links an explorer's data across tools, sessions, and studies without exposing their real identity.

**Leo's proposal:** One hash identifier shared across all Sensoria tools. The explorer self-inputs it. When SDRF exists, the identifier interfaces so data gets copied to the explorer's vault. Sensoria retains only extracted features with associated consent.

**Jeremy's question:** "Every time someone signs up for a study, would they get another identifier?"

**Leo's answer:** No. One identifier, persistent. If the explorer has one, they input it. The tool recognizes it and links the new session to their existing vault. This gives longitudinal continuity with privacy — the researcher sees a consistent pseudonymous ID across sessions but can't link it to a real person.

**Implementation model (Leo):** Hash + device-specific task key. The hash is the explorer's portable identity. The device key is a session-scoped credential that binds to the device doing the capture. This allows:
- Explorer uses the same hash across phone, laptop, or a facilitator's device
- Each device session has its own key for local encryption
- The hash links sessions in the vault; the device key protects the local session
- Best practices TBD — escalate to Joel and Patrick for cryptographic architecture

**Design requirements derived from this conversation:**

```
REQ-ID-01  Explorer can self-input an existing identifier when creating a vault.
           If the identifier exists in SDRF, the session links to the existing vault.
           If it doesn't exist, a new vault is created.

REQ-ID-02  One identifier per explorer across all Sensoria tools.
           Capture, Diary, event check-in, certification — all reference the same hash.

REQ-ID-03  Identifier is explorer-generated, not system-assigned.
           The explorer chooses or is given their hash. They can memorize it,
           store it, or derive it from a passphrase.

REQ-ID-04  Study participation does not create a new identifier.
           Joining a study is a consent flag on the existing vault, not a new identity.
           The researcher sees the same pseudonymous ID across all of that
           explorer's consented sessions.

REQ-ID-05  Sensoria retains features of interest with associated consent —
           not raw data. Raw data stays in the explorer's vault.
           Feature extraction happens at the boundary between vault and research.

REQ-ID-06  The current Capture tool handle should be forward-compatible.
           When SDRF launches, an explorer who used "Luna" in 5 Capture sessions
           can retroactively link those artifacts to a persistent vault
           by re-entering the same handle + passphrase.
```

**Immediate action:** Share this section + §10 with Patrick and Joel. The identifier architecture is the foundational SDRF decision — everything else (persistence, sharing, revocation, longitudinal view) depends on it.

---

## 10. Data Sharing Architecture

### 10.1 The sharing spectrum

Sharing is not binary. The system must support granular, intentional sharing at multiple levels:

```
LEVEL 0: PRIVATE
  Data exists only in the explorer's vault.
  No one else sees anything.

LEVEL 1: FEATURES ONLY
  Extracted/processed features shared — not raw data.
  Example: "This explorer's report contains high ego dissolution,
  moderate arousal, ketamine+cannabis interaction, SCI typology."
  The raw voice, the narrative, the personal details stay private.
  Models can train on features without accessing source material.

LEVEL 2: ANONYMIZED RESEARCH CONTRIBUTION
  Full artifact shared with Sensoria Research under explicit consent
  for use in consciousness mapping studies. De-identified.
  The explorer understands: "My data helps build the NPSS."

LEVEL 3: IDENTIFIED RESEARCH PARTICIPATION
  Explorer opts into a specific study protocol. Their data is linked
  to a research participant ID (still pseudonymous, but trackable
  across sessions for longitudinal analysis). IRB-grade consent.

LEVEL 4: DATA MARKETPLACE
  Explorer or their agent offers specific data products —
  verified ground-truth phenomenological records, longitudinal
  state trajectories, rare-state documentation — to researchers,
  institutions, or AI systems in exchange for compensation
  (crypto, tokens, or fiat). The explorer sets the price and terms.
```

### 10.2 Features vs raw data

This distinction is critical and must be architecturally enforced:

**Raw data:** The encrypted artifact as captured. Voice recordings, free text, the full JSON payload. Contains potentially identifying information even when pseudonymous (voice biometrics, writing style, specific contextual details).

**Features / processed data:** Extracted dimensional vectors, taxonomic tags, statistical summaries. Not reversible to the original report. Examples:
- `{method: "ketamine+cannabis", arousal: 78, ego_dissolution: 35, temporal: "timeless"}`
- A PCA projection of the experience into NPSS coordinates
- Aggregate statistics: "Explorer X's mean ego dissolution across 12 sessions is 42"

**The sharing consent flow must distinguish these clearly:**
- "Share my features with Sensoria's models" (Level 1)
- "Share my full report for research" (Level 2)
- "Participate in a study" (Level 3)
- "List my data on the marketplace" (Level 4)

**Patrick's decision point:** Where does feature extraction happen? Options:
1. Client-side (LLM runs locally or in-browser — preserves sovereignty but limited model quality)
2. Server-side with ephemeral processing (raw data decrypted, features extracted, raw data discarded — requires trust in the processing environment)
3. Secure enclave / TEE (trusted execution environment — raw data never leaves encrypted boundary)

### 10.3 Leo's consent-at-the-boundary model

*Sourced from Leo Moore, April 2026 dev chat.*

Leo's framing: "Eventually the identifier should interface so it gets copied to their vault, and we just keep the features of interest with the associated consent."

This defines the data boundary crisply:

```
EXPLORER'S VAULT                    SENSORIA'S SIDE
(explorer owns, controls,           (Sensoria receives, uses
 can revoke at any time)             under explicit consent)
                                    
  Raw voice recordings                Extracted features only
  Full narrative text         ──►     Dimensional vectors
  Personal context                    Anonymized method/dose
  Unencrypted artifact                Consent metadata
                                      Verification signals
                              │
                    EXTRACTION BOUNDARY
                    (this is where sovereignty lives)
```

What crosses the boundary is determined by consent level (§10.1). What Sensoria *retains* is always features + consent metadata — never raw data. The raw data lives in the explorer's vault and can be pulled back at any time.

This is the architectural principle that makes the marketplace (§10.4) possible: researchers buy access to features, not vaults. The explorer's raw experience narrative never leaves their control.

### 10.4 The data marketplace vision

```
EXPLORER                          MARKETPLACE                        RESEARCHER
  │                                   │                                  │
  ├─ Lists verified artifact ──────►  │                                  │
  │   with price + terms              │  ◄── Searches for ground-truth   │
  │                                   │      data meeting criteria       ─┤
  │                                   │                                  │
  │  ◄── Receives payment ────────── │  ── Delivers features/data ────► │
  │      (crypto / token / fiat)      │      under agreed terms          │
  │                                   │                                  │
  ├─ Can revoke at any time ───────► │                                  │
  │                                   │                                  │
  └─ Agent can automate ───────────► │                                  │
     (set criteria, auto-list         │
      matching captures)              │

VERIFICATION LAYER:
  - Ground truth validation (see §11)
  - Reputation scoring (consistent, detailed, verified reports earn higher value)
  - Rarity premium (unusual states, rare compound profiles, longitudinal depth)
```

This is a future-state vision. For now, the architecture decision is: **design the artifact schema and consent model so that marketplace integration is possible without breaking changes.** The `.sensoria.enc` format already supports this — it's self-contained, versioned, and the explorer holds the only key.

---

## 11. Ground Truth & Verification

### 11.1 The problem

Without verification, Sensoria Capture is Erowid with sliders. Self-reported data on substance identity, dosage, and experience is the weakest link in the entire system. People misidentify compounds, estimate doses poorly, conflate experiences, and sometimes fabricate.

### 11.2 Verification tiers

```
TIER 0: UNVERIFIED (current state)
  Explorer self-reports everything. No validation.
  Data is tagged as "self-reported, unverified."
  Still valuable — Erowid has 117,000+ reports at this tier and
  they've been foundational for the field.

TIER 1: CONTEXT-VERIFIED
  Environmental signals corroborate the report:
  - Timestamp correlation (report filed within plausible window)
  - Biometric data (HRV/GSR confirms altered state occurred)
  - Event verification (explorer was checked in at a Sensoria event)
  - Peer attestation (facilitator confirms participant was present)
  
TIER 2: SUBSTANCE-VERIFIED
  The compound itself is verified:
  - Reagent test results (photo of test kit result uploaded)
  - Lab analysis (DanceSafe, Energy Control, or equivalent)
  - Pharmaceutical source (prescription ketamine with lot number)
  - Sensoria-supplied (compounds provided in controlled setting)

TIER 3: PROTOCOL-VERIFIED
  The full protocol is controlled:
  - IRB-approved study protocol
  - Standardized dosing
  - Controlled setting
  - Pre/post biomarkers
  - Observer corroboration
```

### 11.3 Verification in the current tool

For v0.3, we're at Tier 0. Practical steps toward Tier 1:

- **Experience date field** (already implemented) — enables timestamp plausibility checks
- **Social context field** (already implemented) — enables cross-referencing with event records
- **Future: photo upload for reagent tests** — low friction, high value for substance verification
- **Future: biometric integration** — HRV data from Apple Watch / Oura confirms a physiological event occurred at the reported time

### 11.4 Verification scoring in the artifact

Add to future schema:

```json
"verification": {
  "tier": 0,
  "signals": [],
  "substance_tested": false,
  "biometric_corroboration": false,
  "peer_attestation": false,
  "confidence_score": null
}
```

This field starts empty and accretes verification signals over time. A marketplace buyer can filter by verification tier. A researcher can weight analyses by confidence score.

---

## 12. Erowid Reference Analysis — What to Learn, What to Transcend

### 12.1 What Erowid does brilliantly

Erowid's stated design goal is to act as a categorized repository for long-term collection of people's experiences with psychoactive substances and techniques, and to make those experiences easily available to people searching for information.

**The magic of Erowid is narrative.** People read trip reports like stories. A well-written Erowid report conveys the texture, the arc, the surprise, the terror, the beauty of an experience in a way that no structured data can. As one of their editors put it: "A catalog of activities isn't really a report. Provide set and setting, but also tell the story."

**117,000+ reports** accumulated over 22 years. Reports are organized by substance, primary category, and secondary categories, with a system for reviewing and rating each report. The review system uses volunteer triagers who grade reports A+ through F on novelty, clarity, data value, and credibility.

**User stories that Erowid satisfies:**
- "I'm about to try X for the first time — what might happen?"
- "I had a weird experience — has anyone else felt this?"
- "I'm a researcher — what does the qualitative landscape look like for substance Y?"
- "I want to share what happened to me with people who'll understand."

### 12.2 Where Erowid falls short (and where Sensoria differentiates)

| Dimension | Erowid | Sensoria Capture |
|-----------|--------|-----------------|
| **Data structure** | Free text with minimal metadata (substance, dose, body weight, year). Reports are prose. | Structured dimensions + free voice. Every report produces quantified coordinates. |
| **Searchability** | Text search only. Can't query "show me all reports with ego dissolution > 80 and positive valence." | Every dimension is a filterable, sortable, correlatable field. |
| **Sovereignty** | Erowid owns the copyright. Authors can use their own reports but can't delete them. | Explorer owns the encrypted artifact. Can burn, revoke, or selectively share. |
| **Verification** | Volunteer triagers assess credibility subjectively. No substance testing, no biometric corroboration. | Verification tiers from self-reported to protocol-verified. |
| **Voice** | Text only. | Voice-first. Captures prosody, emotional texture, hesitation, emphasis. |
| **Longitudinal** | Each report is standalone. No cross-report analysis for individual authors. | Artifacts compose into longitudinal state trajectories per explorer. |
| **Compensation** | None. Authors contribute for free. | Future marketplace enables compensation for verified ground-truth data. |
| **Research utility** | Reports are copyrighted and explicitly prohibit analysis or AI training without permission. | Built for research from day one. Consent model enables ethical use. |
| **Friction** | Low (just write). But quality is highly variable. | Low (talk + tap). Quality is structurally enforced by dimensional anchoring. |
| **Readability** | High. Narrative prose is compelling and human. | Voice captures narrative richness. Structured data captures what prose misses. |

### 12.3 What to preserve from Erowid's model

**Narrative primacy.** The voice recording is Sensoria's version of the Erowid report body. It must remain the primary channel. The structured dimensions exist to anchor the narrative, not replace it. If someone produces a 10-minute voice note with rich phenomenological detail and skips every slider, that's still a valuable capture.

**Readability and shareability.** Erowid reports are read by hundreds of thousands of people. Sensoria captures should eventually be renderable as readable reports — the structured data + voice transcript formatted into a compelling narrative artifact that the explorer can share, print, or publish. This is the "personal phenomenological record" that people keep for themselves.

**Low barrier to entry.** Erowid's submission form is dead simple. Sensoria must never exceed that friction threshold for the voice path.

### 12.4 What to transcend

**From copyright to sovereignty.** Erowid owns the data. Sensoria can't.

**From text to multimodal.** Voice captures what text can't. Future: drawing, color, sound matching.

**From narrative-only to narrative + structure.** The quantified dimensions enable computational analysis that Erowid's prose archive can't support.

**From subjective credibility to verifiable ground truth.** Erowid relies on volunteer judgment. Sensoria builds a verification pipeline.

**From static archive to living map.** Erowid is a library. Sensoria is a cartography project. The data feeds the NPSS.

---

## 13. Voice Capture Architecture Decisions

### 13.1 Current model

Single voice recording per capture. Audio stored as WebM blob in browser memory. Optionally encrypted and exported alongside the structured data.

### 13.2 Open decision: multi-recording vs single recording

**Leo's input:** "Maybe we just prompt people with a basic set of questions, and they can do a long form voice recording."

**The tension:** The current single-recording model assumes the explorer knows what to say. Experienced psychonauts (Luna, Ravi) will produce rich, structured narratives. First-timers (Anya) may freeze, ramble, or produce low-fidelity data because they lack the vocabulary and framework.

**Proposed: prompted recording mode**

After the explorer taps record, optionally display a sequence of gentle prompts that appear on screen while they're talking. Not a questionnaire — just visual anchors:

```
[Recording in progress — 0:00]

  What happened?

[After 60 seconds, fade to:]

  What surprised you?

[After 60 seconds:]

  How did your body feel?

[After 60 seconds:]

  What's still with you right now?
```

The prompts are passive. They don't require a response. They're there if the explorer needs a nudge, invisible if they don't. The recording is continuous — one file, not segmented.

### 13.3 Open decision: multiple recordings throughout

**The use case:** Explorer captures an initial voice note at 2am. Next morning, they want to add more — things they remembered, integration reflections, a correction. Or: during a multi-day retreat, they want to capture daily voice notes that all belong to the same "experience."

**Options:**

A. **Multiple recordings per capture session** (Whispr Flow model): The capture tool allows adding additional voice notes at any point. Each is a separate audio file. The artifact contains an array of voice recordings with timestamps.

B. **Multiple capture sessions linked to one experience**: Each capture produces a separate artifact, but they can be linked by a shared experience ID. The explorer creates a new capture for each voice note but tags it to the same experience.

C. **Append-only voice journal**: The tool has a persistent "voice journal" mode where the explorer can record, stop, record again, stop, throughout a day or experience. All recordings are bundled into one artifact.

**Recommendation:** Start with A for v0.4. It's the simplest extension of the current model — the recording step allows multiple voice notes with timestamps, but the rest of the flow (context, dimensions, etc.) is filled in once. The artifact schema already supports an array of voice recordings.

### 13.4 Open decision: voice recording vs voice-to-text

| | Recording | Voice-to-text (clipboard) |
|---|-----------|--------------------------|
| **Richness** | High — prosody, emotion, hesitation, volume encode information | Low — text only, tone and rhythm are lost |
| **Privacy** | Voice is biometrically identifying | Text is not biometrically identifying |
| **Storage** | Large files (1MB/min WebM) | Small (text is negligible) |
| **Downstream analysis** | Requires Whisper transcription + optional prosodic analysis | Immediately processable by LLM |
| **Third-party dependency** | None — MediaRecorder API is browser-native | Whispr Flow or similar requires trusting their security practices |
| **Offline capability** | Full — browser-native | Depends on the tool (some do local transcription) |

**Recommendation:** Keep recording as the primary path. Add voice-to-text as an optional alternative for explorers who prefer it or who have privacy concerns about voice biometrics. Frame as a decision:

```
How do you want to capture your voice?

  [Record audio]        Richer data — captures tone and emotion
  [Type / dictate]      Text only — no voice biometrics stored
```

**Roadmap item:** When Sensoria has its own local Whisper deployment, offer a third option: "Record → transcribe on-device → discard audio." This gives the richness of voice capture with the privacy of text-only. The transcription happens locally, the audio is never stored, and the text enters the artifact.

This is a **v0.5+ decision**. For now, document it as an architectural fork point and let Patrick weigh in on the SDRF implications (storing audio blobs vs text in the sovereign vault has different infrastructure costs).

---

## 14. Prompting Questions for Voice Capture

Derived from structured experience report analysis. These prompts maximize phenomenological richness while remaining accessible to first-timers:

### 14.1 Core prompts (display during recording)

These appear on screen as gentle visual anchors. The explorer talks continuously; prompts fade in and out.

```
1. "What happened?"
   [appears at 0:00]

2. "What surprised you?"
   [fades in at ~1:00]

3. "How did your body feel?"
   [fades in at ~2:00]

4. "Was there a moment where something shifted?"
   [fades in at ~3:00]

5. "What's still with you right now?"
   [fades in at ~4:00]
```

### 14.2 Extended prompts (for guided mode / Diary precursor)

If the explorer opts into guided prompts or if the tool detects a very short recording (<60s), offer these as follow-up questions they can respond to in additional recordings:

```
"Walk me through the arc — when did it start, where did it peak,
 how did it come down?"

"Were there moments that were difficult? What did you do with them?"

"Did you see anything — visuals, patterns, colors, imagery?"

"How did your sense of self change, if at all?"

"If you could describe the peak in one image or metaphor, what would it be?"

"Is there anything about the experience you're still trying to understand?"
```

### 14.3 Implementation notes

- Prompts are optional — the explorer can dismiss them or turn them off
- Prompts should be subtle (low opacity, small text) so they don't dominate the screen during an emotionally charged recording
- The prompt timing should adapt — if the explorer is clearly still talking about the first topic at 60 seconds, don't interrupt with the next prompt
- Prompts are not questions to be answered — they're orientation cues. The copy should feel like a friend gently redirecting, not an interviewer demanding responses

---

## 15. Open Decision: Psychedelic-Forward vs Phenomenology-Forward Positioning

### The tension

The tool currently presents 19 method categories spanning psychedelics, breathwork, meditation, movement, bodywork, fasting, and spontaneous states. The taxonomy is broad. The copy is substance-neutral — "What did you take or do?" not "What did you trip on?" The brand language is about consciousness mapping, not drug use.

But the community that will use this tool first — the Portugal crew, the Envision network, the Sensoria inner circle — is primarily psychedelic. The method taxonomy is 40% psychoactive compounds by item count. The data that makes Sensoria's NPSS unique will overwhelmingly come from psychedelic experiences, at least initially.

### The question

**Do we lean into the psychedelic identity, or stay coy about it?**

| | Psychedelic-forward | Phenomenology-forward |
|---|---|---|
| **Copy tone** | "Your trip report, encrypted." | "Map your experience. Own your data." |
| **Taxonomy emphasis** | Compounds front and center, practices secondary | All methods equal, compounds are one category among many |
| **Audience signal** | Immediately recognizable to psychedelic community. "This is for us." | Broader tent. Meditators, athletes, breathworkers all feel included. |
| **Institutional risk** | Harder to partner with universities, clinics, funders who are substance-cautious | Easier to position for grants, clinical partnerships, mainstream adoption |
| **Community authenticity** | The Sensoria community knows what this is. Being coy feels dishonest. | The research mission genuinely spans all altered states. Being narrow feels reductive. |
| **Legal exposure** | In some jurisdictions, a tool explicitly designed for drug experience logging could attract scrutiny | A phenomenological research tool that happens to include substance categories is defensible |
| **SEO / discoverability** | "Psychedelic trip report app" has clear search intent | "Consciousness mapping tool" is harder to discover but broader |

### Recommendation

**Both, architecturally.** The tool itself stays phenomenology-forward — the copy, the taxonomy, the research framing are all about consciousness, not substances. But the deployment context and community messaging can be psychedelic-forward. When you share this link in a Signal group of psychonauts, the message says "capture your trip." When it's on the Sensoria Research website, the framing is "map your experience."

This is not being coy — it's being accurate. The tool genuinely serves all altered states. The community primarily uses psychedelics. Both things are true.

**The decision to document:** Where on this spectrum should the *default* landing copy sit? Currently it's phenomenology-forward. If the community feedback says "I didn't realize this was for trip reports until I saw the substance list," we should warm the copy toward explicit psychedelic acknowledgment without making it exclusionary.

**Action item:** After 10 community captures, ask each explorer: "When you first opened this, did you immediately understand what it was for?" If >30% say no, the copy needs to be more explicit.

---

## 16. Friction Budget: Why 7 Minutes, and Is It a Ceiling or a Guideline?

### Origin of the number

The 7-minute ceiling came from a practical constraint: **what can someone do on their phone at 2am while still integrating?** It's a heuristic for the maximum cognitive load a post-experience explorer will tolerate before abandoning the tool. It was set before any empirical measurement.

### What it actually should be

The friction budget shouldn't be a fixed number. It should be a function:

```
max_time = f(voice_duration, explorer_state, completion_rate_target)
```

**Voice-dominant captures** (Luna talks for 8 minutes, taps a few sliders in 90 seconds) have a total time of ~10 minutes but a *cognitive effort* time of only 90 seconds. The voice portion is low-effort — talking is natural. The structured portion is where friction lives.

**Structured-only captures** (Ravi skips voice, fills in every field carefully) might take 5 minutes but feel more effortful per minute.

**The real constraint:** Not total time but **cognitive effort during the structured portion.** Voice is free. Taps and sliders cost attention.

### Revised framing

```
HARD CEILING:  Structured inputs (everything except voice) ≤ 4 minutes
SOFT CEILING:  Total time including voice ≤ 12 minutes
NO CEILING:    Voice recording duration (let people talk as long as they want)
```

The 7-minute number was roughly right but for the wrong reason. The actual budget is:
- Structured effort: 4 minutes max. This is the number that completion rate is sensitive to.
- Voice: unlimited. This is where PF comes from.
- Total: whatever voice + 4 minutes structured adds up to.

### How to measure empirically

Add a timestamp to the artifact:
- `vault_created_at`: when the explorer clicked "Begin"
- `voice_started_at` / `voice_ended_at`: recording timestamps
- `export_at`: when they tapped "Encrypt & save"

`structured_time = (export_at - vault_created_at) - voice_duration`

If `structured_time` median exceeds 4 minutes across 10+ reports, the tool has too much structured friction. If `completion_rate` drops below 70%, the same conclusion holds regardless of time.

### Patrick's note

This changes the schema slightly — adding timing metadata to the artifact. Low-effort implementation: capture `Date.now()` at vault creation and at export, include both in the payload. Voice duration is already captured.

---

## 17. The Diary Product — LLM-Guided Phenomenological Interview

### 17.1 What Diary is

Diary is the depth product. Where Capture compresses an experience into structured dimensions + voice in under 12 minutes, Diary *expands* it through responsive, adaptive, LLM-guided microphenomenological interview. It surfaces dimensions that Capture can't reach — not because Capture is poorly designed, but because the dimensions don't exist until a skilled interviewer pulls on the right threads.

**Evidence from initial testing:** An unprompted experience report (the Capture equivalent) contained rich phenomenological data — compound interaction, temporal dilation, interoceptive awareness. But novel dimensions — interoceptive resolution as a measurable capacity, simultaneous wide-field + point-focus awareness structure, spatial-comparative measurement modality, equilibrium-seeking dynamics across multiple systems — did not surface until targeted follow-up questions probed specific threads in the initial narrative.

That follow-up exchange is what Diary does. An LLM reads the initial capture, identifies the phenomenological threads worth pulling, and follows them with adaptive probing that goes as deep as the explorer can go. The output is Tier 3-4 data — the kind that maps previously uncharted regions of the NPSS.

### 17.2 Capture → Diary relationship

```
CAPTURE                              DIARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Field tool                           Depth tool
Under 12 min                         20-60 min
Voice + structured taps              LLM-guided conversation
Produces Tier 1-2 coordinates        Produces Tier 3-4 coordinates
Explorer-driven (they talk, they     Agent-driven (agent listens, asks,
tap, they're done)                   probes, validates, goes deeper)
Static measurement surface           Adaptive measurement surface
(same dimensions for everyone)       (dimensions emerge from the conversation)
Works offline, no backend            Requires LLM API + SDRF vault
PF ceiling: ~58%                     PF ceiling: ~85%
Ships now as static HTML             Ships later as app with backend

THE HANDOFF:
  1. Explorer completes Capture (voice + structured data)
  2. Capture artifact is stored in SDRF vault
  3. Explorer opens Diary (same session or later)
  4. Diary agent reads the Capture artifact
  5. Agent says: "I've listened to your recording and looked at
     your dimensions. I want to ask you about a few things..."
  6. Guided interview follows the threads worth pulling
  7. Diary produces an enriched artifact — the Capture data
     plus the additional Tier 3-4 dimensions that emerged
```

### 17.3 Diary as Euqualia

In the product family architecture, Diary is the consumer-facing manifestation of the Euqualia platform thesis:

**Consumer framing ("Diary"):** Voice-first consciousness mapping. "Strava for your inner life." You capture your experience, then an AI trained in microphenomenological technique helps you understand what happened — not by interpreting for you, but by asking the right questions so you can see the structure yourself.

**B2B framing ("Euqualia for Retreats"):** Integration companion that participants take home. The retreat center pays $50/participant/year. The participant gets a longitudinal tool that continues the integration work. The retreat center gets outcome data proving their modality works.

**Research framing ("NeuroPhenSuite"):** Phenomenological data collection engine that produces research-grade data from community participants. Adaptive interviewing technique based on Varela's microphenomenology. Paired with biosignal data through SDRF for neurophenomenological convergence.

**Investor framing ("Euqualia"):** Self-sovereign qualia intelligence platform. Proprietary training data from phenomenological case series + IACS neurophenomenological corpus. Consumer app + retreat SaaS + research marketplace.

### 17.4 The training data loop

Capture feeds Diary. Every Capture artifact with a voice recording + structured dimensional self-ratings is a labeled training example for the Diary's extraction model:

```
INPUT:  voice transcript (what the explorer said)
LABELS: dimensional ratings (what the explorer scored themselves)
TASK:   learn to extract dimensional ratings from voice narratives

After N captures, the Diary agent can:
  1. Listen to a voice recording
  2. Predict the structured dimensions
  3. Present them back to the explorer for validation
  4. Use discrepancies as probe points for deeper interview
     ("You scored your ego dissolution at 35, but your description
      of sensing all body systems simultaneously sounds like it might
      be higher — can you tell me more about your sense of self
      during that moment?")
```

This is why Capture exists before Diary. Capture is the training data generator. The more captures we collect, the better the Diary agent becomes at phenomenological feature extraction. The quality of the Diary product is directly proportional to the volume and diversity of the Capture corpus.

### 17.5 Diary in the roadmap

```
NOW:        Capture collects voice + structured data
            (training examples accumulate)

NEXT:       Build voice → dimension extraction model
            (using Capture corpus as training data)
            Test extraction accuracy against explorer self-ratings

THEN:       Diary v0.1 — LLM reads Capture artifact, asks follow-up
            questions based on identified gaps between predicted
            dimensions and the voice narrative's implied richness

LATER:      Diary v1.0 — Adaptive probing based on explorer typology,
            method category, and real-time assessment of which threads
            are producing novel phenomenological features

EVENTUAL:   Diary + biosignals — LLM has access to HRV/EEG timeline
            alongside the voice narrative. Can ask: "At the 22-minute
            mark, your heart rate variability spiked. What was
            happening for you at that point?"
```

### 17.6 What this means for Patrick

The SDRF vault architecture needs to support the Capture → Diary handoff:
- Diary reads from the explorer's vault (with their permission)
- Diary writes enriched artifacts back to the vault
- The enriched artifact references the original Capture artifact
- Version history tracks how the explorer's understanding of their experience deepened through the Diary process
- The original Capture data is never overwritten — only supplemented

---

## 18. Roadmap

```
v0.3 (current)     Static HTML, manual Signal handoff, PF ~48%
v0.4 (next)        + temporal arc, + multi-voice recordings, + prompted recording mode
                   + timing metadata for friction measurement
v0.5               + noetic/cognitive dimension, + challenging experience flag
                   + voice-to-text option, + reagent test photo upload
v1.0               + visual capture option, + integration state
                   + sharing consent tiers (Level 0-2)
                   PF target: 55%, declare Capture complete

Diary v0.1         LLM reads Capture artifact, asks follow-up questions
                   based on gaps between predicted dimensions and voice richness
SDRF v0.1          Persistent vault, longitudinal view, feature extraction
Diary v1.0         Adaptive probing based on typology + method + biosignals
                   Euqualia consumer app launch
SDRF v1.0          Selective sharing, revocation, aggregate queries, data marketplace
Platform v1.0      Biometric integration, NPSS coordinate computation,
                   ground truth verification pipeline
```

---

## 19. Reference Documents

| Document | Purpose |
|----------|---------|
| `index.html` | The capture tool (single file, deployable) |
| `README.md` | Deployment and decryption instructions |
| `capture-backlog.md` | Feature backlog with PF scoring and prioritization |
| `sensoria-autoresearch-program.md` | Autoresearch loop specification and eval protocol |
| `capture-integration-handoff.md` | Website integration instructions for ops |
| `CAPTURE-PRD.md` | This document |

---

## Appendix A: Active Contributors & Capabilities

*Updated April 2026. This section helps new contributors and LLMs understand who is working on what.*

### Core team

| Person | Role | Relevant to Capture/Diary |
|--------|------|--------------------------|
| **Knux (Nick Synodis)** | CEO, Chief Product Strategist | Architecture, brand, product vision, economic strategy, research direction. |
| **Leo Christov-Moore PhD** | Research Director | Measurement methodology, instrument validation, microphenomenology coding, Rosetta stone development. Leo's Institute interns are doing Varela-tradition phenomenological coding — key resource for Capture data validation and Diary training data. |
| **Patrick Deegan PhD** | SDRF Technical Lead | Sovereign vault architecture, persistent identifier system, encryption infrastructure, cross-tool data fabric. |
| **Cody Gibbons** | Co-Founder, Chief State Engineer | State Engineering framework, compound protocols, facilitator decision matrix. |
| **Jeremy Coltharp** | Operations | Operational execution, stakeholder coordination, website management. Raised the per-study identifier question (§9.4). |
| **Gantasmo** | NeuroPhenSuite Lead | Phenomenological assessment engine, biosignal integration. |

### Additional contributors

| Person | Role | Relevant to Capture/Diary |
|--------|------|--------------------------|
| **Joel** | SDRF Architecture | Cryptographic architecture for persistent identifier system, vault key derivation. Collaborating with Patrick on the hash + device-key identity model (§9.4). *(Leo to confirm role scope.)* |

### Leo's Institute interns

Leo has interns doing microphenomenology coding in the Varela tradition. Their work maps directly to two critical needs:

1. **Capture validation:** Code phenomenological features from Capture voice transcripts against the tool's dimensional schema. This produces the ground truth data for PF scoring — does the tool's structured output actually capture what the voice narrative contains?

2. **Diary training data:** Every transcript they code, paired with dimensional ratings, is a labeled example for the Diary/Euqualia extraction model. The more transcripts they code, the better the LLM becomes at automated feature extraction.

3. **Rosetta stone:** Their Varela-tradition coding scheme and Sensoria's dimensional taxonomy need to be mapped to each other. Which Varela codes correspond to which Sensoria dimensions? Where do the coding schemes diverge? This mapping is the Rosetta stone bridging Varela-tradition phenomenological coding and Sensoria's quantified dimensional taxonomy — and a publishable methodological contribution.

**Anonymization requirement (Leo):** The intern work requires anonymized transcripts. The Capture tool's pseudonymous architecture helps, but voice recordings need to be transcribed and de-identified before interns receive them. Add to the data pipeline: Whisper transcription → PII scrub → coded transcript for intern analysis.


---

## Appendix B: Connection to The Shape of Mind (NPSS Installation)

Sensoria Research is separately developing *The Shape of Mind* — a large-scale holographic art installation that renders the Neurophenomenological State Space as a navigable three-dimensional manifold. The installation is the subject of a dedicated grant proposal (Sensoria Research / UCL-IACS, 2026).

**How the projects connect:**

The Capture tool is the primary data collection instrument for the NPSS. Every phenomenological artifact produced by Capture — voice narratives, dimensional ratings, compound profiles, somatic maps — contributes data points to the state space that The Shape of Mind visualizes. The installation makes the aggregate map visible; Capture is how individual explorers add to it.

At Shape of Mind installation venues, the Capture tool (or its successor, Diary/Euqualia) serves as the on-site activation station described in the grant proposal. Visitors complete a phenomenological self-report, contribute their data to the NPSS, and see their approximate position rendered within the holographic manifold. The experience is the experiment.

**Interdependencies:**

- The Shape of Mind requires a populated NPSS. Capture is how it gets populated.
- The Euqualia activation stations specified in the grant proposal are implementations of the Capture/Diary product.
- The SDRF consent and sovereignty architecture (§9, §10) governs how visitor data collected at installations is stored, shared, and used.
- The verification tiers (§11) apply to installation-collected data — venue attendance provides Tier 1 context verification automatically.

**Independence:**

Neither project depends on the other for delivery. Capture ships and collects data without the installation. The installation can be built and deployed with existing datasets. But the data flywheel between them — more captures populate the NPSS, a richer NPSS makes a more compelling installation, a more compelling installation draws more visitors who produce more captures — is the strategic logic for developing them in parallel.
