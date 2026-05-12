# anotherplayer.com

Landing page for **AnotherPlayer** — native sample browser for Mac and Windows.

## Stack

- **Hosting**: Cloudflare Pages (auto-deploy from `main` branch)
- **Domain**: `anotherplayer.com` (Cloudflare DNS)
- **Binary host**: Cloudflare R2 (`download.anotherplayer.com`)
- **Build**: vanilla HTML/CSS/JS — no framework, no NPM, no runtime CDN
- **Font**: Geist Sans (SIL Open Font License 1.1, self-hosted woff2)
- **JS**: ~50 lines (OS auto-detect + CTA URL swap + commercial license link)

## Security posture

- No framework runtime (Next.js / React / Vue 의존성 0 → 관련 CVE 자동 회피)
- No NPM packages (supply chain attack surface 0)
- No external CDN runtime (Geist self-host, no Google Fonts runtime, no analytics)
- CSP meta tag (`default-src 'self'`, only `api.binboxgames.com` allowed)
- Cloudflare proxy front (DDoS unlimited mitigation + WAF + Bot Fight Mode, free tier)
- Referrer-Policy + Permissions-Policy meta tags (privacy)

## License model

- **Personal use**: free forever
- **Commercial use**: paid commercial license required (Resonic-style honor + light key activation, see M-6 spec)
- Contact: `contact@binboxgames.com`

## Copyright

© 2026 Binbox Games. Site source = MIT. Geist font (`fonts/*.woff2`) = SIL Open Font License 1.1 (see `fonts/OFL.txt`).

Developed by external observation only — no decompilation, no reverse engineering.
