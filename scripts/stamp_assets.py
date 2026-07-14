#!/usr/bin/env python3
"""자산 URL 에 내용 해시를 찍는다 (cache-busting fingerprint).

왜 필요한가 (2026-07-14 실사고):
    Cloudflare Pages 는 HTML 을 `max-age=0, must-revalidate` 로, style.css / script.js 를
    `max-age=14400`(4시간) 으로 서빙한다. 그런데 자산 URL 은 내용이 바뀌어도 그대로다.
    → 배포 직후 방문자는 **새 HTML + 4시간 묵은 CSS** 를 받는다. 새 HTML 이 참조하는
      클래스가 옛 CSS 에 없으니 레이아웃이 통째로 깨진다 (미니 플레이어 이미지가
      250px 대신 1016px 로 렌더된 실사고).
    사용자 하드 리프레시로도 안 풀린다 — 브라우저 캐시를 지워도 엣지 캐시가 옛 파일을
    돌려주면 그만이다.

    캐시 헤더를 만지는 건 증상 처리다. URL 이 내용을 따라 바뀌면 브라우저든 엣지든
    옛것을 줄 *방법이 없다* — 그게 근본 해결이고 산업 표준(asset fingerprinting)이다.

멱등: 이미 찍힌 스탬프는 새 해시로 교체된다. CSS/JS 를 고친 뒤 이 스크립트를 다시 돌린다.
누락 방지: tests/test_asset_stamps.py 가 스탬프↔파일 내용 일치를 강제한다 (안 돌리면 red).
"""

import hashlib
import pathlib
import re
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent

# (자산 파일, HTML 안에서 그 자산을 가리키는 패턴)
#   그룹 1 = 스탬프 직전까지의 경로. 기존 ?v=... 는 있어도 없어도 매칭 (멱등).
ASSETS = [
    ("style.css", re.compile(r'(href="/?style\.css)(\?v=[0-9a-f]+)?(")')),
    ("script.js", re.compile(r'(src="/?script\.js)(\?v=[0-9a-f]+)?(")')),
]

# 스탬프를 찍을 HTML. 하위 페이지(pricing/privacy/terms/refund)는 template 에서 생성되므로
# template 만 찍고 build_pages.py 로 재생성한다 (SSOT 유지).
TARGETS = ["index.html", "scripts/template.html"]


def content_hash(path: pathlib.Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()[:8]


def main() -> int:
    stamps = {name: content_hash(ROOT / name) for name, _ in ASSETS}

    for target in TARGETS:
        p = ROOT / target
        html = p.read_text()
        for name, pattern in ASSETS:
            html = pattern.sub(rf"\g<1>?v={stamps[name]}\g<3>", html)
        p.write_text(html)
        print(f"stamped {target}")

    for name, h in stamps.items():
        print(f"  {name} -> ?v={h}")

    # 하위 페이지 재생성 — template 의 스탬프가 반영돼야 한다.
    subprocess.run([sys.executable, str(ROOT / "scripts" / "build_pages.py")], check=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
