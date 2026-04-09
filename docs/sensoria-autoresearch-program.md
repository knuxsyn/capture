# Sensoria Capture — Autoresearch System

## Inspired by Karpathy's autoresearch: one file, one metric, one loop
## Date: 2026-03-28
## Version: 1.0

---

## §1 The Karpathy Pattern, Translated

```
KARPATHY (ML)                    SENSORIA (Phenomenology)
─────────────────────────────────────────────────────────────
train.py (editable)          →   index.html (the capture tool)
val_bpb (fixed metric)       →   Phenomenological Fidelity (PF)
program.md (directions)      →   program.md (this document)
5-min GPU experiment         →   one explorer capture + debrief
agent proposes code change   →   agent proposes UX/dimension change
ratchet: keep or revert      →   ratchet: ship or revert
100 experiments/night        →   ~5 reports/week analyzed at machine speed
git history of improvements  →   version history of PF improvements
```

### What's the same
- Fixed scalar metric that can't be gamed (PF)
- Editable asset (index.html) that the agent modifies
- Research directions written in natural language (this document)
- Ratchet mechanism: improvement → commit, regression → revert
- The human's job is writing better research directions, not running experiments

### What's different
- Data collection requires real humans (explorers), not GPU cycles
- The "eval function" has two modes: automated (LLM transcript analysis) and manual (human debrief)
- Experiment throughput is bounded by explorer participation, not compute
- The search space is UX design + measurement dimensions, not hyperparameters

---

## §2 The Three Files

### File 1: index.html (THE EDITABLE ASSET)
The capture tool. This is what the agent modifies. Every change must:
- Be a single, testable modification (one variable per experiment)
- Not break existing data schema backward compatibility
- Not push completion time past 7 minutes
- Not remove existing dimensions (only add, reorder, or rephrase)

### File 2: eval.md (THE FIXED EVAL — DO NOT MODIFY)
The evaluation protocol. This is locked. The agent cannot change how PF is computed.
See §4 for the complete eval specification.

### File 3: program.md (THE RESEARCH DIRECTIONS — THIS DOCUMENT)
The human writes this. The agent reads this. This is where intelligence lives.
Updated after every analysis cycle based on what the data reveals.

---

## §3 The Metric: Phenomenological Fidelity (PF)

```
PF = 1 - [ Σ(loss_i × salience_i) / Σ(salience_i) ]
```

### Properties (why this is a good metric)
- **Scalar**: single number, 0-100%, directly comparable across versions
- **Bounded**: 0% = tool captures nothing, 100% = perfect fidelity (theoretical ceiling ~92%)
- **Decomposable**: PF breaks into per-feature loss scores for diagnosis
- **Version-independent**: same eval applies to any version of the tool
- **Manipulation-resistant**: eval requires real phenomenological content, not synthetic data
- **Friction-adjusted**: PF_adj = PF × completion_rate (a tool nobody finishes has zero effective fidelity)

### Stopping criteria
- PF_adj > 55% for Capture tool → declare Capture v1.0, shift resources to Diary
- PF_adj > 80% for Diary → declare Diary v1.0, shift to biometric integration
- If PF_adj plateaus for 3 consecutive versions → the measurement surface is saturated, investigate new modalities (drawing, sound, movement capture)

### Metric variants to track
```yaml
pf_raw:          # PF without friction adjustment
pf_adjusted:     # PF × completion_rate  
pf_by_method:    # PF segmented by method category
pf_by_typology:  # PF segmented by PPIA type
pf_by_expertise: # PF segmented by experience frequency
pf_voice_only:   # PF from voice transcript alone (no structured inputs)
pf_struct_only:  # PF from structured inputs alone (no voice)
```

`pf_voice_only` vs `pf_struct_only` tells you the marginal value of each channel.
When `pf_voice_only` approaches `pf_raw`, the structured inputs aren't adding signal.
When `pf_struct_only` approaches `pf_raw`, the voice isn't adding signal.
The gap between them is the interaction value — signal that only emerges from both.

