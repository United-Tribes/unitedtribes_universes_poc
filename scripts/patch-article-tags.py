#!/usr/bin/env python3
"""
Patch enriched-content-catalog.json with discovery_playlist + works_discussed source tags
derived from video analysis MD(s).

Idempotent. Strict title+type match. Skips already-tagged entries; upgrades existing tags
that are missing category_order / category_item_order.

Two modes:
  Single MD:
    python3 scripts/patch-article-tags.py docs/articles/<slug>.md \
        --video-id <id> --video-title "<title>" --channel "<channel>"
    (--video-id / --title / --channel auto-derived from MD header if omitted)

  Batch (every <slug>/analysis.md under a directory):
    python3 scripts/patch-article-tags.py --all-from <dir> [--limit N]
"""
import argparse
import json
import re
import sys
from collections import defaultdict
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]

# MD type token → catalog `type` field
# Catalog vocabulary (verified against enriched-content-catalog.json):
#   album, article, board-game, book, card-game, comedy-special, comic, composition,
#   documentary, episode, essay, film, game, magazine, memoir, music-video, musical,
#   novel, novella, painting, play, podcast, poem, radio-drama, screenplay, sculpture,
#   short-film, song, tv-miniseries, tv-pilot, tv-series, tv-special, unclassified,
#   video-essay, video-game
TYPE_MAP = {
    # canonical types (passthrough)
    "album": "album",
    "article": "article",
    "board-game": "board-game",
    "book": "book",
    "card-game": "card-game",
    "comedy-special": "comedy-special",
    "comic": "comic",
    "composition": "composition",
    "documentary": "documentary",
    "episode": "episode",
    "essay": "essay",
    "film": "film",
    "game": "game",
    "magazine": "magazine",
    "memoir": "memoir",
    "music-video": "music-video",
    "musical": "musical",
    "novel": "novel",
    "novella": "novella",
    "painting": "painting",
    "play": "play",
    "podcast": "podcast",
    "poem": "poem",
    "radio-drama": "radio-drama",
    "screenplay": "screenplay",
    "sculpture": "sculpture",
    "short-film": "short-film",
    "song": "song",
    "tv-miniseries": "tv-miniseries",
    "tv-pilot": "tv-pilot",
    "tv-series": "tv-series",
    "tv-special": "tv-special",
    "unclassified": "unclassified",
    "video-essay": "video-essay",
    "video-game": "video-game",
    # MD aliases / variants seen in the wild
    "tv": "tv-series",
    "television": "tv-series",
    "tv-show": "tv-series",
    "mini-series": "tv-miniseries",
    "tv-mini-series": "tv-miniseries",
    "tv-movie": "film",
    "videogame": "video-game",
    "short": "short-film",
    "music_video": "music-video",
    "live-album": "album",          # live albums classified as albums in catalog
    "live_album": "album",
    "ep": "album",                  # EPs classified as albums in catalog
    # entity-extraction-only tokens that may leak into bullets — keep as themselves
    "organization": "organization",
    "person": "person",
    "place": "place",
    "publication": "publication",
    # generic work token used by YTA MDs in ENTITY EXTRACTION sections
    "work": "work",
}

CATEGORY_LINE_RE = re.compile(r"^\*\*(.+?)\*\*\s*$")
META_LINE_RE = re.compile(r"^\*\*([^:]+):\*\*\s*(.+?)\s*$")

# Format A: `- **Title** - Creator type` (bold title, type token at end)
ENTITY_LINE_RE_A = re.compile(r"^-\s+\*\*(.+?)\*\*\s+-\s+(.+?)\s*$")
# Format B: `- "Title" - Creator` (quoted title, no type token)
ENTITY_LINE_RE_B = re.compile(r'^-\s+["“”](.+?)["“”]\s+-\s+(.+?)\s*$')
# Format C: `- Title - Creator type` (no bold, no quotes — bare format).
# Same shape as A but without `**` markers. Tried last so A's specific match wins
# on bolded lines; C only fires for unadorned lines.
ENTITY_LINE_RE_C = re.compile(r"^-\s+(.+?)\s+-\s+(.+?)\s*$")

