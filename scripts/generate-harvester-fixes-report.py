#!/usr/bin/env python3
"""
Generate `docs/harvester-fixes-needed.md` — a structured report for Justin
listing catalog data-quality issues that need harvester-side attention.

Two classes of issue:
  A. STUB ROWS — catalog rows with no media data (youtube/tmdb/spotify/openLibrary
     all null). These render as broken/empty cards in modals.
  B. UNMATCHED MD ENTITIES — entities mentioned in YTA analysis MDs that have
     no catalog row at all. Can't be displayed.

Walks all 903 MDs in YTA's data folder, reuses patch-article-tags parser
to find unmatched entries.

Usage:
    python3 scripts/generate-harvester-fixes-report.py
"""
import importlib.util
import json
import sys
from collections import defaultdict
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
YTA_VIDEOS = Path("~/Desktop/my-claude/podcast-test/youtube-analysis-viewer/data/videos").expanduser()
CATALOG = REPO / "src" / "data" / "enriched-content-catalog.json"
OUT = REPO / "docs" / "harvester-fixes-needed.md"

# Import the patch-article-tags module to reuse its parser
spec = importlib.util.spec_from_file_location("patch", REPO / "scripts" / "patch-article-tags.py")
patch = importlib.util.module_from_spec(spec)
spec.loader.exec_module(patch)


def load_catalog():
    cat = json.loads(CATALOG.read_text(encoding="utf-8"))
    return cat.get("content") or cat.get("items") or []


def find_stubs(items):
    """Catalog rows where all media fields are null/empty AND row is film/tv-series.
    These are placeholder entities the harvester created without enriching."""
    stubs = []
    for r in items:
        t = (r.get("type") or "").lower()
        if t not in ("film", "tv-series", "tv-miniseries", "tv-special",
                     "tv-pilot", "documentary", "short-film"):
            continue
        if any([r.get("youtube"), r.get("tmdb"), r.get("spotify"),
                r.get("openLibrary"), r.get("soundtrack")]):
            continue
        stubs.append(r)
    return stubs


def find_unmatched(items):
    """Walk all 903 MDs, return per-video lists of unmatched works + dp entries."""
    unmatched_works = defaultdict(list)  # video_id → [(title, type, creator, video_title)]
    unmatched_dp = defaultdict(list)
    catalog_vids = set()
    for r in items:
        for s in (r.get("sources") or []):
            vid = s.get("video_id")
            if vid:
                catalog_vids.add(vid)

    md_files = sorted(YTA_VIDEOS.glob("*/analysis.md"))
    for md_path in md_files:
        try:
            md_text = md_path.read_text(encoding="utf-8")
        except Exception:
            continue
        meta = patch.parse_md_metadata(md_text)
        video_id = patch._derive_video_id(meta, md_path)
        if not video_id or video_id not in catalog_vids:
            continue
        video_title = meta.get("title") or video_id
        works, dp, _ = patch.parse_md(md_text)
        for title, kind, creator in works:
            row = patch.find_row(items, title, kind, creator)
            if not row:
                unmatched_works[video_id].append((title, kind, creator, video_title))
        for title, kind, category, creator in dp:
            row = patch.find_row(items, title, kind, creator)
            if not row:
                unmatched_dp[video_id].append((title, kind, category, creator, video_title))
    return unmatched_works, unmatched_dp