---

## §4 The Eval Function (LOCKED — DO NOT MODIFY)

```
INPUT:
  - capture_data.json     (structured output from the tool)
  - voice_transcript.txt  (whisper transcription of voice recording)
  - debrief_transcript.txt (optional: human debrief conversation)

PROCESS:

  STEP 1: FEATURE EXTRACTION
  ───────────────────────────
  Feed voice_transcript + debrief_transcript to LLM with this prompt:

  "You are a phenomenological analyst for Sensoria Research. Extract
   every distinct phenomenological feature from this experience report.
   A feature is any aspect of the experience that carries information
   about the person's state of consciousness. For each feature, provide:

   - feature_name: short descriptive label
   - feature_description: 1-2 sentence description in the explorer's terms
   - phenomenological_tier: 1 (primitive), 2 (relational), 3 (complex), 4 (dynamic)
   - closest_instrument: which validated instrument measures this (or 'none')
   - salience: 1-10 (how central to understanding this experience)

   Extract 10-25 features. Err toward granularity."

  STEP 2: DIMENSION MATCHING
  ───────────────────────────
  For each extracted feature, the LLM determines:

  - matched_dimension: which dimension in the current tool captures this
    (D01-D17+, or 'none' if no dimension exists)
  - loss_estimate: 0-100% signal destruction
    - 0%: the dimension captures this feature with full fidelity
    - 25%: captured but with notable compression (e.g., slider loses temporal arc)
    - 50%: partially captured (e.g., correct domain but wrong granularity)
    - 75%: barely captured (e.g., only via voice, no structured dimension)
    - 100%: completely invisible to the tool

  STEP 3: VOICE RECOVERY CHECK
  ────────────────────────────
  For features scored 75-100% loss on structured dimensions:
  - Is this feature recoverable from the voice transcript alone?
  - If yes, reduce loss by 25% (voice acts as safety net)
  - This measures how much the voice channel is compensating for
    structural gaps

  STEP 4: COMPUTE PF
  ──────────────────
  pf_raw = 1 - [ Σ(loss_i × salience_i) / Σ(salience_i) ]

  Also compute:
  - pf_voice_only: re-score assuming only voice exists
  - pf_struct_only: re-score assuming only structured inputs exist
  - feature_gap_list: features with loss > 60%, sorted by weighted_loss

  STEP 5: FRICTION MEASUREMENT
  ────────────────────────────
  From capture_data.json metadata:
  - completion_time: seconds from vault creation to export
  - steps_completed: how far they got (0-6)
  - voice_duration: seconds of audio recorded

  completion_rate = steps_completed / total_steps
  pf_adjusted = pf_raw × completion_rate

OUTPUT:
  {
    report_id: string,
    pf_raw: float,
    pf_adjusted: float,
    pf_voice_only: float,
    pf_struct_only: float,
    completion_time_seconds: int,
    completion_rate: float,
    feature_count: int,
    features: [{ name, description, tier, salience, matched_dimension, loss }],
    gap_list: [{ feature, loss, salience, weighted_loss, product_assignment }],
    unmeasured_count: int,
    version: string
  }
```

### Automated vs manual eval

```
AUTOMATED EVAL (run on every report):
  - Whisper transcription of voice recording
  - LLM feature extraction from transcript
  - LLM dimension matching against current tool spec
  - PF computation
  - ~2 minutes of compute per report, zero human time

MANUAL EVAL (run on every 5th report, or on request):
  - 15-30 min debrief conversation with explorer
  - Debrief transcript fed into same eval pipeline
  - Comparison: pf_automated vs pf_manual
  - Calibration: if they diverge by >10%, adjust extraction prompt

The automated eval is the "overnight GPU run."
The manual eval is the "human spot-check."
Over time, as the extraction prompt improves,
automated eval converges toward manual eval.
```

---

## §5 The Loop

