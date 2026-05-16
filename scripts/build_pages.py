"""Build static HTML pages from Markdown source.

Usage:
    python scripts/build_pages.py

Reads content/{pricing,terms,privacy,refund}.md → outputs
{pricing,terms,privacy,refund}/index.html using scripts/template.html.

Sanitization via bleach. Allowed tags = safe semantic HTML only.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

import bleach
import markdown

# 스크립트/이벤트 핸들러 계열 태그는 content 포함 통째 제거 (bleach strip=True 는 태그만 벗기고 텍스트 보존)
_DANGEROUS_TAGS_RE = re.compile(
    r"<(script|style|iframe|object|embed|form|input|button|textarea|select)"
    r"[\s\S]*?</\1>",
    re.IGNORECASE,
)


ALLOWED_TAGS = [
    "p", "h1", "h2", "h3", "h4", "h5", "h6",
    "a", "strong", "em", "code", "pre", "blockquote",
    "ul", "ol", "li",
    "table", "thead", "tbody", "tr", "th", "td",
    "hr", "br",
    "div", "span", "article",
]
ALLOWED_ATTRIBUTES = {
    "*": ["class"],
    "a": ["href", "title", "rel", "id", "data-os", "data-donation-tier", "aria-disabled"],
    "div": ["class", "id", "aria-label"],
    "article": ["class"],
    "span": ["class", "aria-hidden"],
    "table": ["class"],
    "th": ["scope"],
}
ALLOWED_PROTOCOLS = ["https", "mailto"]


def render_markdown(md_text: str) -> str:
    """Markdown → sanitized HTML.

    Two-pass sanitization:
    1. Pre-strip: dangerous tag families (script/style/iframe/…) removed
       *with* their text content — bleach strip=True 는 태그만 벗기고
       텍스트를 살리므로 XSS text content 차단에 불충분.
    2. bleach.clean: 나머지 허용 태그 외 태그 제거 + 속성/프로토콜 허용목록.
    """
    raw = markdown.markdown(
        md_text,
        extensions=["tables", "fenced_code", "toc"],
    )
    # Pass 1 — content-inclusive strip of dangerous tag families
    pre_stripped = _DANGEROUS_TAGS_RE.sub("", raw)
    # Pass 2 — attribute/protocol allowlist via bleach
    clean = bleach.clean(
        pre_stripped,
        tags=ALLOWED_TAGS,
        attributes=ALLOWED_ATTRIBUTES,
        protocols=ALLOWED_PROTOCOLS,
        strip=True,
    )
    return clean


def build_page(
    *,
    content_path: Path,
    template_path: Path,
    output_path: Path,
    title: str,
    path: str,
) -> None:
    """Read content/<name>.md + template.html → output <name>/index.html."""
    md_text = content_path.read_text(encoding="utf-8")
    body_html = render_markdown(md_text)

    template = template_path.read_text(encoding="utf-8")
    rendered = (
        template
        .replace("{{title}}", title)
        .replace("{{path}}", path)
        .replace("{{slug}}", content_path.stem)
        .replace("{{content}}", body_html)
    )

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(rendered, encoding="utf-8")


PAGES = [
    ("pricing", "Pricing — AnotherPlayer", "/pricing"),
    ("terms", "Terms of Service — AnotherPlayer", "/terms"),
    ("privacy", "Privacy Policy — AnotherPlayer", "/privacy"),
    ("refund", "Refund Policy — AnotherPlayer", "/refund"),
]


def main() -> int:
    repo_root = Path(__file__).resolve().parent.parent
    content_dir = repo_root / "content"
    template_path = repo_root / "scripts" / "template.html"

    if not template_path.exists():
        print(f"template.html not found: {template_path}", file=sys.stderr)
        return 1

    for name, title, path in PAGES:
        content_path = content_dir / f"{name}.md"
        if not content_path.exists():
            print(f"skip {name}: {content_path} not found", file=sys.stderr)
            continue
        output_path = repo_root / name / "index.html"
        build_page(
            content_path=content_path,
            template_path=template_path,
            output_path=output_path,
            title=title,
            path=path,
        )
        print(f"built {output_path.relative_to(repo_root)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
