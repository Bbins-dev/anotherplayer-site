// AnotherPlayer landing — OS auto-detect + CTA URL swap + (future) donation tier launch.
// vanilla JS, framework 0, NPM 0. developed by external observation only.

// Binary host = Cloudflare R2 (download.anotherplayer.com subdomain → R2 binding).
// Fallback is used only when R2 latest.js fails to load. release.yml updates latest.js.
const RELEASE_FALLBACK = {
  version: '1.0.22',
  macDmgUrl: 'https://download.anotherplayer.com/AnotherPlayer-1.0.22.dmg',
  winSetupUrl: 'https://download.anotherplayer.com/AnotherPlayer-1.0.22-Setup.exe',
};
const DOWNLOAD_LATEST = 'https://download.anotherplayer.com/';

// Backend API (Cloudflare Workers). Used by the custom-amount donation flow.
const API_BASE = 'https://api.binboxgames.com';

// ── Donation (Paddle.js) ────────────────────────────────────────────────────
// Fixed tiers ($5~$200): client-side Paddle.Checkout.open({ items: [{ priceId }] }).
// Custom tier: POST /license/donation/checkout → { transactionId } →
//   Paddle.Checkout.open({ transactionId }).
// Paddle.js client-side token is public-by-design (authenticates the SDK only).
//
// Production (live) values — set for the v1.0.18 launch (2026-05-21). To test
// against the sandbox, set PADDLE_ENVIRONMENT='sandbox' and swap the token +
// DONATION_TIERS price IDs back to the sandbox catalog.
const PADDLE_ENVIRONMENT = 'production';
const PADDLE_CLIENT_TOKEN = 'live_1dfb738dd506c9ad43246b43fec';
const DONATION_TIERS = {
  '5': 'pri_01ks4j9y2svc1hsnk99dbvktm7',
  '10': 'pri_01ks4j9yc50vfymarhcy29q402',
  '15': 'pri_01ks4j9yrfk3zcyrx2mrmmwncx',
  '25': 'pri_01ks4j9zbn49mr1h2w3yh39hga',
  '50': 'pri_01ks4j9zysck8z05qedp005gem',
  '100': 'pri_01ks4ja0v6xzrf4wgcdngyxfgt',
  '200': 'pri_01ks4ja1f70tpn3ebt3t0d8g9h',
};
const DONATION_MIN_USD = 1;
const DONATION_MAX_USD = 9999;

let paddleReady = false;

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

// ── Donation checkout ───────────────────────────────────────────────────────
function openFixedCheckout(tier) {
  const priceId = DONATION_TIERS[tier];
  if (!priceId || !paddleReady) return;
  Paddle.Checkout.open({
    items: [{ priceId, quantity: 1 }],
    customData: { donation: true, tier },
  });
}

// custom 금액 — backend 가 non-catalog draft transaction 을 만들고 transactionId 반환.
async function openCustomCheckout(amountUsd) {
  const amountCents = Math.round(amountUsd * 100);
  let res;
  try {
    res = await fetch(API_BASE + '/license/donation/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amountCents }),
    });
  } catch {
    return false;
  }
  if (!res.ok) return false;
  const data = await res.json().catch(() => null);
  if (!data || !data.transactionId || !paddleReady) return false;
  Paddle.Checkout.open({ transactionId: data.transactionId });
  return true;
}

// donation tier 버튼 wiring. custom 금액 입력 UI 는 JS 가 DOM API 로 생성한다 —
// build_pages.py 가 <input> 태그를 strip 하므로 markdown 에 둘 수 없고,
// innerHTML 대신 createElement 를 쓴다 (기존 script.js 의 XSS-safe 스타일).
function wireDonationTiers() {
  const grid = document.querySelector('.donate-tier-grid');
  if (!grid) return;

  const customBox = document.createElement('div');
  customBox.className = 'donate-custom';
  customBox.hidden = true;

  const input = document.createElement('input');
  input.type = 'number';
  input.className = 'donate-custom-input';
  input.min = String(DONATION_MIN_USD);
  input.max = String(DONATION_MAX_USD);
  input.step = '1';
  input.placeholder = 'Amount (USD)';
  input.setAttribute('aria-label', 'Custom donation amount in US dollars');

  const goBtn = document.createElement('button');
  goBtn.type = 'button';
  goBtn.className = 'donate-custom-go';
  goBtn.textContent = 'Donate';

  customBox.append(input, goBtn);
  grid.insertAdjacentElement('afterend', customBox);

  grid.querySelectorAll('.donate-tier').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      const tier = el.dataset.donationTier;
      if (tier === 'custom') {
        customBox.hidden = !customBox.hidden;
        if (!customBox.hidden) input.focus();
      } else {
        // 고정 tier 선택 시 custom 입력란 숨김 — custom 상태에서만 보이도록.
        customBox.hidden = true;
        openFixedCheckout(tier);
      }
    });
  });

  goBtn.addEventListener('click', () => {
    // Paddle.js 아직 로드 전이면 backend 왕복을 낭비하지 않고 즉시 안내.
    if (!paddleReady) {
      input.setCustomValidity('Payment is still loading — please try again in a moment.');
      input.reportValidity();
      return;
    }
    const amount = Number(input.value);
    if (!Number.isFinite(amount) || amount < DONATION_MIN_USD || amount > DONATION_MAX_USD) {
      input.setCustomValidity(`Enter an amount between $${DONATION_MIN_USD} and $${DONATION_MAX_USD}.`);
      input.reportValidity();
      return;
    }
    input.setCustomValidity('');
    goBtn.disabled = true;
    openCustomCheckout(amount)
      .then((ok) => {
        if (!ok) {
          // checkout 생성 실패 — silent fail 금지, 사용자에게 안내.
          input.setCustomValidity('Could not start checkout — please try again.');
          input.reportValidity();
        }
      })
      .finally(() => { goBtn.disabled = false; });
  });
}

applyReleaseMeta();
applyCTA(detectOS());
wireOSToggle();
loadPaddle();
wireDonationTiers();
loadReleaseMeta();