```
┌─────────────────────────────────────────────────────────┐
│                  THE AUTORESEARCH LOOP                   │
│                                                         │
│  ┌──────────┐                                           │
│  │  COLLECT  │  Explorers use current tool version      │
│  └────┬─────┘  (1-5 reports per cycle)                  │
│       │                                                 │
│       ▼                                                 │
│  ┌──────────┐                                           │
│  │   EVAL   │  Run eval function on each report         │
│  │          │  Compute PF, identify gap_list             │
│  └────┬─────┘                                           │
│       │                                                 │
│       ▼                                                 │
│  ┌──────────┐                                           │
│  │ AGGREGATE│  Across all reports in this cycle:         │
│  │          │  - Mean PF (is it improving?)              │
│  │          │  - Common gaps (what keeps showing up?)    │
│  │          │  - Friction data (where do people stall?)  │
│  └────┬─────┘                                           │
│       │                                                 │
│       ▼                                                 │
│  ┌──────────┐                                           │
│  │ HYPOTHESIZE│ Agent reads:                            │
│  │          │  - program.md (research directions)        │
│  │          │  - gap_list (what's missing)               │
│  │          │  - backlog (what's been proposed)          │
│  │          │  Proposes ONE modification to index.html   │
│  └────┬─────┘                                           │
│       │                                                 │
│       ▼                                                 │
│  ┌──────────┐                                           │
│  │ IMPLEMENT│  Agent modifies index.html                │
│  │          │  Commits to branch (not main)             │
│  └────┬─────┘                                           │
│       │                                                 │
│       ▼                                                 │
│  ┌──────────┐                                           │
│  │ VALIDATE │  - Does it still render correctly?         │
│  │          │  - Does it break existing schema?          │
│  │          │  - Does it exceed 7-min friction budget?   │
│  │          │  - Human reviews the change                │
│  └────┬─────┘                                           │
│       │                                                 │
│       ▼                                                 │
│  ┌──────────┐                                           │
│  │  RATCHET │  If valid: merge to main, deploy          │
│  │          │  If invalid: revert, log reason            │
│  │          │  Update backlog with outcome               │
│  └────┬─────┘                                           │
│       │                                                 │
│       └──────────────────────── LOOP ◄──────────────────┘
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Cycle cadence

```
WEEKLY CYCLE (while report volume is low, <10/week):
  Monday:    Collect reports from previous week
  Tuesday:   Run automated eval on all reports
  Wednesday: Aggregate, identify top gap
  Thursday:  Agent proposes modification
  Friday:    Human reviews, merge or revert

DAILY CYCLE (when report volume is high, 10+/week):
  Same loop, compressed to 24 hours
  Agent runs eval overnight, proposes change by morning

CONTINUOUS CYCLE (when Diary exists + API pipeline):
  Reports flow in continuously
  Eval runs on each report in real-time
  Agent proposes changes when gap_list shifts
  Human reviews async
```

---

## §6 Research Directions (THE program.md)

These are the current research directions for the agent. Updated by humans
after each analysis cycle.

### Active directions (explore these)

```markdown
1. MULTI-COMPOUND INTERACTION EFFECTS
   The tool now supports multi-select with prime/probe tagging.
   Analyze whether explorers use this correctly. Do they understand
   "prime"? Does the interaction data correlate with richer reports?
   If multi-compound reports have higher PF_voice but similar PF_struct,
   the structured dimensions aren't capturing the interaction effects.
   EXPLORE: a "how did they interact?" free-text field after multi-select.

2. BODY MAP QUALITY DESCRIPTORS
   The body map now captures 3-level intensity. Reports still describe
   qualities (swirling, pulsing, fragmenting, radiating, static, tingling).
   EXPLORE: adding 3-4 quality tags per activated region.
   CONSTRAINT: must not add more than 5 seconds per region.

3. TEMPORAL ARC
   The biggest structural gap in Capture. Experiences have trajectories.
   EXPLORE: a simple phase-tagger (onset → build → peak → plateau →
   descent → integration) with optional peak-duration estimate.
   CONSTRAINT: must take under 30 seconds total.

