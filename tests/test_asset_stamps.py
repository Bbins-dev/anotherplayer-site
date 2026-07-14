"""자산 스탬프 ↔ 파일 내용 일치 강제.

배경 (2026-07-14 실사고): HTML 은 `max-age=0` 인데 style.css / script.js 는 `max-age=14400`
(4시간) 으로 캐시된다. 자산 URL 이 내용과 무관하게 고정이면 배포 직후 방문자가
**새 HTML + 묵은 CSS** 를 받아 레이아웃이 통째로 깨진다 (미니 플레이어 이미지가 250px 대신
1016px 로 렌더됨). 하드 리프레시로도 안 풀린다 — 엣지 캐시가 옛 파일을 돌려주면 그만이다.

그래서 `scripts/stamp_assets.py` 가 URL 에 내용 해시를 찍는데, **그걸 돌리는 걸 잊는 것**이
바로 다음 사고다. 이 테스트가 그 누락을 배포 전에 잡는다.
"""

import hashlib
import pathlib
import re

import pytest

ROOT = pathlib.Path(__file__).resolve().parent.parent

ASSETS = ["style.css", "script.js"]

# 스탬프를 달고 있어야 하는 모든 HTML (하위 페이지는 template 에서 생성된 결과물).
HTML_FILES = [
    "index.html",
    "scripts/template.html",
    "pricing/index.html",
    "privacy/index.html",
    "terms/index.html",
    "refund/index.html",
]


def expected_stamp(asset: str) -> str:
    return hashlib.sha256((ROOT / asset).read_bytes()).hexdigest()[:8]


@pytest.mark.parametrize("html_file", HTML_FILES)
@pytest.mark.parametrize("asset", ASSETS)
def test_asset_reference_carries_current_content_hash(html_file: str, asset: str) -> None:
    html = (ROOT / html_file).read_text()
    want = expected_stamp(asset)

    refs = re.findall(rf'(?:href|src)="/?{re.escape(asset)}(?:\?v=([0-9a-f]+))?"', html)
    assert refs, f"{html_file} 가 {asset} 를 참조하지 않는다 — 참조가 사라졌거나 경로가 바뀌었다."

    for got in refs:
        assert got == want, (
            f"{html_file} 의 {asset} 스탬프가 ?v={got or '(없음)'} 인데 "
            f"현재 파일 내용의 해시는 ?v={want} 다.\n"
            f"→ {asset} 를 고치고 `python3 scripts/stamp_assets.py` 를 안 돌렸다.\n"
            f"   스탬프가 어긋난 채 배포하면 방문자가 새 HTML + 묵은 CSS 를 받아 레이아웃이 깨진다."
        )