def write_report(stubs, unmatched_works, unmatched_dp):
    # Group stubs by type, sort by title
    stubs_by_type = defaultdict(list)
    for r in stubs:
        stubs_by_type[(r.get("type") or "").lower()].append(r)

    # Aggregate unmatched entities across all MDs (dedupe by title+type)
    works_dedup = defaultdict(list)  # (title, type) → [video_titles]
    for vid, entries in unmatched_works.items():
        for title, kind, creator, vt in entries:
            key = (title, kind or "(no type)")
            works_dedup[key].append(vt)

    dp_dedup = defaultdict(list)
    for vid, entries in unmatched_dp.items():
        for title, kind, category, creator, vt in entries:
            key = (title, kind or "(no type)")
            dp_dedup[key].append(vt)

    total_unmatched_w = sum(len(v) for v in unmatched_works.values())
    total_unmatched_dp = sum(len(v) for v in unmatched_dp.values())

    lines = []
    lines.append("# Harvester Fixes Needed")
    lines.append("")
    lines.append("Catalog data-quality issues found while patching modals from YTA analysis MDs.")
    lines.append("Two classes of problems are documented here:")
    lines.append("")
    lines.append("- **A. Stub catalog rows** — entities that exist in `enriched-content-catalog.json` "
                 "but have no media data attached (`youtube`, `tmdb`, `spotify`, `openLibrary`, "
                 "`soundtrack` all null). Their modal cards render but clicking leads to an empty / "
                 "dead-end modal because there's nothing to display.")
    lines.append("")
    lines.append("- **B. Unmatched MD entities** — entities mentioned in YTA per-video analysis MDs "
                 "that have **no catalog row at all**. Without a catalog row, the patch script can't "
                 "tag them as `discovery_playlist` or `works_discussed` items, so they're invisible in "
                 "the modal.")
    lines.append("")
    lines.append(f"**Counts** (as of last patch run):")
    lines.append(f"- Stub rows: **{len(stubs)}** (across "
                 f"{len(stubs_by_type)} screen-content types)")
    lines.append(f"- Unmatched works_discussed (deduped by title+type): **{len(works_dedup)}** "
                 f"({total_unmatched_w} total references)")
    lines.append(f"- Unmatched discovery_playlist (deduped): **{len(dp_dedup)}** "
                 f"({total_unmatched_dp} total references)")
    lines.append("")
    lines.append("---")
    lines.append("")
    lines.append("## A. Stub Catalog Rows (no media data)")
    lines.append("")
    lines.append("These rows need: TMDB enrichment (poster, overview, year), or to be removed if "
                 "they're harvester noise. Currently they appear as broken cards in modals.")
    lines.append("")
    for t in sorted(stubs_by_type):
        rows = sorted(stubs_by_type[t], key=lambda r: (r.get("title") or "").lower())
        lines.append(f"### `type: {t}` ({len(rows)} rows)")
        lines.append("")
        for r in rows:
            title = r.get("title") or "(no title)"
            creator = r.get("creator") or "(no creator)"
            sources = r.get("sources") or []
            video_ids = sorted(set(s.get("video_id") or "?" for s in sources))
            lines.append(f"- `{title}` — creator: `{creator}` — referenced by: {', '.join('`' + v + '`' for v in video_ids[:5])}"
                         + (f" (+{len(video_ids)-5} more)" if len(video_ids) > 5 else ""))
        lines.append("")

    lines.append("---")
    lines.append("")
    lines.append("## B. Unmatched MD Entities (no catalog row exists)")
    lines.append("")
    lines.append("These entities are referenced in YTA per-video analysis MDs but no row exists in "
                 "`enriched-content-catalog.json` to tag. Justin's harvester needs to ingest them so "
                 "they can be displayed.")
    lines.append("")

    lines.append(f"### Works Discussed ({len(works_dedup)} unique entities)")
    lines.append("")
    for (title, kind), vts in sorted(works_dedup.items(), key=lambda x: (x[0][1], x[0][0].lower())):
        unique_vts = sorted(set(vts))
        ref_count = len(vts)
        lines.append(f"- `{title}` (`{kind}`) — referenced in {ref_count} MD"
                     + ("s" if ref_count != 1 else "") + ": "
                     + ", ".join(f'"{vt[:60]}"' for vt in unique_vts[:3])
                     + (f" (+{len(unique_vts)-3} more)" if len(unique_vts) > 3 else ""))
    lines.append("")

    lines.append(f"### Discovery Playlist ({len(dp_dedup)} unique entities)")
    lines.append("")
    for (title, kind), vts in sorted(dp_dedup.items(), key=lambda x: (x[0][1], x[0][0].lower())):
        unique_vts = sorted(set(vts))
        ref_count = len(vts)
        lines.append(f"- `{title}` (`{kind}`) — referenced in {ref_count} MD"
                     + ("s" if ref_count != 1 else "") + ": "
                     + ", ".join(f'"{vt[:60]}"' for vt in unique_vts[:3])
                     + (f" (+{len(unique_vts)-3} more)" if len(unique_vts) > 3 else ""))
    lines.append("")

    lines.append("---")
    lines.append("")
    lines.append(f"_Auto-generated by `scripts/generate-harvester-fixes-report.py`._")
    lines.append("")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {OUT} ({OUT.stat().st_size} bytes)")
    print(f"  Stubs: {len(stubs)}")
    print(f"  Unmatched works (deduped): {len(works_dedup)} ({total_unmatched_w} total refs)")
    print(f"  Unmatched dp     (deduped): {len(dp_dedup)} ({total_unmatched_dp} total refs)")


def main():
    print(f"Loading catalog from {CATALOG}")
    items = load_catalog()
    print(f"  {len(items)} catalog rows")
    print()
    print("Finding stub rows (no media data)...")
    stubs = find_stubs(items)
    print(f"  {len(stubs)} stubs")
    print()
    print("Finding unmatched MD entities (walking 903 YTA MDs)...")
    uw, udp = find_unmatched(items)
    print(f"  {sum(len(v) for v in uw.values())} unmatched works")
    print(f"  {sum(len(v) for v in udp.values())} unmatched dp")
    print()
    write_report(stubs, uw, udp)
    return 0


if __name__ == "__main__":
    sys.exit(main())
