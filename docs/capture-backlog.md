# Sensoria Capture — Feature Backlog & Fidelity Measurement System

## Version: 0.3-draft
## Date: 2026-03-27
## Key metric: Phenomenological Fidelity (PF)

---

## §1 Core Metric Definition

### Phenomenological Fidelity (PF)

The percentage of experientially meaningful signal that survives compression from lived experience into structured data.

```
PF = 1 - (weighted_compression_loss)

where weighted_compression_loss = Σ(loss_i × salience_i) / Σ(salience_i)

  loss_i     = per-feature signal loss (0-100%)
  salience_i = research importance weight (1-10)
```

**Target trajectory:**
- Capture v0.2 (current shipped): PF ~32% (measured against Knux report #1)
- Capture v0.3 (with v0.3 improvements): PF target ~48%
- Capture v1.0 (mature): PF target ~55%
- Diary v1.0 (LLM-guided): PF target ~80%
- Diary + biometrics: PF target ~90%

PF has a theoretical ceiling below 100% because some phenomenological content is pre-linguistic — it cannot be captured through any verbal or structured input channel. The gap between Diary and 100% is the domain of direct neural/physiological measurement and artistic/embodied expression modalities.

---

## §2 Current Dimensions (v0.3 shipped)

| ID | Dimension | Instrument ref | Input type | Tier |
|----|-----------|---------------|------------|------|
| D01 | Method/state | 179-item grouped taxonomy | Multi-select dropdown + prime tag | Context |
| D02 | Dose/intensity | Free text | Text input | Context |
| D03 | Setting | Free text | Text input | Context |
| D04 | Intention | Free text | Text input | Context |
| D05 | Explorer typology | PPIA-lite (9 types) | Single radio select | Context |
| D06 | Experience frequency | 4-point ordinal | Single radio select | Context |
| D07 | Voice narrative | Freeform | Audio recording | Tier 1-4 |
| D08 | Arousal/intensity | VAS 0-100 | Slider | Tier 1 |
| D09 | Valence | VAS 0-100 | Slider | Tier 1 |
| D10 | Ego dissolution | EDI-8 proxy VAS 0-100 | Slider | Tier 2 |
| D11 | Temporal perception | 7-point categorical | Tap grid | Tier 1 |
| D12 | Somatic body map | 10 regions × 3 intensity levels | Tap to cycle | Tier 1 |
| D13 | Body sensation notes | Free text | Textarea | Tier 1 |
| D14 | Physical state/factors | 21-item multi-select + notes | Chip select + textarea | Context |
| D15 | Connectedness: self | Watts proxy VAS 0-100 | Slider | Tier 2 |
| D16 | Connectedness: others | Watts proxy VAS 0-100 | Slider | Tier 2 |
| D17 | Connectedness: world | Watts proxy VAS 0-100 | Slider | Tier 2 |

---

## §3 Feature Backlog

Each feature is scored on:
- **loss**: signal destroyed without this feature (0-100%)
- **salience**: research importance (1-10)
- **weighted_loss**: loss × salience (max 1000) — the prioritization score
- **effort**: relative implementation cost (1-10, where 1 = hours, 10 = months)
- **fidelity_gain**: estimated PF improvement if implemented
- **product**: Capture or Diary (which product should own this)
- **status**: backlog | in-progress | shipped | deferred
- **evidence**: which reports surfaced this need (report IDs)
- **blocked_by**: dependencies

### Priority tier 1 — High loss, achievable effort (build next)

```yaml
- id: F01
  name: Compound interaction tagging (prime/probe)
  status: shipped-v0.3
  loss: 85
  salience: 9
  weighted_loss: 765
  effort: 3
  fidelity_gain: +8%
  product: Capture
  evidence: [report-001-knux]
  description: >
    Multi-select method with primary compound designation.
    Enables Tom Ray primer/probe framework tagging at capture time.
  shipped_implementation: >
    Multi-select dropdown with chip display. Tap chip to mark as prime.
    Export includes methods array + primary_method field.

- id: F02
  name: Body map intensity layer
  status: shipped-v0.3
  loss: 65
  salience: 8
  weighted_loss: 520
  effort: 2
  fidelity_gain: +5%
  product: Capture
  evidence: [report-001-knux]
  description: >
    3-level intensity per body region (mild/strong/intense) instead of binary.
    Recovers heat-map quality of somatic experience.
  shipped_implementation: >
    Tap to cycle through 4 states (off → mild → strong → intense → off).
    Visual intensity scales with opacity. Export includes per-region intensity level.

- id: F03
  name: Physical state / adverse effects capture
  status: shipped-v0.3
  loss: 90
  salience: 6
  weighted_loss: 540
  effort: 1
  fidelity_gain: +4%
  product: Capture
  evidence: [report-001-knux]
  description: >
    21-item multi-select for physical factors (respiratory difficulty, nausea,
    congestion, sleep deprivation, etc.) plus freeform notes.
    Captures the physical context that shapes phenomenology.
  shipped_implementation: >
    Chip multi-select on Body step. Conditional textarea for details.
    Export includes factors array + notes.
```

### Priority tier 2 — High loss, moderate effort (next sprint)

```yaml
- id: F04
  name: Temporal arc / phase tagging
  status: backlog
  loss: 80
  salience: 8
  weighted_loss: 640
  effort: 5
  fidelity_gain: +6%
  product: Capture
  evidence: [report-001-knux]
  blocked_by: null
  description: >
    The tool captures peak-state ratings but not the trajectory.
    Minimum viable version: a simple phase selector
    (onset → build → peak → plateau → descent → afterglow → integration)
    with optional duration estimates per phase.
    Advanced version: a draggable timeline with intensity curve drawing.
  ux_constraint: >
    Must take under 30 seconds. The timeline drawing is elegant but may be
    too much cognitive labor post-experience. Phase tags + "how long was the
    peak?" may recover 70% of the signal at 20% of the UX cost.

- id: F05
  name: Valence arc / transformation capture
  status: backlog
  loss: 80
  salience: 8
  weighted_loss: 640
  effort: 4
  fidelity_gain: +5%
  product: Capture
  evidence: [report-001-knux]
  blocked_by: F04
  description: >
    The valence slider captures a single point but experiences often involve
    valence transformation (anxiety → opening → bliss, or bliss → terror → integration).
    Minimum viable: "Did your emotional tone shift significantly during the experience?"
    (yes/no) → if yes, "What was the arc?" with 3 tagged points (beginning, turning point, end).
  note: >
    Depends on F04 (phase tagging) to anchor the valence points temporally.

- id: F06
  name: Noetic / cognitive quality dimension
  status: backlog
  loss: 60
  salience: 7
  weighted_loss: 420
  effort: 3
  fidelity_gain: +4%
  product: Capture
  evidence: [report-001-knux]
  blocked_by: null
  description: >
    MEQ-30 includes a noetic quality subscale — the sense of encountering
    ultimate truth or deep insight. Current tool has no cognitive dimension.
    Minimum viable: single slider "Did you gain insights or understanding?"
    (none ↔ profound, reality-altering). Optional text field for key insight.
  instrument_ref: "MEQ-30 noetic quality subscale, items 7,11,15,18,25,30"

- id: F07
  name: Challenging experience dimensions
  status: backlog
  loss: 70
  salience: 7
  weighted_loss: 490
  effort: 3
  fidelity_gain: +4%
  product: Capture
  evidence: [report-001-knux]
  blocked_by: null
  description: >
    The CEQ (Barrett et al. 2016) covers fear, grief, physical distress,
    insanity, isolation, death, paranoia. Currently zero coverage.
    Minimum viable: "Did you experience challenging moments?" (yes/no) →
    if yes, multi-select from CEQ subscales + single slider for overall
    difficulty + optional "how did you work with it?" text field.
  instrument_ref: "CEQ (Barrett et al. 2016) — 26 items, 7 subscales"
  note: >
    The critical insight from report-001 is that challenging moments
    can be catalytic, not just adverse. The UX must frame this as
    information, not pathology.
```

### Priority tier 3 — High loss, high effort (Diary territory)

```yaml
- id: F08
  name: Interoceptive resolution / bandwidth
  status: backlog
  loss: 95
  salience: 10
  weighted_loss: 950
  effort: 8
  fidelity_gain: +3% (Capture) / +12% (Diary)
  product: Diary
  evidence: [report-001-knux]
  blocked_by: LLM integration
  description: >
    The number of simultaneous interoceptive channels a person can hold
    in awareness, and the granularity of perception per channel. This is
    not on any standard instrument. It emerged as the most salient
    phenomenological feature in report-001.
    Capture proxy: single slider "How many body systems could you sense
    simultaneously?" (one at a time ↔ everything at once) — crude but
    tags the dimension for correlation analysis.
    Diary version: LLM probes for system inventory, quality descriptors
    per channel, temporal dynamics of multi-system awareness.
  research_note: >
    This may be the novel dimension that differentiates Sensoria's
    measurement architecture from existing instruments. If it correlates
    with compound interactions, meditation experience, or specific
    practices, it's publishable.

- id: F09
  name: Awareness structure (wide-field vs point-focus)
  status: backlog
  loss: 100
  salience: 9
  weighted_loss: 900
  effort: 7
  fidelity_gain: +2% (Capture) / +10% (Diary)
  product: Diary
  evidence: [report-001-knux]
  blocked_by: LLM integration
  description: >
    The structure of attention itself — panoramic vs focused vs both
    simultaneously. Report-001 described having "both the wide-angle and
    macro lens available at the same time."
    Capture proxy: two sliders — breadth (narrow ↔ panoramic) and depth
    (surface ↔ penetrating). When both are high, that's the state.
    Diary version: guided exploration of how attention moved, what it
    could hold, whether the observer was stable or shifting.

- id: F10
  name: Visual/perceptual field capture
  status: backlog
  loss: 95
  salience: 7
  weighted_loss: 665
  effort: 7
  fidelity_gain: +2% (Capture) / +8% (Diary)
  product: Diary
  evidence: [report-001-knux]
  blocked_by: LLM integration
  description: >
    Report-001 described oscillating colors and shapes representing
    body states — a synesthetic visual representation of interoception.
    No standard instrument captures the relationship between visual
    phenomena and somatic states.
    Capture proxy: "Were there visual elements?" (yes/no) →
    multi-select (geometric, color, entity, narrative, synesthetic,
    symbolic) + single quality slider.
    Diary version: rich LLM-guided description with probing for
    meaning, information content, and relationship to other dimensions.

- id: F11
  name: Equilibrium-seeking dynamics
  status: backlog
  loss: 95
  salience: 8
  weighted_loss: 760
  effort: 9
  fidelity_gain: +1% (Capture) / +10% (Diary)
  product: Diary
  evidence: [report-001-knux]
  blocked_by: LLM integration, F04 (phase tagging)
  description: >
    The process of the body/mind finding equilibrium across multiple
    systems simultaneously — described as swirling, fragmenting, pulsing
    patterns resolving over time. This is fundamentally temporal and
    relational — can't be captured in a single rating.
    Capture proxy: none practical.
    Diary version: LLM walks through the process temporally, asking
    how each system's pattern changed relative to others.

- id: F12
  name: Mid-experience interventions
  status: backlog
  loss: 90
  salience: 7
  weighted_loss: 630
  effort: 4
  fidelity_gain: +3%
  product: Capture
  evidence: [report-001-knux]
  blocked_by: null
  description: >
    Report-001 used yoga mid-experience as an active state-change tool.
    The tool assumes a single method and passive experience.
    Minimum viable: "Did you actively do anything to change the state
    during the experience?" (yes/no) → if yes, free text or select
    from intervention types (breathwork, movement, meditation, music
    change, environment change, substance redose, grounding technique).
```

### Priority tier 4 — Lower priority / future considerations

```yaml
- id: F13
  name: Experience timing metadata
  status: backlog
  loss: 40
  salience: 5
  weighted_loss: 200
  effort: 1
  fidelity_gain: +1%
  product: Capture
  description: >
    When did the experience happen? How long ago are you reporting?
    Retrospective decay affects data quality. A simple "When was this?"
    date picker + "How long did the total experience last?" input.

- id: F14
  name: Social context capture
  status: backlog
  loss: 45
  salience: 6
  weighted_loss: 270
  effort: 2
  fidelity_gain: +2%
  product: Capture
  description: >
    Solo, with a partner, small group, ceremony, festival, clinical.
    This is a major contextual variable that's currently unmeasured.

- id: F15
  name: Integration state capture (post-experience)
  status: backlog
  loss: 50
  salience: 6
  weighted_loss: 300
  effort: 3
  fidelity_gain: +2%
  product: Capture
  description: >
    How are you feeling now, relative to before the experience?
    Captures the integration trajectory. Single slider + optional notes.

- id: F16
  name: Multimodal capture (drawing/color/sound)
  status: backlog
  loss: varies
  salience: 5
  weighted_loss: varies
  effort: 8
  fidelity_gain: +3%
  product: Capture v2+
  description: >
    Non-verbal capture channels for pre-linguistic phenomenological
    content. Color picker, simple drawing canvas, sound matching.
    High effort, uncertain fidelity gain, but addresses a real gap
    for content that can't be verbalized.

- id: F17
  name: Biometric integration
  status: backlog
  loss: N/A (new data type)
  salience: 8
  weighted_loss: N/A
  effort: 10
  fidelity_gain: +15%
  product: Platform
  blocked_by: SDRF, device partnerships
  description: >
    HRV, GSR, EEG integration for physiological ground truth.
    This is the third-person data that complements first-person
    phenomenological capture. Long-term roadmap item.
```

---

## §4 Fidelity Measurement Protocol

### How to measure PF for each report

```
FOR EACH EXPERIENCE REPORT:

1. COLLECT
   - Explorer completes Capture tool (structured data + voice)
   - Within 48 hours, conduct a 15-30 min debrief conversation
     (can be voice call, in-person, or async text exchange)
   - The debrief uses the interview questions from the battle-test protocol

2. EXTRACT
   - From the debrief, list every distinct phenomenological feature
     the explorer describes (aim for 10-20 features per report)
   - Tag each feature with the closest dimension in the current tool
   - If no dimension exists, tag as "unmeasured"

3. SCORE
   For each feature:
   a. loss (0-100%): How much signal is destroyed by the tool's
      current representation? 0% = perfectly captured,
      100% = completely invisible to the tool
   b. salience (1-10): How important is this feature for
      understanding the experience? Consider:
      - Would a researcher need this to locate the experience in NPSS?
      - Would the explorer say this was central to what happened?
      - Does it differentiate this experience from adjacent states?

4. COMPUTE
   PF = 1 - [ Σ(loss_i × salience_i) / Σ(salience_i) ]

5. LOG
   Add to the report registry (see §5) with:
   - Report ID, explorer handle, date, method(s)
   - PF score
   - Per-feature breakdown
   - Unmeasured features (these feed the backlog)
   - Explorer's self-reported friction assessment

6. AGGREGATE
   After every 5 reports, compute:
   - Mean PF across all reports
   - PF by method category (psychedelic, breathwork, somatic, etc.)
   - PF by explorer typology (SCI, THE, SPI, etc.)
   - Most common unmeasured features (ranked by frequency × salience)
   - Friction-weighted PF (PF adjusted for completion rate and time)
```

### The friction-fidelity frontier

```
PF is not the only objective function. The second axis is friction:

  Friction = f(time_to_complete, cognitive_load, dropout_rate)

Every new dimension improves PF but increases friction.
The optimization target is:

  maximize PF subject to friction ≤ threshold

The threshold is empirical: if completion rate drops below 70%,
you've exceeded the friction budget regardless of PF gain.

Track for each version:
  - Median completion time (voice step through export)
  - Dropout rate per step (where do people stop?)
  - Self-reported effort (add a single "How effortful was this?"
    slider at the end — meta, but directly informative)
```

---

## §5 Report Registry Schema

```yaml
# One entry per experience report
report_id: "report-001-knux"
explorer_handle: "knux"
explorer_typology: "SCI"
experience_frequency: "experienced"
date_of_experience: "2026-03-25"
date_of_capture: "2026-03-27"
retrospective_gap_hours: 48
methods: ["ketamine", "cannabis"]
primary_method: "ketamine"
capture_version: "v0.2"

pf_score: 0.32
completion_time_minutes: null  # not measured for this report
dropout: false

features:
  - name: "Compound interaction (prime/probe)"
    tool_dimension: "D01 (method)"
    loss: 85
    salience: 9
    notes: "Ketamine priming cannabis — emergent interaction state"

  - name: "Interoceptive resolution / bandwidth"
    tool_dimension: null  # unmeasured
    loss: 95
    salience: 10
    notes: "Simultaneous multi-system somatic awareness"

  # ... (full list per §3 analysis)

unmeasured_features:
  - "interoceptive_resolution"
  - "awareness_structure"
  - "visual_spatial_body_representation"
  - "equilibrium_seeking_dynamics"
  - "mid_experience_intervention"
  - "sense_making_during_experience"

friction_notes: >
  Report was retrospective (48h gap). Explorer is highly articulate
  and systems-oriented (SCI typology). PF score may be lower for
  COM-02 or less experienced explorers who can't name what they felt.

design_implications:
  - "Multi-select method is critical for polypharmacy/stack experiences"
  - "Body map needs intensity and quality, not just location"
  - "Anxiety-as-catalyst pattern needs non-pathological framing in UX"
  - "Interoceptive bandwidth is a novel dimension — not in any standard instrument"
```

---

## §6 Version Roadmap

```
v0.2 (shipped)     → PF ~32%  | 15 dimensions | ~4 min completion
v0.3 (shipped now) → PF ~48%  | 17 dimensions + multi-select + intensity | ~5 min
v0.4 (next)        → PF ~52%  | + temporal arc + social context + timing | ~5.5 min
v0.5               → PF ~56%  | + noetic quality + challenging exp + interventions | ~6 min
v1.0               → PF ~58%  | + visual capture + integration state | ~6.5 min

--- FRICTION CEILING (Capture should not exceed ~7 min) ---

Diary v0.1         → PF ~75%  | LLM-guided interview on top of Capture data
Diary v1.0         → PF ~85%  | Adaptive probing based on typology + method
Diary + biometrics  → PF ~92%  | Physiological ground truth layer
```

---

## §7 Decision Rules for Feature Prioritization

```
WHEN a new feature is proposed:

1. Score: loss × salience = weighted_loss
2. Estimate: effort (1-10)
3. Compute: efficiency = weighted_loss / effort
4. Check: does it push completion time past 7 min?
5. Check: does it require LLM (→ Diary) or can a widget capture it (→ Capture)?
6. Check: has it appeared in 2+ reports? (frequency filter)

IF efficiency > 100 AND completion_time < 7min AND product = Capture:
  → Priority tier 1 (build next)

IF efficiency > 100 AND product = Diary:
  → Add to Diary backlog, note Capture proxy if possible

IF efficiency < 50:
  → Defer unless it appears in 5+ reports

IF completion_time would exceed 7 min:
  → Move lowest-efficiency existing dimension to "optional/collapsible"
    to make room, or defer new feature to Diary
```

---

## §8 How to Use This Document

This document is designed to be loaded into any LLM context window (Claude, GPT, etc.)
as a working reference for Sensoria product development conversations.

**When building:** Load this + the current index.html to understand what exists and what's next.
**When analyzing a report:** Follow §4 protocol, update §5 registry, re-sort §3 backlog.
**When prioritizing:** Apply §7 decision rules against the current backlog.
**When debriefing an explorer:** Use the interview questions that surfaced §3 features.

The key metric is Phenomenological Fidelity (PF). Everything serves PF within the friction budget.
