// AnotherPlayer landing — OS auto-detect + CTA URL swap.
// vanilla JS, framework 0, NPM 0. developed by external observation only.

// Binary host = Cloudflare R2 (download.anotherplayer.com subdomain → R2 binding).
// 사용자 URL 표면 통일 — GitHub URL 외부 노출 0.
const MAC_DMG_URL = 'https://download.anotherplayer.com/AnotherPlayer-1.0.0.dmg';
const WIN_SETUP_URL = 'https://download.anotherplayer.com/AnotherPlayer-1.0.0-Setup.exe';
const DOWNLOAD_LATEST = 'https://download.anotherplayer.com/';

// Commercial license storefront = Lemon Squeezy (M-6 storefront create 시점 URL 확정).
// 현재 = placeholder, M-6 진입 후 갱신 의무.
const COMMERCIAL_LICENSE_URL = 'mailto:contact@binboxgames.com?subject=Commercial%20license%20inquiry';

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

function wireCommercialLinks() {
  // Footer + nav 양쪽 동일 URL SSOT (Lemon Squeezy storefront, M-6 확정).
  const links = [
    document.getElementById('commercial-link'),
    document.getElementById('nav-buy'),
  ];
  for (const el of links) {
    if (el) el.href = COMMERCIAL_LICENSE_URL;
  }
}

applyCTA(detectOS());
wireToggles();
wireCommercialLinks();
