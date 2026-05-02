#!/usr/bin/env python3
"""
Generate `docs/trailer-cleanup-report.md` — categorized list of all "X Official
Trailer"-decorated catalog rows that the trailer cleanup processed, with the
action taken on each. Reads the pre-cleanup catalog from git history
(c2ba572 = May 1 5:15 PM, just before the cleanup commit 519ce13).

For each of the 109 rows, the report shows:
  - MERGE: trailer row had a clean-twin with valid screen-type → trailer
    sources migrated into clean row, trailer row deleted
  - RENAME+RETYPE: orphan + mis-typed as song/album → renamed (decoration
    stripped) + retyped to film (or tv-series via Season N heuristic)
  - RENAME-ONLY: orphan + already correctly typed → just stripped decoration

Plus a "STILL BROKEN" callout for the 16 RENAME+RETYPE rows that have no
media data → they still render dead-end modals on click. Justin needs to
TMDB-enrich them.
"""
import importlib.util
import json
import re
import subprocess
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
PRE_CLEANUP_COMMIT = "e5ee7d8"  # May 1 4:20 PM chore, immediately before 519ce13 trailer cleanup feat
OUT = REPO / "docs" / "trailer-cleanup-report.md"

# Reuse cleanup logic
spec = importlib.util.spec_from_file_location(
    "cleanup", REPO / "scripts" / "cleanup-trailer-rows.py")
cleanup = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cleanup)


def get_pre_cleanup_catalog():
    """Fetch enriched-content-catalog.json as it was at c2ba572."""
    result = subprocess.run(
        ["git", "show", f"{PRE_CLEANUP_COMMIT}:src/data/enriched-content-catalog.json"],
        cwd=REPO, capture_output=True, text=True, check=True)
    return json.loads(result.stdout)


def get_post_cleanup_catalog():
    """Current catalog (post-cleanup)."""
    return json.loads((REPO / "src" / "data" / "enriched-content-catalog.json").read_text())


def has_media(r):
    return any([r.get("youtube"), r.get("tmdb"), r.get("spotify"),
                r.get("openLibrary"), r.get("soundtrack")])