# MD header field aliases — different MDs use different headers for the same field
META_ALIASES = {
    "title": "title",
    "video title": "title",
    "name": "title",
    "id": "id",
    "video id": "id",
    "videoid": "id",
    "video_id": "id",
    "source": "source",
    "channel": "source",
    "publication": "source",
}

# Format-B title decorations to strip when no exact match exists. Order matters.
DECORATION_STRIP_RE = [
    re.compile(r"\s+Official\s+Trailer(\s+\d{4})?\s*$", re.IGNORECASE),
    re.compile(r"\s+Trailer\s*$", re.IGNORECASE),
    re.compile(r"\s+Score\s*$", re.IGNORECASE),
    re.compile(r"\s+Audiobook(\s+Sample)?\s*$", re.IGNORECASE),
]

# Description values in the entity index that are NOT works — we never backfill these
# (the harvester owns them; they're already populated for every video).
NON_WORK_DESCRIPTIONS = {
    "person", "place", "character", "event", "location",
    "organization", "concept", "object", "equipment", "genre",
    "product", "publication",
}

# `## ENTITY EXTRACTION` line: `- **[(HH:)MM:SS] Name** type` or `**[..] Name** (type)`
# Type token is a single word or hyphenated word.
EE_LINE_RE = re.compile(
    r"^\s*-\s+\*\*\["
    r"(?:(\d{1,2}):)?"        # optional HH:
    r"(\d{1,2}):(\d{2})"      # MM:SS
    r"\]\s+(.+?)\*\*"          # name (non-greedy) up to closing **
    r"\s*\(?\s*([\w-]+)\s*\)?\s*$"  # type, optionally parenthesized
)


def parse_md_metadata(md_text: str) -> dict:
    """Parse `**Field:** Value` pairs from MD header. Aliases applied (Video Title→title etc.)."""
    result = {}
    started = False
    for raw in md_text.split("\n"):
        stripped = raw.strip()
        if not stripped:
            if started:
                break
            continue
        m = META_LINE_RE.match(stripped)
        if m:
            key = m.group(1).strip().lower()
            val = m.group(2).strip()
            normalized = META_ALIASES.get(key, key)
            if normalized not in result:
                result[normalized] = val
            started = True
        elif started:
            break
    return result


def parse_entity_line(line: str):
    """Parse one entity bullet line.
    Returns (title, type_or_None, creator) or None.
      - Format A: type is a string from TYPE_MAP
      - Format B (quoted title or unknown type): type is None; creator carries the rest"""
    # Try Format B first (quoted title). The MD may also append a parenthesized
    # type at the end: `- "Title" - Creator (type)`. If so, extract type for
    # stricter title+type matching; otherwise fall back to title-only.
    m = ENTITY_LINE_RE_B.match(line)
    if m:
        title = m.group(1).strip()
        rest = m.group(2).strip()
        paren = re.match(r"^(.+?)\s+\(([\w\s-]+)\)\s*$", rest)
        if paren:
            creator = paren.group(1).strip()
            raw_kind = paren.group(2).strip().lower()
            if raw_kind in TYPE_MAP and TYPE_MAP[raw_kind] not in NON_WORK_DESCRIPTIONS:
                return (title, TYPE_MAP[raw_kind], creator)
        return (title, None, rest)

    # Try Format A (bold title with type at end), then Format C (unadorned).
    # A is tried first because it's more specific; C is the catch-all for plain lines.
    m = ENTITY_LINE_RE_A.match(line) or ENTITY_LINE_RE_C.match(line)
    if not m:
        return None
    title = m.group(1).strip()
    rest = m.group(2).strip()

    paren = re.match(r"^(.+?)\s+\(([\w\s-]+)\)\s*$", rest)
    if paren:
        creator = paren.group(1).strip()
        raw_kind = paren.group(2).strip().lower()
    else:
        word = re.match(r"^(.+?)\s+([\w-]+)\s*$", rest)
        if not word:
            # bold title but no parseable trailing type — treat as Format B with rest as creator
            return (title, None, rest)
        creator = word.group(1).strip()
        raw_kind = word.group(2).strip().lower()

    if raw_kind not in TYPE_MAP:
        # bold title but unknown type token — degrade to Format B (title-only match)
        return (title, None, f"{creator} {raw_kind}".strip())
    return (title, TYPE_MAP[raw_kind], creator)


