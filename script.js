// AnotherPlayer landing — OS auto-detect + CTA URL swap.
// vanilla JS, framework 0, NPM 0. developed by external observation only.

const GITHUB_RELEASES_LATEST = 'https://github.com/Bbins-dev/AnotherPlayer/releases/latest';
const MAC_DMG_URL = 'https://github.com/Bbins-dev/AnotherPlayer/releases/latest/download/AnotherPlayer-1.0.0.dmg';
const WIN_SETUP_URL = 'https://github.com/Bbins-dev/AnotherPlayer/releases/latest/download/AnotherPlayer-Setup.exe';

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
    cta.href = GITHUB_RELEASES_LATEST;
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

applyCTA(detectOS());
wireToggles();
