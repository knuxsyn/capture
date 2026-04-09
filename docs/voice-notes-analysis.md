# Capture & Euqualia — Voice Notes Feature Analysis

**Source:** Structured notes and voice memos from team discussion (April 2026)
**Purpose:** Process into actionable requirements for PRD and backlog integration
**Status:** Draft for review and approval

---

## 1. Product Framing

### 1.1 Core positioning (from discussion)

**"Existential fitness tracker."** The Fitbit equivalent for lived experience. Not just trips — any qualia trajectory. Meditation, yoga, peptide protocols, periods of life, retreat outcomes. The phenomenology layer that sits alongside biometric trackers (Whoop, Oura) and measures what they can't: how empowered you feel, how connected you feel, how much meaning you experience, your sense of self-efficacy over time.

**Two core outcomes:** Insight and well-being. Most existing retreats optimize for well-being. Sensoria is beginning to innovate on the insight side. The tool needs to measure both and enable comparison across approaches.

**"Show. Don't tell. Measure. Compare."** The core value proposition for retreat owners: demonstrate that your approach actually achieves what you say it achieves, with something better than testimonials on a website.

### 1.2 Dual user value

**For the explorer:** Longitudinal insights about their own lived experience over time. A bird's-eye view of their experiential functioning. Track self-efficacy, embodiment, mood, meaning, well-being — not as biomarkers but as felt qualities of life.

**For retreat owners / facilitators:** Demonstrate efficacy of their approach without needing to build HIPAA-compliant data infrastructure themselves. Participants arrive with their sovereign tracker, facilitate as normal, participants leave with pre/post data. The retreat owner can see aggregate outcomes. Compare approaches (e.g., psilocybin + CBT vs. mescaline + gestalt) using the same measurement framework.

### 1.3 Sovereignty as non-negotiable

> "Greater scale, greater depth and breadth of capture but has to be accompanied by sovereignty or it turns into the worst tool for surveillance — an inner surveillance and tyranny and reading of our innermost desires and fears that has ever existed. If it doesn't have sovereignty, it's inadmissible, the worst thing ever."

This is not a feature. This is the ethical precondition for the tool existing.

---

## 2. Training Data Corpora (Leo / IACS)

### 2.1 Available datasets for Diary/Euqualia training

| Source | Content | Phenomenological domain |
|--------|---------|----------------------|
| **Sahar** | Granular microphenomenology of insight processes — impasse, incubation, eruption, unfolding, integration. Captured from a noting Vipassana somatic perspective. Includes "What did it feel like? What did your body feel like?" — not just cognitive content. | Insight, somatic markers of insight, temporal dynamics |
| **IACS interns** | Coding insight processes from dark cave retreat data | Insight during extended contemplative practice |
| **IACS ultrasound** | Phenomenology from experienced meditators undergoing focused ultrasound | Modulated meditative depth, technology-assisted states |
| **ISCS** | Training data on phenomenology of chills as interoceptive marker of insight/self-transcendence. Large survey corpora. | Chills, self-transcendence, interoception |
| **IACS online** | Online data from ultrasound modulation of meditative depth | Technodelic states, depth markers |

**Key insight:** These are not just "trip reports." They are granular somatic-phenomenological trajectories — the processes *leading up to* and *following* moments of insight, including body sensations, temporal dynamics, and the noting/labeling process itself. This is exactly the training data the Diary extraction model needs.

### 2.2 Implication for Capture/Diary

The Diary agent needs to be trained not just to ask "What happened?" but to probe the somatic substrate of insight: "When the insight arrived, what did your body do? Was there a physical precursor? Did you feel it coming before you knew what it was?" The noting Vipassana tradition provides the methodological template for this kind of probing.

**Action item:** Leo to provide anonymized sample transcripts from Sahar and IACS intern coding. These become the first Diary training examples and the basis for the Rosetta stone mapping.

---

## 3. Feature Requirements (from discussion)

### 3.1 For immediate backlog