def strip_decoration(title: str) -> str:
    """Strip common decorations like ' Official Trailer YYYY', ' Trailer', ' Score', ' Audiobook'."""
    s = title
    for r in DECORATION_STRIP_RE:
        s2 = r.sub("", s)
        if s2 != s:
            return s2.strip()
    return s.strip()


def parse_md(md_text: str):
    """Return (works, dp, warnings).
    works: list of (title, type_or_none, creator)
    dp: list of (title, type_or_none, category, creator)
    type_or_none is None for Format B entries (title-only matching).
    """
    works = []
    dp = []
    warnings = []

    section = None
    current_category = None

    for raw in md_text.split("\n"):
        line = raw.rstrip()
        stripped = line.strip()
        if not stripped:
            continue

        if stripped.startswith("##"):
            up = stripped.upper()
            if "WORKS DISCUSSED" in up:
                section = "works_discussed"
                current_category = None
                continue
            if "DISCOVERY PLAYLIST" in up:
                section = "discovery_playlist"
                current_category = None
                continue
            section = None
            current_category = None
            continue

        if "DISCOVERY PLAYLIST" in stripped.upper() and "##" in stripped:
            section = "discovery_playlist"
            current_category = None
            continue

        if section is None:
            continue

        if section == "discovery_playlist" and not stripped.startswith("-"):
            cat_m = CATEGORY_LINE_RE.match(stripped)
            if cat_m:
                current_category = cat_m.group(1).strip()
                continue

        if not stripped.startswith("-"):
            continue
        ent = parse_entity_line(stripped)
        if ent is None:
            warnings.append(f"could not parse: {stripped[:120]}")
            continue
        title, kind, creator = ent

        if section == "works_discussed":
            works.append((title, kind, creator))
        else:
            if current_category is None:
                warnings.append(f"DP entity outside category: {stripped[:120]}")
                continue
            dp.append((title, kind, current_category, creator))

    return works, dp, warnings


def parse_entity_extraction(md_text: str):
    """Parse `## ENTITY EXTRACTION` section and return work-typed entries with timestamps.
    Returns list of dicts shaped like the harvester's per-video entities[] entries:
      {"name": str, "description": str, "timestamp": "MM:SS" or "HH:MM:SS",
       "timestamp_seconds": int}
    Skips person/place/character/event/etc — only work-type entries are returned.
    Skips lines whose type token isn't in TYPE_MAP (unknown vocabulary)."""
    out = []
    in_section = False
    for raw in md_text.split("\n"):
        stripped = raw.strip()
        if stripped.startswith("##"):
            up = stripped.upper()
            in_section = "ENTITY EXTRACTION" in up
            continue
        if not in_section:
            continue
        if not stripped.startswith("-"):
            continue
        m = EE_LINE_RE.match(stripped)
        if not m:
            continue
        hh, mm, ss = m.group(1), m.group(2), m.group(3)
        name = m.group(4).strip()
        type_tok = m.group(5).strip().lower()
        canonical = TYPE_MAP.get(type_tok)
        if not canonical or canonical in NON_WORK_DESCRIPTIONS:
            continue
        seconds = (int(hh) * 3600 if hh else 0) + int(mm) * 60 + int(ss)
        if hh:
            ts_str = f"{int(hh):02d}:{int(mm):02d}:{ss}"
        else:
            ts_str = f"{int(mm):02d}:{ss}"
        out.append({
            "name": name,
            "timestamp": ts_str,
            "timestamp_seconds": seconds,
            "description": canonical,
        })
    return out


