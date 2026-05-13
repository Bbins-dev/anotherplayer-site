"""Tests for build_pages.py — TDD first."""

import sys
from pathlib import Path

# Add scripts/ to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

from build_pages import render_markdown, build_page  # noqa: E402


def test_render_markdown_renders_basic():
    """Markdown → HTML conversion."""
    md = "# Hello\n\nWorld"
    html = render_markdown(md)
    assert "<h1>Hello</h1>" in html
    assert "<p>World</p>" in html


def test_render_markdown_sanitizes_script():
    """bleach sanitize must strip <script> tags."""
    md = "Normal text\n\n<script>alert('xss')</script>\n\nMore text"
    html = render_markdown(md)
    assert "<script>" not in html.lower()
    assert "alert" not in html  # text content of script also stripped
    assert "Normal text" in html
    assert "More text" in html


def test_render_markdown_allows_safe_tags():
    """Safe tags (p, h1-h6, a, ul, ol, li, table) must remain."""
    md = "# Title\n\n[Link](https://example.com)\n\n- Item 1\n- Item 2"
    html = render_markdown(md)
    assert "<h1>" in html
    assert '<a href="https://example.com">' in html
    assert "<ul>" in html
    assert "<li>" in html


def test_build_page_merges_template(tmp_path):
    """build_page reads content/<name>.md + template.html → outputs <name>/index.html."""
    # Setup fixture
    content_dir = tmp_path / "content"
    content_dir.mkdir()
    (content_dir / "pricing.md").write_text("# Pricing\n\nSimple.")

    scripts_dir = tmp_path / "scripts"
    scripts_dir.mkdir()
    (scripts_dir / "template.html").write_text(
        "<html><head><title>{{title}}</title></head>"
        "<body><main>{{content}}</main></body></html>"
    )

    out_dir = tmp_path / "pricing"
    out_dir.mkdir()

    # Execute
    build_page(
        content_path=content_dir / "pricing.md",
        template_path=scripts_dir / "template.html",
        output_path=out_dir / "index.html",
        title="Pricing — AnotherPlayer",
        path="/pricing",
    )

    # Verify
    out_html = (out_dir / "index.html").read_text()
    assert "<title>Pricing — AnotherPlayer</title>" in out_html
    assert "<h1>Pricing</h1>" in out_html
    assert "<p>Simple.</p>" in out_html


def test_build_page_replaces_path(tmp_path):
    """build_page replaces {{path}} with the per-page path string."""
    content_dir = tmp_path / "content"
    content_dir.mkdir()
    (content_dir / "pricing.md").write_text("# Pricing")

    scripts_dir = tmp_path / "scripts"
    scripts_dir.mkdir()
    (scripts_dir / "template.html").write_text(
        '<link rel="canonical" href="https://anotherplayer.com{{path}}">'
        "<title>{{title}}</title>"
        "<main>{{content}}</main>"
    )

    out_path = tmp_path / "pricing" / "index.html"
    out_path.parent.mkdir()

    build_page(
        content_path=content_dir / "pricing.md",
        template_path=scripts_dir / "template.html",
        output_path=out_path,
        title="Pricing — AnotherPlayer",
        path="/pricing",
    )

    out_html = out_path.read_text()
    assert 'href="https://anotherplayer.com/pricing"' in out_html
    assert "{{path}}" not in out_html  # placeholder fully replaced
