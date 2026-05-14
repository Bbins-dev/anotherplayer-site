// AnotherPlayer landing — OS auto-detect + CTA URL swap.
// vanilla JS, framework 0, NPM 0. developed by external observation only.

// Binary host = Cloudflare R2 (download.anotherplayer.com subdomain → R2 binding).
// fallback 은 R2 latest.js 로딩 실패 시만 사용. release.yml 이 latest.js 를 갱신한다.
const RELEASE_FALLBACK = {
  version: '1.0.4',
  macDmgUrl: 'https://download.anotherplayer.com/AnotherPlayer-1.0.4.dmg',
  winSetupUrl: 'https://download.anotherplayer.com/AnotherPlayer-1.0.4-Setup.exe',
};
const DOWNLOAD_LATEST = 'https://download.anotherplayer.com/';

// Commercial license backend = Cloudflare Workers (M-6 backend).
// Modal 안 fetch 호출 진입점 기준 (B.5 state machine 에서 사용).
const API_BASE = 'https://api.binboxgames.com';

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
    eyebrow.innerHTML = `v${release.version} &middot; Free for personal use`;
  }
}

// /pricing 의 Free Download CTA — OS auto-detect + label swap.
// Hero CTA 는 static href="/pricing" + label "Download AnotherPlayer" 이라 JS 영향 X.
// Label span 만 textContent 변경 (arrow icon 보존).
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

// Buy modal — nav-buy click 또는 ?buy=1 query 로 진입.
// 상태 머신 + fetch wrapper 는 B.5 에서 구현. 본 task = open trigger 만.
const buyModal = document.getElementById('buy-modal');

function openBuyModal() {
  if (!buyModal) return;
  resetModalToStep(1);
  buyModal.showModal();
}

function closeBuyModal() {
  if (!buyModal) return;
  buyModal.close();
}

// Modal state machine — B.5.
// 단일 buyState 객체 = 진행 중 email + sessionId + resend cooldown timer 기준.
// fetch wrapper postJson = credentials:'omit' (쿠키 0, 모든 인증은 명시적 sessionId payload).
const buyState = {
  email: '',
  sessionId: '',
  resendTimer: null,
};

function resetModalToStep(n) {
  buyState.email = '';
  buyState.sessionId = '';
  document.getElementById('email-1').value = '';
  document.getElementById('email-2').value = '';
  document.getElementById('otp-code').value = '';
  setError(1, '');
  setError(2, '');
  setError(3, '');
  showStep(n);
}

function showStep(n) {
  for (let i = 1; i <= 3; i++) {
    const sec = buyModal.querySelector(`.modal-step[data-step="${i}"]`);
    sec.hidden = i !== n;
  }
}

function setError(step, msg) {
  document.getElementById(`step${step}-error`).textContent = msg;
}

async function postJson(path, body) {
  const r = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'omit',
    body: JSON.stringify(body),
  });
  let data = null;
  try { data = await r.json(); } catch (_) { /* swallow */ }
  return { status: r.status, data };
}

function startResendCooldown() {
  const btn = document.getElementById('resend-btn');
  let remaining = 30;
  btn.disabled = true;
  btn.textContent = `Resend code (${remaining}s)`;
  if (buyState.resendTimer) clearInterval(buyState.resendTimer);
  buyState.resendTimer = setInterval(() => {
    remaining -= 1;
    if (remaining <= 0) {
      clearInterval(buyState.resendTimer);
      buyState.resendTimer = null;
      btn.disabled = false;
      btn.textContent = 'Resend code';
    } else {
      btn.textContent = `Resend code (${remaining}s)`;
    }
  }, 1000);
}

function wireBuyModal() {
  // [Buy commercial license] CTA on /pricing — primary modal trigger.
  // Anchor child onclick is stripped by sanitizer; div-level listener catches bubble.
  const buyCTA = document.getElementById('buy-commercial-cta');
  if (buyCTA) {
    buyCTA.addEventListener('click', (e) => {
      e.preventDefault();
      openBuyModal();
    });
  }
  // ?buy=1 query string → auto-open (외부 링크 진입점, 결제 redirect 복귀 등).
  if (new URLSearchParams(window.location.search).get('buy') === '1') {
    openBuyModal();
  }

  if (!buyModal) return;
  buyModal.addEventListener('click', async (e) => {
    const action = e.target.dataset?.action;
    if (!action) return;

    if (action === 'close') {
      closeBuyModal();
    } else if (action === 'send-otp' || action === 'resend-otp') {
      setError(1, '');
      const e1 = document.getElementById('email-1').value.trim();
      const e2 = document.getElementById('email-2').value.trim();
      if (!/^\S+@\S+\.\S+$/.test(e1)) { setError(1, 'Invalid email format'); return; }
      if (e1 !== e2) { setError(1, "Emails don't match"); return; }
      buyState.email = e1;
      const r = await postJson('/license/email/send-otp', { email: e1 });
      if (r.status === 429) { setError(1, 'Too many requests — please wait and try again.'); return; }
      if (r.status >= 400) { setError(1, 'Could not send code. Try again.'); return; }
      document.getElementById('email-display').textContent = e1;
      showStep(2);
      startResendCooldown();
    } else if (action === 'verify-otp') {
      setError(2, '');
      const code = document.getElementById('otp-code').value.trim();
      if (!/^\d{6}$/.test(code)) { setError(2, 'Enter the 6-digit code from the email'); return; }
      const r = await postJson('/license/email/verify-otp', { email: buyState.email, code });
      if (r.status === 400) {
        const map = { invalid_code: 'Incorrect code', expired: 'Code expired — request a new one', too_many_attempts: 'Too many attempts — request a new code' };
        setError(2, map[r.data?.error] ?? 'Invalid code');
        return;
      }
      if (r.status !== 200 || !r.data?.sessionId) { setError(2, 'Verification failed'); return; }
      buyState.sessionId = r.data.sessionId;
      document.getElementById('verified-email-display').textContent = buyState.email;
      showStep(3);
    } else if (action === 'continue-checkout') {
      setError(3, '');
      const r = await postJson('/license/email/checkout', { sessionId: buyState.sessionId });
      if (r.status !== 200 || !r.data?.checkoutUrl) { setError(3, 'Could not start checkout — please try again from Step 1'); return; }
      window.open(r.data.checkoutUrl, '_blank', 'noopener,noreferrer');
      closeBuyModal();
    } else if (action === 'back-to-step1') {
      showStep(1);
    } else if (action === 'back-to-step2') {
      showStep(2);
    }
  });
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

applyReleaseMeta();
applyCTA(detectOS());
wireOSToggle();
wireBuyModal();
loadReleaseMeta();