def patch_entity_index_for_video(work_entries, video_id, idx):
    """Append missing work-typed entries to videos[video_id].entities[] in the entity index.
    Idempotent: skips entries where the index already has the same (normalized name,
    description) pair. Returns dict of stats.

    Mutates idx in-place. Updates videos[video_id].entity_count if entries are added."""
    stats = defaultdict(int)
    videos = idx.get("videos") or {}
    if video_id not in videos:
        stats["no_video_in_index"] = 1
        return dict(stats)
    v = videos[video_id]
    if not isinstance(v.get("entities"), list):
        v["entities"] = []
    existing = v["entities"]
    seen = {(normalize_title(e.get("name")), (e.get("description") or "").lower())
            for e in existing}
    added_any = False
    for entry in work_entries:
        pair = (normalize_title(entry["name"]), entry["description"].lower())
        if pair in seen:
            stats["skipped_present"] += 1
            continue
        existing.append(entry)
        seen.add(pair)
        stats["added"] += 1
        added_any = True
    if added_any:
        v["entity_count"] = len(existing)
        stats["videos_modified"] = 1
    return dict(stats)


def normalize_title(t: str) -> str:
    if t is None:
        return ""
    s = t.strip().lower()
    s = (s.replace("’", "'").replace("‘", "'")
           .replace("“", '"').replace("”", '"')
           .replace("—", "-").replace("–", "-"))
    s = re.sub(r"\s+", " ", s)
    return s


def find_row(items, title, kind, creator=None):
    """Match a catalog row.
    - Format A (kind given): strict title+type match.
      Includes a sibling-type fallback for composition↔song (per JD: 'composition is really classical song').
    - Format B (kind is None): title-only match with creator/source-count tie-break,
      plus decoration-stripping fallback (' Official Trailer', ' Score', ' Audiobook')."""
    nt = normalize_title(title)

    if kind:
        # Format A — strict primary
        nk = (kind or "").lower()
        for r in items:
            if (r.get("type") or "").lower() != nk:
                continue
            if normalize_title(r.get("title")) == nt:
                return r
        # Sibling-type fallback for music: composition ↔ song (per JD)
        SIBLINGS = {"composition": "song", "song": "composition"}
        sib = SIBLINGS.get(nk)
        if sib:
            for r in items:
                if (r.get("type") or "").lower() != sib:
                    continue
                if normalize_title(r.get("title")) == nt:
                    return r
        return None

    # Format B — title-only with tie-breakers
    candidates = [r for r in items if normalize_title(r.get("title")) == nt]

    if not candidates:
        # Try decoration-stripping fallback
        stripped = strip_decoration(title)
        if normalize_title(stripped) != nt:
            sn = normalize_title(stripped)
            candidates = [r for r in items if normalize_title(r.get("title")) == sn]

    if not candidates:
        return None
    if len(candidates) == 1:
        return candidates[0]

    # Multiple matches: prefer creator-match (case-insensitive, normalized)
    if creator:
        nc = normalize_title(creator)
        for r in candidates:
            row_creator = normalize_title(r.get("creator"))
            if not row_creator or not nc:
                continue
            if nc in row_creator or row_creator in nc:
                return r
    # Else prefer canonical row (most existing source tags)
    return max(candidates, key=lambda r: len(r.get("sources") or []))


def find_existing_tag(row, video_id, section, category=None):
    for s in row.get("sources") or []:
        if s.get("video_id") != video_id:
            continue
        if s.get("section") != section:
            continue
        if section == "discovery_playlist":
            if s.get("category") == category:
                return s
        else:
            return s
    return None


