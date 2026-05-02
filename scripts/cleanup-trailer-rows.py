#!/usr/bin/env python3
"""
Clean up "X Official Trailer" rows in enriched-content-catalog.json.

Three modes per row:
  1. MERGE: clean twin exists with valid screen-type → migrate sources, delete trailer
  2. RENAME+RETYPE: orphan typed as `song` (clearly wrong) → strip decoration, retype to `film`
  3. RENAME-ONLY: orphan typed as film/tv-series/documentary/short-film → strip decoration, keep type

Skips rows where:
  - The clean twin has a non-screen type (Godfather novel ≠ Godfather Official Trailer film)
  - The strip leaves an empty / weird title
  - The trailer type is unrecognized

Idempotent — re-running is a no-op once cleaned. Reports per-row decisions.

Usage:
    python3 scripts/cleanup-trailer-rows.py [--dry-run]
"""
import argparse
import json
import re
import sys
from collections import defaultdict
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]

# Decoration suffixes to strip (in order)
DECORATION_RES = [
    re.compile(r"\s*[-–—]\s*Official\s+Trailer(\s+\d{4})?\s*$", re.IGNORECASE),
    re.compile(r"\s+Official\s+Trailer(\s+\d{4})?\s*$", re.IGNORECASE),
]

# Types we consider "screen" content (films, shows, etc.) — valid trailer subjects
SCREEN_TYPES = {"film", "tv-series", "tv-miniseries", "tv-special", "tv-pilot",
                "documentary", "short-film"}

# Types that are clearly mis-classified for a trailer entity
MISCLASSIFIED_FOR_TRAILER = {"song", "album", "composition", "book", "novel",
                              "play", "poem", "essay", "memoir", "novella"}

# Heuristic: title patterns that strongly indicate a TV series (rather than film)
TV_SIGNAL_RE = re.compile(
    r"\b(Season\s+\d+|Series\b|Episode\s*\d|TV\s+Series|Mini[- ]?Series)\b",
    re.IGNORECASE)


def infer_screen_type(title: str, default: str = "film") -> str:
    """Best-guess screen type from title patterns. Defaults to `film`."""
    if TV_SIGNAL_RE.search(title):
        return "tv-series"
    return default


def normalize_title(t: str) -> str:
    if t is None:
        return ""
    s = t.strip().lower()
    s = (s.replace("’", "'").replace("‘", "'")
           .replace("“", '"').replace("”", '"')
           .replace("—", "-").replace("–", "-"))
    s = re.sub(r"\s+", " ", s)
    return s


def strip_trailer_decoration(title: str):
    """Returns the cleaned title (suffix stripped) or None if title doesn't look like a trailer row."""
    for r in DECORATION_RES:
        new = r.sub("", title)
        if new != title:
            return new.strip()
    return None


def source_key(s):
    """Stable key for de-duping source tags during merge."""
    return (s.get("video_id"), s.get("section"), s.get("category"))


