# Sensoria Experience Capture

Voice-first phenomenological data capture with client-side encryption. Zero-knowledge. Pseudonymous. Sovereign.

## Deploy in 90 seconds

1. Create a GitHub repo at [github.com/new](https://github.com/new) (e.g. `experience-capture`)
2. Upload `index.html` and this `README.md`
3. Settings → Pages → Source: "Deploy from a branch" → `main` → `/ (root)` → Save
4. Your link goes live at `https://yourusername.github.io/experience-capture/`
5. Share the link. That's it.

## Security model

| Layer | Implementation |
|-------|---------------|
| **Identity** | Pseudonymous handles only. No email, phone, or OAuth. |
| **Encryption** | AES-256-GCM via Web Crypto API. PBKDF2 key derivation (310,000 iterations). |
| **Storage** | Zero server-side storage. No database, no backend, no analytics. |
| **Per-file keys** | Each export uses random salt + IV. Same passphrase produces different ciphertext each time. |
| **Audio sovereignty** | Explorer chooses whether to include encrypted voice files or discard audio entirely. |
| **Burn capability** | Destroy vault and start fresh at any time. New handle, new passphrase, new identity. |

**Threat model disclosure:** Data is protected in the app and in transit (encrypted files are safe to share over any channel). The passphrase is the sole key — we cannot recover it. Browser extensions or compromised devices remain outside the trust boundary.

## What it captures

| Dimension | Instrument Reference | Format |
|-----------|---------------------|--------|
| Voice narrative | Freeform phenomenological capture | Encrypted .webm (optional) |
| Explorer typology | PPIA-lite (9 psychonaut types) | Single select |
| Experience frequency | Expertise classification signal | 4-point ordinal |
| Arousal / Intensity | Tier 1 VAS primitive | 0–100 |
| Valence | Tier 1 VAS primitive | 0–100 |
| Temporal perception | Adapted from 5D-ASC (Dittrich 1998) | 7-point categorical |
| Ego dissolution | EDI-8 proxy (Nour et al. 2017) | 0–100 |
| Somatic body map | Tier 1 interoceptive/proprioceptive | Region selection + notes |
| Connectedness: Self | Watts Scale proxy (Watts et al. 2022) | 0–100 |
| Connectedness: Others | Watts Scale proxy (Watts et al. 2022) | 0–100 |
| Connectedness: World | Watts Scale proxy (Watts et al. 2022) | 0–100 |

## Certification program integration

This tool sits at the **Tier 0 → Tier 1 boundary** of the Psychonaut Certification Program:

- **PPIA-lite typology** — single-item proxy for the full 30-item Psychonaut Profile Identification Assessment. Tags every capture with an explorer archetype (SCI, THE, SPI, IND, COG, NEO, REC, PHI, CLI) for research stratification.
- **Experience frequency** — produces the exposure data the Psychonaut Expertise Survey uses for classification (first time → deep practitioner).
- **Certification CTA** — post-export screen seeds the Tier 0 → Tier 1 conversion at peak engagement.
- **Data contribution** — every completed capture is a research contribution, which maps to the "contribution token" concept in the certification economic model.

## File format

Exports are `.sensoria.enc` files — base64-encoded AES-256-GCM ciphertext. Structure: `[16-byte salt][12-byte IV][ciphertext]`. Decryption requires the explorer's passphrase + PBKDF2 derivation with matching parameters.

## Decryption (for researchers)

```javascript
async function decrypt(encBase64, passphrase) {
  const raw = Uint8Array.from(atob(encBase64), c => c.charCodeAt(0));
  const salt = raw.slice(0, 16);
  const iv = raw.slice(16, 28);
  const ct = raw.slice(28);
  const km = await crypto.subtle.importKey("raw", new TextEncoder().encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: 310000, hash: "SHA-256" }, km, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  return JSON.parse(new TextDecoder().decode(pt));
}
```

---

*Sensoria Research · Sovereign explorers mapping consciousness together.*
