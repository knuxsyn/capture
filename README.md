# Sensoria Experience Capture

Voice-first phenomenological data capture. Encrypted. Pseudonymous. Sovereign.

## What this is

A single-page web tool that helps people capture their experience of altered states of consciousness — psychedelics, breathwork, meditation, movement, fasting, or anything that shifted their awareness. The output is an encrypted `.sensoria.enc` file that belongs to the explorer. They decide whether to share it.

## Quick start

### Deploy

1. Create a repo at [github.com/new](https://github.com/new)
2. Upload `index.html`
3. Settings → Pages → Deploy from branch → `main` → `/ (root)` → Save
4. Share the live URL

### Custom domain (optional)

To serve at `capture.sensoriaresearch.org`:

1. In the repo: Settings → Pages → Custom domain → enter `capture.sensoriaresearch.org`
2. In DNS: add a CNAME record — `capture` → `yourusername.github.io`
3. Wait for HTTPS certificate (~30 min), then check "Enforce HTTPS"

See `capture-integration-handoff.md` for full details.

## How it works

The explorer opens the link on their phone. No install, no account.

1. **Vault.** Pick a handle and passphrase. That's identity.
2. **Voice.** Talk about what happened. One recording, as long as they want.
3. **Context.** Select methods (multi-select with per-compound dosing), setting, social context, date, intention, explorer typology, familiarity.
4. **Dimensions.** Intensity, emotional tone, ego dissolution, time perception.
5. **Body.** Tap regions with 3-level intensity. Note physical factors.
6. **Connection.** Self, others, world.
7. **Review.** Encrypt and save to device.
8. **Share.** Send the `.sensoria.enc` file on Signal.

Total time: 4–12 minutes with voice, 3–4 without.

## Security

- **No server.** Everything runs in the browser. No backend, no database, no analytics, no cookies.
- **AES-256-GCM.** Data is encrypted on-device before export. PBKDF2 key derivation with 310,000 iterations.
- **Pseudonymous.** Handle only. No email, phone, or OAuth.
- **Per-export randomness.** Each export uses a unique random salt and IV.
- **Voice opt-in.** Audio export is off by default with a biometric identification warning.
- **Burn.** One button clears all state. New handle, new passphrase, no trace.

## Data pipeline

Explorers send encrypted files via **Signal** to `+1-415-338-9092` (Sensoria Research). Passphrase shared separately — different message or in person.

No third-party form services. No metadata leakage. Two layers of encryption: passphrase + Signal E2EE.

## Decrypting captures

When you receive a `.sensoria.enc` file and the explorer's passphrase:

```javascript
async function decrypt(encBase64, passphrase) {
  const raw = Uint8Array.from(atob(encBase64), c => c.charCodeAt(0));
  const salt = raw.slice(0, 16);
  const iv = raw.slice(16, 28);
  const ct = raw.slice(28);
  const km = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(passphrase), "PBKDF2", false, ["deriveKey"]
  );
  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 310000, hash: "SHA-256" },
    km, { name: "AES-GCM", length: 256 }, false, ["decrypt"]
  );
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  return JSON.parse(new TextDecoder().decode(pt));
}
```

For encrypted voice files, same process but the output is an audio ArrayBuffer instead of JSON.

## Export schema

Each `.sensoria.enc` file contains a JSON object:

```
{
  _schema              Schema version
  _encryption          Encryption spec
  _instrument_refs     Validated instruments referenced
  captured_at          ISO timestamp
  explorer             Pseudonymous handle

  context
    methods[]          Array of {name, dose, is_primary}
    setting            Free text
    social_context     Solo | With a partner | Small group | etc.
    experience_date    ISO date
    intention          Free text
    explorer_typology  PPIA code (SCI/THE/SPI/IND/COG/NEO/REC/PHI/CLI)
    experience_frequency  first | few | experienced | deep

  voice
    has_recording      Boolean
    duration_seconds   Integer
    audio              "voice.enc" or "discarded"

  tier1
    arousal            0-100 (VAS)
    valence            0-100 (VAS)
    temporal           {value: -3 to 3, label: string}
    somatic            {regions: [{region, intensity: 1-3, intensity_label}], notes}

  physical_state
    factors[]          Array of strings
    notes              Free text

  tier2
    ego_dissolution    0-100 (VAS, EDI-8 proxy)
    connectedness      {self: 0-100, others: 0-100, world: 0-100}
}
```

## Method taxonomy

19 categories, 179 items covering: Classical Psychedelics · Plant Medicines · Empathogens · Dissociatives · Cannabis · Breathwork · Meditation · Movement · Sound & Frequency · Somatic & Bodywork · Sexual & Tantric · Fasting & Metabolic · Social & Relational · Sensory & Environmental · Extreme Environment & Ordeal · Pharmacological (Non-Psychedelic) · Dream & Liminal States · Endogenous & Spontaneous · Other

Includes Portugal-context compounds (4-AcO series, AL-LAD, ETH-LAD, ketamine isomers, GHB/GBL/BDO, cathinones, DCK, 3-MeO-PCP, pregabalin).

## Instrument references

| Instrument | Source | Use in Capture |
|-----------|--------|---------------|
| EDI-8 | Nour et al. 2017 | Single-item ego dissolution proxy |
| Watts Connectedness Scale | Watts et al. 2022 | Three single-item subscale proxies |
| 5D-ASC | Dittrich 1998 | Adapted temporal perception scale |
| PPIA | Sensoria Research | Single-item explorer typology |

All are single-item proxies, not full instrument deployments.

## Contributing

The tool improves through a measurement-driven autoresearch loop. See `sensoria-autoresearch-program.md` for the full protocol. The key metric is **Phenomenological Fidelity (PF)** — currently ~48%. Every change is evaluated against PF within a 7-minute friction budget.

## Related documents

| File | What it is |
|------|-----------|
| `CAPTURE-PRD.md` | Product requirements, user stories, edge cases, SDRF integration spec |
| `capture-backlog.md` | Feature backlog with PF scoring and prioritization rules |
| `sensoria-autoresearch-program.md` | Autoresearch loop, eval function, agent instructions |
| `capture-integration-handoff.md` | Website integration instructions |

---

*Sensoria Research · Sovereign psychonauts mapping consciousness through experience.*