```yaml
- id: F-VOICE-NOTES
  name: Multiple voice notes throughout experience
  description: >
    Shift from single post-hoc recording to a Whispr Flow-like model
    where the explorer can tap to record at any moment — during,
    immediately after, the next morning. Each note is timestamped
    and part of the same capture session.
  priority: high
  source: "voice memo notes — nudges, multiple voice notes"

- id: F-BODY-HEATMAP
  name: Somatic emotion mapping (body heat map)
  description: >
    Based on published research showing cross-cultural consistency
    in where people locate emotions somatically. Let the explorer
    "paint" where they feel an emotion on a body silhouette.
    Differences from population norms are diagnostically informative.
    Current body map captures location + intensity. This would add
    emotion-to-region mapping.
  priority: medium
  source: "voice memo — somatic emotion mapping papers"
  research_ref: "Nummenmaa et al. 2014, bodily maps of emotions"

- id: F-SHIFT-WAVE
  name: Shift wave / altered state trajectory visualization
  description: >
    A visual representation of how the explorer's state evolved
    over time. Not just peak ratings but the shape of the arc.
    Could be as simple as a drawn curve or as complex as a
    multi-dimensional trajectory plot.
  priority: medium
  source: "voice memo — shift wave on altered states"
  note: "Partially addressed by temporal arc feature (F04 in backlog)"

- id: F-BIOMETRIC-KERNEL
  name: Biometric capture integration point
  description: >
    The Capture tool is the "kernel" that future biometric layers
    attach to. HRV, GSR, EEG, sleep data — all layer onto the
    phenomenological artifact. Not building biometric capture now,
    but the schema and architecture must accommodate it.
  priority: architectural
  source: "voice memo — biometric kernel, layering on"

- id: F-DEVICE-MODALITIES
  name: Multi-device / multi-modality capture suite
  description: >
    "The ability to move a device around, growl at it, report on it
    should be a whole suite of neurophenomenological capabilities."
    The Capture tool is one surface. Future surfaces include ambient
    recording, movement capture, drawing, sound, and physiological
    sensing. All feed the same artifact schema.
  priority: architectural / future
  source: "voice memo — NeuroPhen suite"

- id: F-TRANQUIL-LIFE
  name: Non-extraordinary state capture
  description: >
    "If you're leading a relatively tranquil life and just processing
    things throughout a series of time, then it's really just capturing
    that. It's got nothing to do with any substances."
    The tool must serve people tracking everyday phenomenology:
    mood, embodiment, self-efficacy, meaning. Not just altered states.
    Relates to the psychedelic-forward vs phenomenology-forward
    positioning decision (PRD §15).
  priority: high (positioning)
  source: "voice memo — tranquil life, not about substances"

- id: F-WELL-BEING-DIMENSIONS
  name: Well-being and meaning measurement dimensions
  description: >
    Phenomenological dimensions beyond altered states:
    - Self-efficacy (how empowered do I feel?)
    - Embodiment (how in touch with my body am I?)
    - Meaning (do my experiences feel meaningful?)
    - Problem-solving (am I overcoming challenges?)
    - Mood trajectory (not just valence — mood as sustained state)
    These are the dimensions that make the tool an "existential
    fitness tracker" rather than a trip report tool.
  priority: high
  source: "voice memo — Fitbit for lived experience"
  note: >
    "These are ultimately issues of phenomenology and they have to
    be made legible and it's not a trivial problem but it's not
    an unattractive one."

- id: F-RETREAT-OUTCOMES
  name: Retreat efficacy measurement (B2B use case)
  description: >
    Pre/post capture at retreat sites. Participants arrive with the
    tool, capture baseline, experience the retreat, capture post.
    The retreat owner gets aggregate outcome data.
    Compare across retreat modalities, across populations.
    "Johnny Retreat Owner" use case: demonstrate efficacy without
    building HIPAA-compliant infrastructure.
  priority: high (revenue)
  source: "voice memo — retreat owner use case"
  blocked_by: "SDRF (for longitudinal comparison)"

- id: F-INSIGHT-MARKERS
  name: Insight detection and measurement
  description: >
    Insight as a measurable phenomenological event with somatic
    precursors (chills, body sensation shifts), cognitive markers
    (aha moment, problem resolution), and integration dynamics.
    The Sahar and IACS data provide the training corpus.
    The Diary agent should be able to detect and probe for insight
    processes specifically.
  priority: medium
  source: "voice memo — Sahar, IACS, insight trajectories"
  training_data: "Sahar corpus, IACS intern coding, ISCS chills data"
```

