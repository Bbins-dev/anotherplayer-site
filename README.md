# anotherplayer.com

Landing page for **AnotherPlayer** — native sample browser for Mac and Windows.

## Stack

- **Hosting**: Cloudflare Pages (auto-deploy from `main` branch)
- **Domain**: `anotherplayer.com` (Cloudflare DNS)
- **Binary host**: Cloudflare R2 (`download.anotherplayer.com`)
- **Build**: vanilla HTML/CSS/JS — no framework, no NPM, no runtime CDN
- **Font**: Geist Sans (SIL Open Font License 1.1, self-hosted woff2)
- **JS**: OS auto-detect + CTA URL swap + `DONATION_ENABLED` feature flag (donation modal deferred until backend go-live)

## Security posture

- No framework runtime (Next.js / React / Vue 의존성 0 → 관련 CVE 자동 회피)
- No NPM packages (supply chain attack surface 0)
- No external CDN runtime (Geist self-host, no Google Fonts runtime, no analytics)
- CSP meta tag (`default-src 'self'`, `script-src` allows `download.anotherplayer.com` release metadata, `connect-src` allows `api.binboxgames.com` for future donation flow)
- `textContent` instead of `innerHTML` for all dynamic content (XSS-safe even if R2 release metadata is tampered)
- Cloudflare proxy front (DDoS unlimited mitigation + WAF + Bot Fight Mode, free tier)
- Referrer-Policy + Permissions-Policy meta tags (privacy)

## License model

- **AnotherPlayer v1 is free for everyone** — personal, freelance, studio, commercial. No license key, no registration, no paywall for v1 features.
- Optional donation checkout launches with the v1.0 GA release. Until then, the `/pricing` page renders 6 donation tier buttons in coming-soon (aria-disabled) state. See `script.js` `DONATION_ENABLED` flag for the swap point.
- Contact: `contact@binboxgames.com`

## Copyright

© 2026 Binbox Games. Site source = MIT. Geist font (`fonts/*.woff2`) = SIL Open Font License 1.1 (see `fonts/OFL.txt`).

Developed by external observation only — no decompilation, no reverse engineering.