4. CHALLENGING EXPERIENCE FRAMING
   Report-001 showed anxiety as catalyst, not pathology.
   EXPLORE: a "turning point" question — "Was there a moment where
   something difficult became something useful?" (yes/no/not applicable)
   This is 1 tap and captures the transformation arc.

5. VOICE TRANSCRIPT EXTRACTION
   Run Whisper on all voice recordings. Analyze what information
   appears in voice but not in structured data (the gap).
   EXPLORE: which specific features are voice-recoverable vs voice-only?
   This determines whether to invest in better structured capture or
   better NLP extraction from voice.
```

### Constraints (do not violate)

```markdown
- Completion time must not exceed 7 minutes (measure empirically)
- Existing dimensions must not be removed (only added or rephrased)
- The vault/encryption architecture must not be weakened
- The export JSON schema must be backward-compatible
- No third-party services (no Formspree, no analytics, no tracking)
- Voice remains optional — structured-only capture must still work
- Copy must follow Sensoria COM voice guidelines
- All new dimensions must reference a validated instrument or state
  explicitly that they are novel (for future publication)
```

### Deferred directions (not yet, but track)

```markdown
- LLM-guided Diary layer (requires API integration — separate product)
- Biometric data ingestion (requires SDRF — separate infrastructure)
- Multimodal capture: drawing, color picker, sound matching
- Real-time in-session capture (radically different UX constraints)
- Cross-report analysis (how does explorer X's state space evolve over time?)
- NPSS coordinate computation from capture data
```

---

## §7 Agent Instructions

When given a batch of evaluated reports and access to the three files:

```
YOU ARE the Sensoria Capture research agent.

YOUR GOAL: increase Phenomenological Fidelity (PF) while keeping
friction below the 7-minute ceiling.

EVERY CYCLE, you must:

1. READ program.md for current research directions and constraints
2. READ the latest eval results (PF scores, gap_lists, friction data)
3. READ the current index.html to understand what exists
4. READ the backlog (capture-backlog.md) for context on prior decisions

5. IDENTIFY the single highest-impact change based on:
   gap_frequency × weighted_loss / effort
   (features that appear in multiple reports, have high loss × salience,
   and are low effort to implement)

6. PROPOSE exactly ONE modification
   - Describe the hypothesis: "Adding X will reduce loss on feature Y
     by approximately Z%, improving PF by ~W%"
   - Show the specific code change
   - Estimate the friction cost in seconds

7. IMPLEMENT the change on a branch

8. VALIDATE:
   - The tool still renders correctly
   - The export schema is backward-compatible
   - The estimated completion time is within budget
   - The copy follows COM voice guidelines

9. REPORT:
   - What you changed and why
   - Expected PF impact
   - What to measure in the next cycle to validate

YOU MUST NOT:
- Change more than one variable per cycle
- Modify the eval function
- Remove existing dimensions
- Add third-party dependencies
- Exceed the friction budget
- Use clinical or extractive language in copy

YOU MUST:
- Keep changes minimal and reversible
- Prefer rephrasing existing dimensions over adding new ones
- Log every decision with reasoning
- Cite specific report evidence for every change
- Update the backlog after every cycle
```

---

## §8 Measuring Progress

### The dashboard (compute after every cycle)

```yaml
version_history:
  - version: "v0.2"
    date: "2026-03-27"
    pf_raw: 0.32
    pf_adjusted: null
    reports_analyzed: 1
    dimensions: 15
    completion_time_median: null
    key_change: "Initial MVP"

  - version: "v0.3"
    date: "2026-03-28"
    pf_raw: 0.48  # estimated
    pf_adjusted: null
    reports_analyzed: 1
    dimensions: 17
    completion_time_median: null
    key_change: "+multi-select method, +body intensity, +physical state"

  # Each version adds a row. PF should trend upward.
  # If PF drops, revert and investigate.

convergence_tracking:
  pf_target: 0.55  # Capture v1.0 threshold
  current_pf: 0.48
  gap_to_target: 0.07
  estimated_cycles_remaining: 3-5  # based on avg PF gain per cycle
  
  # When gap_to_target < 0.02 for 3 consecutive cycles:
  # → PF is saturated for Capture
  # → Shift to Diary development

friction_tracking:
  completion_rate_target: 0.80
  current_completion_rate: null  # not yet measured
  median_time_target: 300  # 5 minutes
  current_median_time: null
  
  # If completion_rate drops below 0.70:
  # → Last change added too much friction
  # → Revert or compress
```

### The North Star chart

```
PF
│
│                                          ┄┄┄ 92% (Diary + biometrics)
│                                    ┄┄┄┄┄ 85% (Diary v1.0)
│                              ┄┄┄┄┄ 75% (Diary v0.1)
│
│                        ╌╌╌╌╌ 58% (Capture v1.0 — ceiling)
│                   ╌╌╌╌╌ 55% (Capture target — shift to Diary)
│              ··●── 48% (v0.3 — current)
│         ··●── 32% (v0.2)
│    ··●── ~20% (v0.1 — first prototype)
│
└────────────────────────────────────────── time / version
         ↑                    ↑
    Capture zone         Diary zone
    (friction-bounded)   (LLM-bounded)
```

---

## §9 How To Run This System

### For the human (Knux / Leo / Jeremy):

1. **Collect reports.** Share the capture link. Ask explorers to also do
   a 10-15 min voice debrief (can be a Signal voice note answering
   the interview questions from the battle-test protocol).

2. **Run the eval.** Start a Claude conversation, load:
   - This document (program.md)
   - The capture-backlog.md
   - The current index.html
   - The voice transcript(s) and/or debrief transcript(s)
   Say: "Run eval on these reports. Compute PF. Update the backlog."

3. **Review the proposal.** Claude will identify the highest-impact
   change and propose a specific modification. Review it.
   If it makes sense: implement and deploy.
   If it doesn't: explain why and ask for an alternative.

4. **Measure.** After the change is live and 3-5 new reports come in,
   run eval again. Did PF go up? Did completion rate hold?
   If yes: the change is validated. Update version_history.
   If no: revert and log the failure.

5. **Update program.md.** Based on what you learned, add new research
   directions or retire old ones. This is the highest-leverage
   human activity in the system.

### For the agent (Claude):

When loaded with the three files + report data:
- Follow §7 instructions exactly
- Propose ONE change per cycle
- Show your math (expected PF impact)
- Cite specific report evidence
- Respect all constraints

### Cycle frequency:

```
Reports/week    Cycle cadence    Human time/cycle
─────────────────────────────────────────────────
1-3             Biweekly         30 min
3-10            Weekly           45 min
10-25           2x/week          30 min each
25+             Daily            20 min (mostly review)
```

---

## §10 What Makes This Different From Normal Product Development

Normal product development: PMs collect qualitative feedback, prioritize
by gut + user count, build features, measure engagement metrics.

Autoresearch-style: every change is a hypothesis with a predicted impact
on a scalar metric. The metric is measured before and after. Changes that
don't move the metric are reverted. The backlog is sorted by data, not
opinion. The human's job is writing better research directions, not
deciding what to build.

The shift: **from "what should we build?" to "what should we measure?"**

Karpathy's insight: the bottleneck isn't the agent's ability to modify code.
It's the human's ability to define what "better" means. For Sensoria,
"better" means higher phenomenological fidelity at the same or lower friction.
That's the entire research program in one sentence.

Everything else — the backlog, the features, the UX changes, the dimensional
additions — is the agent's job. The human's job is making sure PF is the
right metric, the eval is measuring it correctly, and the research directions
are pointing at the right part of the search space.

When the human stops needing to tell the agent what to build and instead
only needs to tell it where to look — that's when the system is working.
