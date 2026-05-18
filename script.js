// AnotherPlayer landing — OS auto-detect + CTA URL swap + (future) donation tier launch.
// vanilla JS, framework 0, NPM 0. developed by external observation only.

// Binary host = Cloudflare R2 (download.anotherplayer.com subdomain → R2 binding).
// Fallback is used only when R2 latest.js fails to load. release.yml updates latest.js.
const RELEASE_FALLBACK = {
  version: '1.0.13',
  macDmgUrl: 'https://download.anotherplayer.com/AnotherPlayer-1.0.13.dmg',
  winSetupUrl: 'https://download.anotherplayer.com/AnotherPlayer-1.0.13-Setup.exe',
};
const DOWNLOAD_LATEST = 'https://download.anotherplayer.com/';

// Backend API (Cloudflare Workers). Used by donation flow once enabled.
const API_BASE = 'https://api.binboxgames.com';

// ── Donation feature flag ───────────────────────────────────────────────────
// v1 ships as freeware-only. Donation backend code is complete (Phase B —
// donation_checkout.ts + issue.ts donation branch + DONATION_TIERS + D1 0004).
// What's missing for go-live (external ops only, not code):
//   1. Paddle dashboard: 6 donation products created → 6 price IDs received.
//   2. Cloudflare secrets injected (PADDLE_API_KEY, PADDLE_WEBHOOK_SECRET,
//      DONATION_PRICE_5USD / _10USD / _25USD / _50USD / _99USD / _CUSTOM).
//   3. D1 migration 0004 deployed to production.
//   4. Paddle webhook destination → POST /license/issue connected.
//   5. Sandbox E2E test passes (donation → email receipt → app banner).
// When all 5 done, flip DONATION_ENABLED to true. The pricing.md donation
// tier anchors already carry data-donation-tier="5|10|25|50|99|custom" so the
// click handler below (wireDonationTiers) wires up to the existing backend
// /license/email/{send-otp,verify-otp}/donation/checkout flow with zero
// markup change.
const DONATION_ENABLED = false;

function detectOS() {
  const platform = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || '';
  const ua = navigator.userAgent || '';
  if (/Mac|iPhone|iPad/i.test(platform) || /Mac OS X|Macintosh/.test(ua)) return 'mac';
  if (/Win/i.test(platform) || /Windows/.test(ua)) return 'win';
  return 'unknown';
}

function currentRelease() {
  return window.AnotherPlayerRelease || RELEASE_FALLBACK;
}

function applyReleaseMeta() {
  const release = currentRelease();
  const eyebrow = document.querySelector('.hero .eyebrow');
  if (eyebrow && release.version) {
    // textContent + literal middot (U+00B7) — XSS-safe even if release.version
    // is tampered with on the R2 bucket. Avoids innerHTML parsing.
    eyebrow.textContent = `v${release.version} · Free for everyone`;
  }
}

// /pricing 의 Free Download CTA — OS auto-detect + label swap.
// Hero CTA is static href="/pricing" + label "Download AnotherPlayer" so JS does not touch it.
// Only the label span receives a textContent update (arrow icon preserved).
function applyCTA(os) {
  const release = currentRelease();
  const freeCTA = document.getElementById('free-download-cta');
  if (!freeCTA) return;
  const freeLabel = freeCTA.querySelector('.cta-label');
  if (!freeLabel) return;
  if (os === 'mac') {
    freeCTA.href = release.macDmgUrl;
    freeLabel.textContent = 'Download for Mac';
  } else if (os === 'win') {
    freeCTA.href = release.winSetupUrl;
    freeLabel.textContent = 'Download for Win';
  } else {
    freeCTA.href = DOWNLOAD_LATEST;
    freeLabel.textContent = 'Download';
  }
}

function loadReleaseMeta() {
  const script = document.createElement('script');
  script.src = `https://download.anotherplayer.com/latest.js?cache=${Date.now()}`;
  script.async = true;
  script.onload = () => {
    applyReleaseMeta();
    applyCTA(detectOS());
  };
  document.head.appendChild(script);
}

function wireOSToggle() {
  const links = document.querySelectorAll('.toggle-link');
  if (!links.length) return;
  const setActive = (os) => {
    links.forEach((l) => l.classList.toggle('active', l.dataset.os === os));
  };
  links.forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const os = link.dataset.os;
      applyCTA(os);
      setActive(os);
    });
  });
  setActive(detectOS());
}

// ── Donation tier click handler (active only when DONATION_ENABLED) ─────────
// Mirrors the buy-modal state machine pattern: email → OTP → /donation/checkout
// with {sessionId, tier} → Paddle hosted checkout URL. The modal markup +
// state machine implementation is deliberately deferred until the 5 go-live
// external ops above complete; this handler is the wire-up entry point that
// will open that modal.
function wireDonationTiers() {
  const tiers = document.querySelectorAll('.donate-tier');
  if (!tiers.length) return;
  tiers.forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      if (!DONATION_ENABLED) {
        // Coming-soon state: aria-disabled + cursor:not-allowed already signal this.
        // No further action; pricing.md `.donate-status` paragraph explains the timeline.
        return;
      }
      openDonateModal(el.dataset.donationTier);
    });
  });
}

// openDonateModal — opens the donation OTP + Paddle checkout flow.
// Implementation deferred until DONATION_ENABLED flips to true. When implementing:
//   - Mirror the previous commercial buy-modal state machine (3 steps: email → OTP → checkout)
//   - POST flow: /license/email/send-otp → /license/email/verify-otp → /license/donation/checkout {sessionId, tier}
//   - Returns checkoutUrl; window.open(checkoutUrl) in new tab.
//   - Reference: backend/license/src/handlers/donation_checkout.ts (already implemented + tested).
function openDonateModal(_tier) {
  // Intentionally a no-op until DONATION_ENABLED + modal markup land together.
  // Friends visiting today should never reach this path (button is aria-disabled).
}

applyReleaseMeta();
applyCTA(detectOS());
wireOSToggle();
wireDonationTiers();
loadReleaseMeta();
