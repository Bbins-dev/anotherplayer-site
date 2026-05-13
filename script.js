// AnotherPlayer landing — OS auto-detect + CTA URL swap.
// vanilla JS, framework 0, NPM 0. developed by external observation only.

// Binary host = Cloudflare R2 (download.anotherplayer.com subdomain → R2 binding).
// 사용자 URL 표면 통일 — GitHub URL 외부 노출 0.
const MAC_DMG_URL = 'https://download.anotherplayer.com/AnotherPlayer-1.0.1.dmg';
const WIN_SETUP_URL = 'https://download.anotherplayer.com/AnotherPlayer-1.0.1-Setup.exe';
const DOWNLOAD_LATEST = 'https://download.anotherplayer.com/';

// Commercial license backend = Cloudflare Workers (M-6 backend).
// Modal 안 fetch 호출 진입점 SSOT (B.5 state machine 에서 사용).
const API_BASE = 'https://api.binboxgames.com';

function detectOS() {
  const platform = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || '';
  const ua = navigator.userAgent || '';
  if (/Mac|iPhone|iPad/i.test(platform) || /Mac OS X|Macintosh/.test(ua)) return 'mac';
  if (/Win/i.test(platform) || /Windows/.test(ua)) return 'win';
  return 'unknown';
}

function applyCTA(os) {
  const cta = document.getElementById('cta');
  const label = document.getElementById('cta-label');
  if (!cta || !label) return;
  if (os === 'mac') {
    cta.href = MAC_DMG_URL;
    label.textContent = 'Download for Mac';
  } else if (os === 'win') {
    cta.href = WIN_SETUP_URL;
    label.textContent = 'Download for Windows';
  } else {
    cta.href = DOWNLOAD_LATEST;
    label.textContent = 'Download';
  }
}

function wireToggles() {
  const winToggle = document.getElementById('toggle-win');
  const macToggle = document.getElementById('toggle-mac');
  if (winToggle) {
    winToggle.addEventListener('click', (e) => { e.preventDefault(); applyCTA('win'); });
  }
  if (macToggle) {
    macToggle.addEventListener('click', (e) => { e.preventDefault(); applyCTA('mac'); });
  }
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

// Placeholder — actual state machine defined in B.5 (state machine + fetch wrappers).
function resetModalToStep(_n) {
  // No-op for now; B.5 implements step navigation.
}

function wireBuyModal() {
  const navBuy = document.getElementById('nav-buy');
  if (navBuy) {
    navBuy.addEventListener('click', (e) => {
      e.preventDefault();
      openBuyModal();
    });
  }
  // ?buy=1 query string → auto-open (외부 링크 진입점, 결제 redirect 복귀 등).
  if (new URLSearchParams(window.location.search).get('buy') === '1') {
    openBuyModal();
  }
}

applyCTA(detectOS());
wireToggles();
wireBuyModal();