def merge_sources(target_row, source_row):
    """Copy non-duplicate source tags from source_row into target_row. Returns count added."""
    target_keys = {source_key(s) for s in (target_row.get("sources") or [])}
    added = 0
    if "sources" not in target_row or target_row["sources"] is None:
        target_row["sources"] = []
    for s in (source_row.get("sources") or []):
        if source_key(s) not in target_keys:
            target_row["sources"].append(s)
            target_keys.add(source_key(s))
            added += 1
    # Also merge categories[] if present
    src_cats = source_row.get("categories") or []
    tgt_cats = target_row.get("categories") or []
    for c in src_cats:
        if c not in tgt_cats:
            tgt_cats.append(c)
    if src_cats:
        target_row["categories"] = tgt_cats
    return added


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--catalog",
                    default=str(REPO / "src" / "data" / "enriched-content-catalog.json"))
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--default-orphan-retype", default="film",
                    help="Type to assign to orphan trailers currently mis-typed (default: film)")
    args = ap.parse_args()

    cat_path = Path(args.catalog)
    print(f"Loading catalog from {cat_path}")
    cat = json.loads(cat_path.read_text(encoding="utf-8"))
    items = cat.get("content") or cat.get("items") or []
    print(f"  {len(items)} catalog rows loaded\n")

    # Build clean-title index: normalize(title) → list of rows
    by_norm_title = defaultdict(list)
    for r in items:
        t = r.get("title") or ""
        if not t:
            continue
        by_norm_title[normalize_title(t)].append(r)

    stats = defaultdict(int)
    plan_merge = []   # (trailer_row, target_row)
    plan_rename = []  # (trailer_row, new_title, new_type_or_None)
    plan_skip = []    # (trailer_row, reason)

    for r in items:
        title = r.get("title") or ""
        clean = strip_trailer_decoration(title)
        if clean is None:
            continue  # not a trailer row
        if not clean:
            plan_skip.append((r, "strip leaves empty title"))
            continue

        cur_type = (r.get("type") or "").lower()
        norm_clean = normalize_title(clean)
        twins = [t for t in by_norm_title.get(norm_clean, []) if t is not r]

        # Case A — merge candidates: any twin with a valid screen type
        screen_twin = next(
            (t for t in twins if (t.get("type") or "").lower() in SCREEN_TYPES),
            None
        )
        if screen_twin:
            plan_merge.append((r, screen_twin))
            continue

        # Case B — orphan with mis-classified type → rename + retype
        if cur_type in MISCLASSIFIED_FOR_TRAILER:
            inferred = infer_screen_type(title, default=args.default_orphan_retype)
            plan_rename.append((r, clean, inferred))
            continue

        # Case C — orphan with valid screen type → rename only
        if cur_type in SCREEN_TYPES:
            plan_rename.append((r, clean, None))
            continue

        # Case D — unrecognized type → skip
        plan_skip.append((r, f"type={cur_type!r} not in SCREEN_TYPES or MISCLASSIFIED set"))

    print(f"=== Plan ===")
    print(f"  MERGE candidates  ({len(plan_merge)}): merge sources into clean screen-type twin, delete trailer row")
    print(f"  RENAME candidates ({len(plan_rename)}): strip decoration, optionally retype")
    rename_only = sum(1 for _, _, t in plan_rename if t is None)
    rename_retype = len(plan_rename) - rename_only
    print(f"      rename-only:   {rename_only}")
    print(f"      rename+retype: {rename_retype}  (current type → {args.default_orphan_retype})")
    print(f"  SKIP             ({len(plan_skip)}):")
    for r, reason in plan_skip[:20]:
        print(f"      - {r.get('title')!r}  type={r.get('type')}  → {reason}")
    print()

    print(f"=== Sample MERGE actions (first 10) ===")
    for tr, tgt in plan_merge[:10]:
        print(f"  {tr.get('title')!r:55s} ({tr.get('type'):12s}, {len(tr.get('sources') or [])} src)")
        print(f"   → into {tgt.get('title')!r}  ({tgt.get('type')}, {len(tgt.get('sources') or [])} src)")
    print()

    print(f"=== Sample RENAME+RETYPE actions (first 15) ===")
    rr_actions = [(r, c, t) for r, c, t in plan_rename if t is not None]
    for tr, clean, new_t in rr_actions[:15]:
        print(f"  {tr.get('title')!r:55s} ({tr.get('type')!s:8s}) → {clean!r:50s} ({new_t})")
    print()

    print(f"=== Sample RENAME-ONLY actions (first 8) ===")
    ro_actions = [(r, c, t) for r, c, t in plan_rename if t is None]
    for tr, clean, _ in ro_actions[:8]:
        print(f"  {tr.get('title')!r:55s} ({tr.get('type')!s}) → {clean!r}")
    print()

    if args.dry_run:
        print("=== DRY RUN — not writing. ===")
        return 0

    # Execute the plan
    rows_to_delete = set()
    merged_sources_total = 0
    for tr, tgt in plan_merge:
        added = merge_sources(tgt, tr)
        merged_sources_total += added
        rows_to_delete.add(id(tr))
        stats["merged"] += 1
        stats["sources_migrated"] += added

    for tr, clean, new_t in plan_rename:
        tr["title"] = clean
        if new_t is not None:
            tr["type"] = new_t
            stats["renamed_retyped"] += 1
        else:
            stats["renamed_only"] += 1

    # Filter out deleted rows
    if rows_to_delete:
        new_items = [r for r in items if id(r) not in rows_to_delete]
        if "content" in cat:
            cat["content"] = new_items
        elif "items" in cat:
            cat["items"] = new_items
        items = new_items

    print(f"=== Execution ===")
    print(f"  Trailer rows merged-and-deleted: {stats['merged']}")
    print(f"  Source tags migrated:            {stats['sources_migrated']}")
    print(f"  Trailer rows renamed-only:       {stats['renamed_only']}")
    print(f"  Trailer rows renamed-and-retyped: {stats['renamed_retyped']}")
    print(f"  Catalog row count: {len(items)}")
    print()

    # Write back
    cat_path.write_text(json.dumps(cat, ensure_ascii=False, indent=2) + "\n",
                        encoding="utf-8")
    size_mb = cat_path.stat().st_size / (1024 * 1024)
    print(f"Wrote {cat_path} ({size_mb:.1f} MB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
