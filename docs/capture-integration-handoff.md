# Experience Capture Tool — Website Integration Handoff

**For:** Operations lead
**From:** Knux
**Date:** March 2026

---

## What this is

A voice-first phenomenological data capture tool for Sensoria Research. It's a single HTML file hosted on GitHub Pages. We need it accessible from sensoriaresearch.org.

---

## Option A: Subdomain (RECOMMENDED)

**Result:** `capture.sensoriaresearch.org`
**Time:** ~15 minutes
**Why this is best:** Clean URL, no iframe jank, the tool runs full-screen on its own, works perfectly on mobile, no GHL limitations.

### Steps

1. **In the GitHub repo** (where index.html lives):
   - Go to Settings → Pages
   - Under "Custom domain", enter: `capture.sensoriaresearch.org`
   - Click Save
   - GitHub will create a CNAME file in the repo automatically

2. **In your DNS provider** (wherever sensoriaresearch.org's DNS is managed — likely your domain registrar or Cloudflare):
   - Add a **CNAME record**:
     - **Name / Host:** `capture`
     - **Value / Points to:** `YOUR_GITHUB_USERNAME.github.io`
     - **TTL:** 3600 (or "Auto")
   - If using Cloudflare, set proxy status to "DNS only" (grey cloud)

3. **Wait 5-30 minutes** for DNS propagation

4. **Back in GitHub** Settings → Pages:
   - Check "Enforce HTTPS" once the certificate provisions (may take up to 30 min)

5. **Test:** Open `https://capture.sensoriaresearch.org` on your phone. You should see the vault screen.

6. **Add a link on the main site:**
   - In GHL, edit the navigation menu or add a button/link wherever appropriate
   - Point it to: `https://capture.sensoriaresearch.org`
   - Suggested link text: "Capture" or "Share Your Experience"

---

## Option B: Embed via iframe on a GHL page

**Result:** `sensoriaresearch.org/capture`
**Time:** ~10 minutes
**Why you might want this:** Keeps everything under the main domain. But mobile UX is slightly worse (iframe scrolling quirks), and the microphone permission prompt can behave differently inside iframes.

### Steps

1. In GHL, create a **new page** with the URL slug: `capture`
2. Add a **Custom Code / HTML block** to the page
3. Paste this code:

```html
<div style="width:100%;max-width:480px;margin:0 auto;height:100vh;height:100dvh;">
  <iframe
    src="https://YOUR_GITHUB_USERNAME.github.io/REPO_NAME/"
    style="width:100%;height:100%;border:none;"
    allow="microphone"
    title="Sensoria Experience Capture"
  ></iframe>
</div>
```

4. Replace `YOUR_GITHUB_USERNAME` and `REPO_NAME` with the actual values
5. The `allow="microphone"` attribute is critical — without it, voice recording won't work
6. Set the page to full-width / no header-footer if GHL allows it
7. Publish and test on mobile

### ⚠️ Known iframe issues
- Some mobile browsers block microphone access inside iframes — test thoroughly
- If mic access fails, fall back to Option A (subdomain)
- The page will have GHL's header/footer unless you configure a blank template

---

## Option C: Simple redirect

**Result:** `sensoriaresearch.org/capture` redirects to GitHub Pages
**Time:** 5 minutes
**Why:** Fastest. The URL starts at your domain but lands on GitHub Pages.

### Steps

1. In GHL, create a new page with slug `capture`
2. Add a Custom Code block with:

```html
<script>window.location.href = "https://YOUR_GITHUB_USERNAME.github.io/REPO_NAME/";</script>
<p style="text-align:center;padding:40px;font-family:sans-serif;color:#666;">
  Redirecting to Experience Capture...
</p>
```

3. Publish. Anyone who visits sensoriaresearch.org/capture gets sent to the tool.

---

## My recommendation

**Go with Option A (subdomain).** It's the most professional, has zero UX compromises, and takes 15 minutes. The URL `capture.sensoriaresearch.org` is clean and shareable. Add a "Share Your Experience" link in the site nav pointing to it.

---

## What you need from Knux

- GitHub repo URL and username
- Access to DNS settings for sensoriaresearch.org (or tell Knux which DNS provider to log into)

## What you need from the DNS provider

- Ability to add a CNAME record for `capture.sensoriaresearch.org`

---

## Questions?

Ping Knux or email info@sensoriaresearch.org