def add_source_tag(row, video_id, video_title, slug, channel, section,
                   category=None, category_order=None, category_item_order=None):
    src = {
        "video_id": video_id,
        "video_title": video_title,
        "slug": slug,
        "channel": channel,
        "section": section,
        "category": category if section == "discovery_playlist" else None,
    }
    if section == "discovery_playlist":
        if category_order is not None:
            src["category_order"] = category_order
        if category_item_order is not None:
            src["category_item_order"] = category_item_order
    if "sources" not in row or row["sources"] is None:
        row["sources"] = []
    row["sources"].append(src)


def add_to_categories(row, category):
    cats = row.get("categories")
    if not isinstance(cats, list):
        row["categories"] = [category]
        return True
    if category not in cats:
        cats.append(category)
        return True
    return False


def wipe_dp_tags_for_video(items, video_id):
    """Remove all discovery_playlist source tags for video_id from the catalog.
    Returns count of tags removed. Mutates items in place. Used by replace_dp
    mode so that DP tags exactly mirror the current MD on each apply, which
    prevents orphan-category buildup when an MD renames its DP categories."""
    removed = 0
    for r in items:
        srcs = r.get("sources") or []
        if not srcs:
            continue
        new_srcs = []
        for s in srcs:
            if s.get("video_id") == video_id and s.get("section") == "discovery_playlist":
                removed += 1
                continue
            new_srcs.append(s)
        if removed:
            r["sources"] = new_srcs
    return removed


def patch_one(md_text, items, video_id, video_title, slug, channel, replace_dp=False):
    """Apply tags from one MD to the catalog items list. Mutates items.
    Returns dict of stats.

    If replace_dp is True, all existing discovery_playlist source tags for
    video_id are dropped before applying tags from the MD. This guarantees
    the catalog's DP tags for this video exactly match the current MD —
    no orphan categories or items left over from a prior MD revision."""
    works, dp, warnings = parse_md(md_text)

    cat_order = {}
    for _, _, cat_name, _ in dp:
        if cat_name not in cat_order:
            cat_order[cat_name] = len(cat_order)

    item_order_per_cat = {}
    cat_item_count = {}
    for title, kind, cat_name, _ in dp:
        pos = cat_item_count.get(cat_name, 0)
        item_order_per_cat[(cat_name, normalize_title(title), kind)] = pos
        cat_item_count[cat_name] = pos + 1

    stats = defaultdict(int)
    stats["dp_categories"] = len(cat_order)
    stats["dp_entries"] = len(dp)
    stats["works_entries"] = len(works)
    stats["parse_warnings"] = len(warnings)

    if replace_dp:
        stats["wiped_dp"] = wipe_dp_tags_for_video(items, video_id)

    for title, kind, creator in works:
        row = find_row(items, title, kind, creator)
        if not row:
            stats["unmatched_works"] += 1
            continue
        if find_existing_tag(row, video_id, "works_discussed"):
            stats["skipped"] += 1
            continue
        add_source_tag(row, video_id, video_title, slug, channel, "works_discussed")
        stats["added_works"] += 1

    for title, kind, category, creator in dp:
        row = find_row(items, title, kind, creator)
        if not row:
            stats["unmatched_dp"] += 1
            continue
        order = cat_order[category]
        item_order = item_order_per_cat.get(
            (category, normalize_title(title), kind))
        existing = find_existing_tag(row, video_id, "discovery_playlist", category)
        if existing:
            changed = False
            if existing.get("category_order") != order:
                existing["category_order"] = order
                changed = True
            if item_order is not None and existing.get("category_item_order") != item_order:
                existing["category_item_order"] = item_order
                changed = True
            if changed:
                stats["upgraded_order"] += 1
            else:
                stats["skipped"] += 1
            if add_to_categories(row, category):
                stats["cat_added"] += 1
            continue
        add_source_tag(row, video_id, video_title, slug, channel,
                       "discovery_playlist", category,
                       category_order=order, category_item_order=item_order)
        stats["added_dp"] += 1
        if add_to_categories(row, category):
            stats["cat_added"] += 1

    return dict(stats)


