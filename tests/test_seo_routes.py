"""SEO route contracts for Cloudflare Pages directory output."""

import pathlib
import re
import xml.etree.ElementTree as ET

from scripts.build_pages import PAGES


ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGE_SLUGS = {"pricing", "privacy", "refund", "terms"}


def test_generated_page_routes_match_cloudflare_trailing_slash_urls() -> None:
    assert {path for _, _, path in PAGES} == {f"/{slug}/" for slug in PAGE_SLUGS}

    for slug in PAGE_SLUGS:
        html = (ROOT / slug / "index.html").read_text()
        assert f'href="https://anotherplayer.com/{slug}/"' in html


def test_sitemap_contains_only_final_canonical_urls() -> None:
    sitemap = ET.parse(ROOT / "sitemap.xml")
    locations = {
        element.text
        for element in sitemap.findall("{http://www.sitemaps.org/schemas/sitemap/0.9}url/{http://www.sitemaps.org/schemas/sitemap/0.9}loc")
    }

    assert locations == {
        "https://anotherplayer.com/",
        *(f"https://anotherplayer.com/{slug}/" for slug in PAGE_SLUGS),
    }


def test_internal_links_do_not_target_redirecting_page_routes() -> None:
    route_without_trailing_slash = re.compile(
        r'href="/(?:pricing|privacy|refund|terms)(?:["#])'
    )
    sources = [
        ROOT / "index.html",
        ROOT / "scripts" / "template.html",
        ROOT / "content" / "pricing.md",
    ]

    for source in sources:
        assert route_without_trailing_slash.search(source.read_text()) is None


def test_download_cta_does_not_expose_r2_bucket_root() -> None:
    r2_root_href = 'href="https://download.anotherplayer.com/"'
    assert r2_root_href not in (ROOT / "content" / "pricing.md").read_text()
    pricing_html = (ROOT / "pricing" / "index.html").read_text()
    assert r2_root_href not in pricing_html
    assert 'href="/pricing/#download-platforms"' in pricing_html
    assert 'id="download-platforms"' in pricing_html
    assert "const DOWNLOAD_LATEST = 'https://download.anotherplayer.com/';" not in (
        ROOT / "script.js"
    ).read_text()
