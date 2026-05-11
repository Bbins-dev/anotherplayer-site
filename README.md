# anotherplayer.com

Landing page for [AnotherPlayer](https://github.com/Bbins-dev/AnotherPlayer) — native sample browser for Mac and Windows.

## Stack

- **Hosting**: GitHub Pages (user/org site, auto-deploy from `main`)
- **Domain**: `anotherplayer.com` (CNAME)
- **Build**: vanilla HTML/CSS/JS — no framework, no NPM, no runtime CDN
- **Font**: [Geist Sans](https://vercel.com/font) — SIL Open Font License 1.1, self-hosted woff2 (latin subset)
- **JS**: ~30 lines (OS auto-detect + CTA URL swap)

## Security posture

- No framework runtime (Next.js / React / Vue 의존성 0 → 관련 CVE 자동 회피)
- No NPM packages (supply chain attack surface 0)
- No external CDN runtime (Geist self-host, no Google Fonts runtime, no analytics)
- CSP meta tag (`default-src 'self'`, only `api.github.com` allowed for releases fetch)
- Referrer-Policy + Permissions-Policy meta tags (privacy)

## License

- Site source (HTML/CSS/JS) = MIT
- Geist font (`fonts/*.woff2`) = SIL Open Font License 1.1 (see `fonts/OFL.txt`)

Developed by external observation only — no decompilation, no reverse engineering.