def _derive_video_id(meta, md_path):
    raw = (meta.get("id") or "").strip()
    if raw and not raw.startswith("[") and not raw.startswith("<"):
        return raw
    return md_path.parent.name if md_path.parent.name else None


def run_single(args, cat, cat_path, items, idx, idx_path):
    md_path = Path(args.md)
    md_text = md_path.read_text(encoding="utf-8")
    meta = parse_md_metadata(md_text)

    video_id = args.video_id or _derive_video_id(meta, md_path)
    if not video_id:
        print("ERROR: no video_id (CLI --video-id missing and MD has no parseable ID)",
              file=sys.stderr)
        return 1
    video_title = args.video_title or meta.get("title") or video_id
    slug = args.slug or video_id
    channel = args.channel or meta.get("source") or "Unknown"

    print(f"Patching: {video_title}")
    print(f"  video_id: {video_id}")
    print(f"  channel: {channel}\n")

    stats = patch_one(md_text, items, video_id, video_title, slug, channel,
                      replace_dp=args.replace_dp)

    print(f"  works entries:   {stats.get('works_entries', 0)}")
    print(f"  dp entries:      {stats.get('dp_entries', 0)}")
    print(f"  dp categories:   {stats.get('dp_categories', 0)}")
    if args.replace_dp:
        print(f"  wiped_dp:        {stats.get('wiped_dp', 0)}  (replace-dp mode)")
    print(f"  added_works:     {stats.get('added_works', 0)}")
    print(f"  added_dp:        {stats.get('added_dp', 0)}")
    print(f"  upgraded_order:  {stats.get('upgraded_order', 0)}")
    print(f"  cat_added:       {stats.get('cat_added', 0)}")
    print(f"  skipped:         {stats.get('skipped', 0)}")
    print(f"  unmatched_works: {stats.get('unmatched_works', 0)}")
    print(f"  unmatched_dp:    {stats.get('unmatched_dp', 0)}")
    print(f"  parse_warnings:  {stats.get('parse_warnings', 0)}")

    idx_stats = {}
    if idx is not None:
        ee_entries = parse_entity_extraction(md_text)
        idx_stats = patch_entity_index_for_video(ee_entries, video_id, idx)
        print(f"  ee work entries parsed: {len(ee_entries)}")
        print(f"  idx_added:              {idx_stats.get('added', 0)}")
        print(f"  idx_skipped_present:    {idx_stats.get('skipped_present', 0)}")
        if idx_stats.get("no_video_in_index"):
            print(f"  [warn] video_id not in entity index — nothing backfilled")
    print()

    cat_changed = (stats.get("added_works", 0) + stats.get("added_dp", 0)
                   + stats.get("upgraded_order", 0) + stats.get("cat_added", 0)) > 0
    idx_changed = idx_stats.get("added", 0) > 0
    if not cat_changed and not idx_changed:
        print("No changes.")
        return 0
    if args.dry_run:
        print("DRY RUN — not writing.")
        return 0
    if cat_changed:
        cat_path.write_text(json.dumps(cat, ensure_ascii=False, indent=2) + "\n",
                            encoding="utf-8")
        print(f"Wrote {cat_path}")
    if idx_changed and idx_path is not None:
        idx_path.write_text(json.dumps(idx, ensure_ascii=False, indent=2) + "\n",
                            encoding="utf-8")
        print(f"Wrote {idx_path}")
    return 0


