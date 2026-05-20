// AnotherPlayer landing — OS auto-detect + CTA URL swap + (future) donation tier launch.
// vanilla JS, framework 0, NPM 0. developed by external observation only.

// Binary host = Cloudflare R2 (download.anotherplayer.com subdomain → R2 binding).
// Fallback is used only when R2 latest.js fails to load. release.yml updates latest.js.
const RELEASE_FALLBACK = {
  version: '1.0.17',
  macDmgUrl: 'https://download.anotherplayer.com/AnotherPlayer-1.0.17.dmg',
  winSetupUrl: 'https://download.anotherplayer.com/AnotherPlayer-1.0.17-Setup.exe',
};
const DOWNLOAD_LATEST = 'https://download.anotherplayer.com/';

// Backend API (Cloudflare Workers). Used by donation flow once enabled.
const API_BASE = 'https://api.binboxgames.com';

// ── Donation (Paddle.js) ────────────────────────────────────────────────────
// Fixed tiers ($5~$199): client-side Paddle.Checkout.open({ items: [{ priceId }] }).
// Custom tier: POST /license/donation/checkout → { transactionId } →
//   Paddle.Checkout.open({ transactionId }).
// Paddle.js client-side token is public-by-design (authenticates the SDK only).
//
// SANDBOX → PRODUCTION: before go-live, set PADDLE_ENVIRONMENT='production',
// replace PADDLE_CLIENT_TOKEN with the production token, and replace each
// DONATION_TIERS price ID with the production catalog price ID.
const PADDLE_ENVIRONMENT = 'sandbox';
const PADDLE_CLIENT_TOKEN = 'REPLACE_WITH_PADDLE_CLIENT_TOKEN';
const DONATION_TIERS = {
  '5': 'pri_REPLACE_5',
  '10': 'pri_REPLACE_10',
  '25': 'pri_REPLACE_25',
  '50': 'pri_REPLACE_50',
  '99': 'pri_REPLACE_99',
  '199': 'pri_REPLACE_199',
};
const DONATION_MIN_USD = 1;
const DONATION_MAX_USD = 9999;

let paddleReady = false;

// Task 9 가 wireDonationTiers 를 교체하면서 제거할 tombstone — 그때까지 기존
// wireDonationTiers 의 DONATION_ENABLED 참조가 ReferenceError 를 던지지 않게 유지한다.
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
  // pricing Free 카드의 현재 빌드 표시 — 랜딩 hero 와 같은 R2 latest.js 소스.
  const versionNum = document.querySelector('.pricing-version-num');
  if (versionNum && release.version) {
    versionNum.textContent = release.version;
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

// Paddle.js 는 donation 그리드가 있는 페이지 (pricing) 에서만 로드한다.
function loadPaddle() {
  if (!document.querySelector('.donate-tier-grid')) return;
  const s = document.createElement('script');
  s.src = 'https://cdn.paddle.com/paddle/v2/paddle.js';
  s.async = true;
  s.onload = () => {
    if (PADDLE_ENVIRONMENT === 'sandbox') Paddle.Environment.set('sandbox');
    Paddle.Initialize({ token: PADDLE_CLIENT_TOKEN });
    paddleReady = true;
  };
  document.head.appendChild(s);
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