def main():
    pre_cat = get_pre_cleanup_catalog()
    post_cat = get_post_cleanup_catalog()
    pre_items = pre_cat.get("content") or []
    post_items = post_cat.get("content") or []

    # Build pre-cleanup index by normalized title
    by_norm_title_pre = {}
    for r in pre_items:
        t = r.get("title") or ""
        if not t:
            continue
        by_norm_title_pre.setdefault(cleanup.normalize_title(t), []).append(r)

    # Build post-cleanup index by normalized title
    by_norm_title_post = {}
    for r in post_items:
        t = r.get("title") or ""
        if not t:
            continue
        by_norm_title_post.setdefault(cleanup.normalize_title(t), []).append(r)

    plan_merge = []
    plan_rename_retype = []
    plan_rename_only = []

    for r in pre_items:
        title = r.get("title") or ""
        clean = cleanup.strip_trailer_decoration(title)
        if clean is None or not clean:
            continue
        cur_type = (r.get("type") or "").lower()
        norm_clean = cleanup.normalize_title(clean)
        twins = [t for t in by_norm_title_pre.get(norm_clean, []) if t is not r]
        screen_twin = next(
            (t for t in twins if (t.get("type") or "").lower() in cleanup.SCREEN_TYPES),
            None
        )
        if screen_twin:
            plan_merge.append((r, clean, screen_twin))
            continue
        if cur_type in cleanup.MISCLASSIFIED_FOR_TRAILER:
            inferred = cleanup.infer_screen_type(title, default="film")
            plan_rename_retype.append((r, clean, cur_type, inferred))
            continue
        if cur_type in cleanup.SCREEN_TYPES:
            plan_rename_only.append((r, clean, cur_type))
            continue

    # Identify which RENAME+RETYPE rows still have NO media data (the broken stubs)
    # by looking up the post-cleanup row by clean title
    still_broken = []
    for orig_row, clean, _, new_type in plan_rename_retype:
        post_rows = by_norm_title_post.get(cleanup.normalize_title(clean), [])
        # Match by type to find the post-cleanup version of this exact row
        match = next((p for p in post_rows
                      if (p.get("type") or "").lower() == new_type), None)
        if match and not has_media(match):
            still_broken.append((orig_row, clean, new_type, match))

    # Write report
    lines = []
    lines.append("# Trailer-Row Cleanup Report")
    lines.append("")
    lines.append("Catalog cleanup applied on **May 1, 2026** (commit `519ce13`) to all rows whose ")
    lines.append("title contained `Official Trailer`. This report is generated from the pre-cleanup ")
    lines.append(f"catalog state (commit `{PRE_CLEANUP_COMMIT}`) so Justin can see exactly what was done ")
    lines.append("and which entries still need harvester-side attention.")
    lines.append("")
    lines.append("**Total trailer-decorated rows processed: 109** &mdash; resolved into:")
    lines.append(f"- **{len(plan_merge)} MERGE**: trailer row had a clean-twin with valid screen-type "
                 "→ migrated trailer's sources into the clean row, deleted trailer row")
    lines.append(f"- **{len(plan_rename_retype)} RENAME+RETYPE**: orphan + mis-typed as song/album "
                 "→ stripped decoration + retyped to film (or tv-series via `Season N`/`Series` heuristic)")
    lines.append(f"- **{len(plan_rename_only)} RENAME-ONLY**: orphan + already correctly typed "
                 "→ stripped decoration only")
    lines.append("")
    lines.append(f"**🚨 STILL BROKEN ({len(still_broken)} rows)** — RENAME+RETYPE rows that have no media "
                 "data. They render in modals as cards but clicking leads to dead-end empty modals "
                 "because there's no actual film/show data attached. **These need harvester-side TMDB "
                 "enrichment** (poster, overview, year), or removal if the harvester deems them noise.")
    lines.append("")
    lines.append("---")
    lines.append("")

    # STILL BROKEN section first (most actionable for Justin)
    lines.append("## 🚨 Still broken — need TMDB enrichment by harvester")
    lines.append("")
    lines.append(f"({len(still_broken)} rows. These were `type=song` placeholders for trailer references; "
                 "we retyped them to `film` or `tv-series` and stripped the decoration, but they have no "
                 "media data so clicking them leads to an empty modal. Each needs the harvester to attach "
                 "TMDB poster + overview + year, or to be deleted if not actually relevant.)")
    lines.append("")
    lines.append("| Renamed to | Retyped as | Original title | Creator |")
    lines.append("|---|---|---|---|")
    for orig, clean, new_type, _post in sorted(still_broken,
                                               key=lambda x: x[1].lower()):
        lines.append(f"| `{clean}` | `{new_type}` | `{orig.get('title')}` | "
                     f"{orig.get('creator') or '_(none)_'} |")
    lines.append("")
    lines.append("---")
    lines.append("")

    # MERGE section
    lines.append(f"## ✅ Merged ({len(plan_merge)} rows — sources migrated into clean twin, trailer row deleted)")
    lines.append("")
    lines.append("These trailer rows had a clean-twin row already in the catalog with a valid screen "
                 "type (`film`/`tv-series`/`documentary`/`short-film`). The cleanup migrated the "
                 "trailer row's source tags into the clean row and deleted the trailer row entirely. "
                 "**No further action needed** — the clean twin carries forward.")
    lines.append("")
    lines.append("| Trailer row (deleted) | Trailer type | Clean twin (kept) | Twin type | Twin sources |")
    lines.append("|---|---|---|---|---|")
    for orig, clean, twin in sorted(plan_merge, key=lambda x: x[1].lower()):
        twin_srcs = len(twin.get("sources") or [])
        lines.append(f"| `{orig.get('title')}` | `{orig.get('type')}` | `{twin.get('title')}` | "
                     f"`{twin.get('type')}` | {twin_srcs} |")
    lines.append("")
    lines.append("---")
    lines.append("")

    # RENAME+RETYPE section
    lines.append(f"## ✏️ Renamed + retyped ({len(plan_rename_retype)} rows)")
    lines.append("")
    lines.append("Orphan trailer rows (no clean twin) that were mis-typed by the harvester as `song`/"
                 "`album`/etc. Cleanup stripped the decoration and retyped to `film` (or `tv-series` "
                 "when title matched `Season N`/`Series`/`Episode`). **The 16 in the STILL BROKEN section "
                 "above need TMDB enrichment**; the rest below have at least the YouTube trailer URL "
                 "attached so they're functional.")
    lines.append("")
    lines.append("| Was | Now | Old type → new type | Creator |")
    lines.append("|---|---|---|---|")
    for orig, clean, old_type, new_type in sorted(plan_rename_retype,
                                                  key=lambda x: x[1].lower()):
        lines.append(f"| `{orig.get('title')}` | `{clean}` | `{old_type}` → `{new_type}` | "
                     f"{orig.get('creator') or '_(none)_'} |")
    lines.append("")
    lines.append("---")
    lines.append("")

    # RENAME-ONLY section
    lines.append(f"## 🪶 Renamed only — already correctly typed ({len(plan_rename_only)} rows)")
    lines.append("")
    lines.append("Orphan trailer rows that already had a valid screen-type (mostly `film`); cleanup "
                 "just stripped the `Official Trailer` decoration from the title. Type unchanged. "
                 "**No further action needed** — these were just cosmetically dirty.")
    lines.append("")
    lines.append("| Was | Now | Type | Creator |")
    lines.append("|---|---|---|---|")
    for orig, clean, t in sorted(plan_rename_only, key=lambda x: x[1].lower()):
        lines.append(f"| `{orig.get('title')}` | `{clean}` | `{t}` | "
                     f"{orig.get('creator') or '_(none)_'} |")
    lines.append("")
    lines.append("---")
    lines.append("")

    lines.append("## How to make this cleanup obsolete (harvester-side)")
    lines.append("")
    lines.append("When the harvester encounters a movie/show trailer URL, prefer to **attach the trailer "
                 "as a `youtube` field on the existing clean-titled film/tv-series row** rather than "
                 "creating a separate `X Official Trailer` row of type `song`. That sidesteps this "
                 "entire cleanup pass — there's nothing to merge or rename if the trailer never gets "
                 "its own row.")
    lines.append("")
    lines.append(f"_Auto-generated by `scripts/generate-trailer-cleanup-report.py` from catalog "
                 f"states at `{PRE_CLEANUP_COMMIT}` (pre-cleanup) and `HEAD` (post-cleanup)._")
    lines.append("")

    OUT.write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {OUT} ({OUT.stat().st_size} bytes)")
    print(f"  MERGE: {len(plan_merge)}")
    print(f"  RENAME+RETYPE: {len(plan_rename_retype)} ({len(still_broken)} still need enrichment)")
    print(f"  RENAME-ONLY: {len(plan_rename_only)}")


if __name__ == "__main__":
    main()