def run_batch(args, cat, cat_path, items, idx, idx_path):
    base = Path(args.all_from).expanduser()
    md_files = sorted(base.glob("*/analysis.md"))
    if args.limit:
        md_files = md_files[: args.limit]

    catalog_vids = set()
    for r in items:
        for s in (r.get("sources") or []):
            if s.get("video_id"):
                catalog_vids.add(s["video_id"])

    idx_videos = idx.get("videos") if idx else {}

    print(f"Processing {len(md_files)} MD files from {base}")
    print(f"Catalog has {len(catalog_vids)} unique video_ids tagged")
    if idx is not None:
        print(f"Entity index has {len(idx_videos)} videos")
    print()

    aggregate = defaultdict(int)
    skipped_no_id = 0
    not_in_catalog = 0
    parse_failed = 0
    processed = 0
    per_video_changes = []
    idx_videos_modified = set()
    idx_videos_not_in_index = 0

    for md_path in md_files:
        try:
            md_text = md_path.read_text(encoding="utf-8")
        except Exception as e:
            print(f"  [error] {md_path}: {e}")
            parse_failed += 1
            continue
        meta = parse_md_metadata(md_text)
        video_id = args.video_id or _derive_video_id(meta, md_path)
        if not video_id:
            skipped_no_id += 1
            if args.verbose:
                print(f"  [skip-no-id] {md_path.parent.name}")
            continue
        if video_id not in catalog_vids:
            not_in_catalog += 1
            if args.verbose:
                print(f"  [not-in-catalog] {video_id} ({md_path.parent.name})")
            continue
        video_title = meta.get("title") or video_id
        slug = video_id
        channel = meta.get("source") or "Unknown"

        stats = patch_one(md_text, items, video_id, video_title, slug, channel,
                          replace_dp=args.replace_dp)
        for k, v in stats.items():
            aggregate[k] += v
        processed += 1
        change_total = (stats.get("added_works", 0) + stats.get("added_dp", 0)
                        + stats.get("upgraded_order", 0))
        if change_total > 0:
            per_video_changes.append((video_id, video_title, stats))
        if args.verbose and change_total:
            print(f"  [{video_id}] +{stats.get('added_works',0)}w "
                  f"+{stats.get('added_dp',0)}d ↑{stats.get('upgraded_order',0)}o "
                  f"({video_title[:60]})")

        if idx is not None:
            ee_entries = parse_entity_extraction(md_text)
            aggregate["idx_ee_parsed"] += len(ee_entries)
            idx_stats = patch_entity_index_for_video(ee_entries, video_id, idx)
            aggregate["idx_added"] += idx_stats.get("added", 0)
            aggregate["idx_skipped_present"] += idx_stats.get("skipped_present", 0)
            if idx_stats.get("no_video_in_index"):
                idx_videos_not_in_index += 1
            if idx_stats.get("added", 0) > 0:
                idx_videos_modified.add(video_id)
                if args.verbose:
                    print(f"  [{video_id}] idx +{idx_stats['added']} work entries")

    print()
    print("=== Batch summary ===")
    print(f"  MDs found in directory:     {len(md_files)}")
    print(f"  MDs read & parsed:          {processed + skipped_no_id + not_in_catalog}")
    print(f"  MDs failed to read:         {parse_failed}")
    print(f"  MDs skipped (no ID):        {skipped_no_id}")
    print(f"  MDs skipped (not catalog):  {not_in_catalog}")
    print(f"  MDs processed (catalog hit): {processed}")
    print(f"    of which made catalog changes: {len(per_video_changes)}")
    print()
    if args.replace_dp:
        print(f"  Total wiped_dp:       {aggregate.get('wiped_dp', 0)}  (replace-dp mode)")
    print(f"  Total added_works:    {aggregate.get('added_works', 0)}")
    print(f"  Total added_dp:       {aggregate.get('added_dp', 0)}")
    print(f"  Total upgraded_order: {aggregate.get('upgraded_order', 0)}")
    print(f"  Total cat_added:      {aggregate.get('cat_added', 0)}")
    print(f"  Total skipped:        {aggregate.get('skipped', 0)}")
    print(f"  Total unmatched works (no catalog row): {aggregate.get('unmatched_works', 0)}")
    print(f"  Total unmatched dp    (no catalog row): {aggregate.get('unmatched_dp', 0)}")

    if idx is not None:
        print()
        print(f"  Entity-index work entries parsed from MDs: {aggregate.get('idx_ee_parsed', 0)}")
        print(f"  Entity-index entries added:        {aggregate.get('idx_added', 0)}")
        print(f"  Entity-index entries skipped (already present): {aggregate.get('idx_skipped_present', 0)}")
        print(f"  Videos with at least one entry added:    {len(idx_videos_modified)}")
        print(f"  MDs whose video_id wasn't in entity index: {idx_videos_not_in_index}")

    cat_changed = (aggregate.get("added_works", 0) + aggregate.get("added_dp", 0)
                   + aggregate.get("upgraded_order", 0) + aggregate.get("cat_added", 0)) > 0
    idx_changed = aggregate.get("idx_added", 0) > 0

    if not cat_changed and not idx_changed:
        print("\nNo changes to write.")
        return 0
    if args.dry_run:
        print("\nDRY RUN — not writing.")
        return 0

    if cat_changed:
        cat_path.write_text(json.dumps(cat, ensure_ascii=False, indent=2) + "\n",
                            encoding="utf-8")
        size_mb = cat_path.stat().st_size / (1024 * 1024)
        print(f"\nWrote {cat_path} ({size_mb:.1f} MB)")
    if idx_changed and idx_path is not None:
        idx_path.write_text(json.dumps(idx, ensure_ascii=False, indent=2) + "\n",
                            encoding="utf-8")
        size_mb = idx_path.stat().st_size / (1024 * 1024)
        print(f"Wrote {idx_path} ({size_mb:.1f} MB)")
    return 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("md", nargs="?", help="path to a single analysis MD (single mode)")
    ap.add_argument("--all-from",
                    help="directory containing <slug>/analysis.md folders (batch mode)")
    ap.add_argument("--limit", type=int, default=0,
                    help="batch mode: process only the first N MDs")
    ap.add_argument("--catalog",
                    default=str(REPO / "src" / "data" / "enriched-content-catalog.json"))
    ap.add_argument("--entity-index",
                    default=str(REPO / "src" / "data" / "all-video-entity-index.json"),
                    help="entity index JSON to backfill work-type entries into")
    ap.add_argument("--no-entity-index", action="store_true",
                    help="skip entity-index backfill (catalog patches only)")
    ap.add_argument("--replace-dp", action="store_true",
                    help="before applying DP tags from each MD, wipe all existing "
                         "discovery_playlist source tags for that video_id from the "
                         "catalog. Prevents orphan-category buildup when an MD renames "
                         "its DP categories. Idempotent: re-running with no MD changes "
                         "produces identical state.")
    ap.add_argument("--video-id", default=None)
    ap.add_argument("--video-title", default=None)
    ap.add_argument("--slug", default=None)
    ap.add_argument("--channel", default=None)
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--verbose", action="store_true")
    args = ap.parse_args()

    if not args.md and not args.all_from:
        ap.error("provide either an MD file path or --all-from <dir>")
    if args.md and args.all_from:
        ap.error("specify EITHER an MD path OR --all-from, not both")

    cat_path = Path(args.catalog)
    print(f"Loading catalog from {cat_path}")
    cat = json.loads(cat_path.read_text(encoding="utf-8"))
    items = cat.get("content") or cat.get("items") or []
    print(f"  {len(items)} catalog rows loaded")

    idx = None
    idx_path = None
    if not args.no_entity_index:
        idx_path = Path(args.entity_index)
        if idx_path.exists():
            print(f"Loading entity index from {idx_path}")
            idx = json.loads(idx_path.read_text(encoding="utf-8"))
            print(f"  {len(idx.get('videos') or {})} videos, "
                  f"{len(idx.get('entities') or {})} top-level entities loaded")
        else:
            print(f"  [warn] entity index not found at {idx_path} — skipping backfill")
            idx = None
    print()

    if args.all_from:
        return run_batch(args, cat, cat_path, items, idx, idx_path)
    return run_single(args, cat, cat_path, items, idx, idx_path)


if __name__ == "__main__":
    sys.exit(main())