### 3.2 Agentic / chatbot considerations (Diary only)

From the discussion on ontological query guard rails:

> "Really hard guard rails on ontological queries — 'that's not the type of question that I can really answer.' But do you know how many exceptions you would have to put there? Well it depends if you model it in terms of where the person is going in terms of their empowerment, their intrinsic drive, or whether you can model someone agentically so that it's not a rule set, it's not a decision tree."

**Implication:** The Diary agent should not use brittle rule-based guardrails for sensitive questions (metaphysical, spiritual, existential). Instead, model the agent's behavior in terms of the explorer's empowerment and intrinsic drive. The agent's job is to help the explorer see more clearly, not to interpret for them. Frame as a *phenomenological mirror* — reflects back, probes deeper, never tells the explorer what their experience means.

---

## 4. Framing Updates for PRD

### 4.1 Reframe the product vision

The PRD currently frames Capture as a "consciousness research data collection tool." The discussion makes clear it needs a dual framing:

**For the explorer:** Existential fitness tracker. Longitudinal self-knowledge about your lived experience — how you feel, what drives you, how you change over time. Not just trip reports.

**For institutions (retreats, research, clinics):** Sovereign phenomenological measurement infrastructure. Demonstrate efficacy. Compare approaches. Generate research-grade data without building your own data architecture.

**For Sensoria:** The data engine for the NPSS. Every capture is a coordinate in the map.

### 4.2 Measure-theoretic framework connection

From Knux's framing: "This is a measure-theoretic framework for longitudinal change related to human flourishing."

The NPSS is the state space. Each capture is a point measurement (a sample from the σ-algebra over the state space). Longitudinal capture produces a trajectory — a measure-valued curve. Flourishing is an optimal transport problem: given where the explorer is, what's the most efficient path to where they want to be?

Capture provides the coordinates. Diary refines them. SDRF stores the trajectory. The Shape of Mind visualizes the manifold. The measure-theoretic framework unifies all of it.

### 4.3 New dimensions to add to backlog

| Dimension | Source | Instrument ref | Priority |
|-----------|--------|---------------|----------|
| Self-efficacy | Voice memo | GSE (Schwarzer & Jerusalem 1995) | High |
| Meaning in life | Voice memo | MLQ (Steger et al. 2006) | High |
| Embodiment | Voice memo | MAIA-2 (Mehling et al. 2018) | High |
| Insight quality | Voice memo + Sahar/IACS | Novel — to be developed from training data | Medium |
| Problem-solving / overcoming | Voice memo | Novel — single-item proxy TBD | Medium |
| Chills / interoceptive markers | Leo / ISCS | ASC chills subscale, novel somatic markers | Medium |

---

## 5. Decisions for Review

| Decision | Options | Recommendation | Status |
|----------|---------|---------------|--------|
| **Product framing** | Trip report tool vs existential fitness tracker | Both — "existential fitness tracker" for positioning, "consciousness capture" for research | Needs approval |
| **Non-substance capture** | Dedicated mode vs same flow | Same flow — the method taxonomy already includes meditation, yoga, fasting, etc. Add well-being dimensions to make it feel like more than a trip tool. | Needs approval |
| **Voice: recording vs text** | Raw audio vs voice-to-text vs both | Both as options. See PRD §13.4. | Open |
| **Multiple voice notes** | Single recording vs Whispr Flow model | Whispr Flow model for v0.4. Multiple timestamped notes per session. | Needs approval |
| **Somatic emotion mapping** | Binary body map vs paintable heat map | Current 3-level intensity map is good for MVP. Paintable heat map is a Diary/v1.0 feature. | Recommended defer |
| **Retreat B2B mode** | Bake into Capture vs separate product | Same tool with a "facilitator mode" that creates sessions for participants. SDRF handles the aggregate view. | Needs scoping |
| **Insight detection** | Capture dimension vs Diary probing | Diary probing — insight requires guided exploration. Capture gets a single "Did you have a significant insight?" (yes/no) + optional description. | Recommended |
