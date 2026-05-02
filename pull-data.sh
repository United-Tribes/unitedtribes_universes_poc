#!/bin/bash
# Pull ALL latest data from S3 — run from repo root
# Usage: bash pull-data.sh

S3_BASE="http://unitedtribes-visualizations-1758769416.s3-website-us-east-1.amazonaws.com/universe-data"

echo "═══ Pulling ALL data from S3 ═══"
echo "$(date)"
echo ""

# 1. Per-universe video entity indexes
echo "── Video Entity Indexes ──"
for u in blue-note pluribus sinners patti-smith greta-gerwig general; do
  echo "  ${u}-video-entity-index.json"
  curl -sf -o "src/data/${u}-video-entity-index.json" "${S3_BASE}/video-indexes/${u}-video-entity-index.json"
done

# 2. All-video entity index (complete — 822+ videos)
echo "  all-video-entity-index.json (38MB)..."
curl -sf -o "src/data/all-video-entity-index.json" "${S3_BASE}/all-video-entity-index.json"

# 3. Enriched content catalog (14K+ items)
echo ""
echo "── Enriched Content Catalog ──"
echo "  enriched-content-catalog.json (~24MB)..."
curl -sf -o "src/data/enriched-content-catalog.json" "${S3_BASE}/enriched-content-catalog.json"

# 4. Per-universe core data (universe.json, response.json, artist-albums.json, poc-artists.json)
echo ""
echo "── Per-Universe Core Data ──"
for u in bluenote gerwig pattismith pluribus sinners; do
  echo "  ${u}:"
  curl -sf -o "src/data/${u}-universe.json" "${S3_BASE}/${u}/${u}-universe.json"
  echo "    universe.json"
  curl -sf -o "src/data/${u}-response.json" "${S3_BASE}/${u}/${u}-response.json"
  echo "    response.json"
  curl -sf -o "src/data/${u}-artist-albums.json" "${S3_BASE}/${u}/artist-albums.json"
  echo "    artist-albums.json"
  curl -sf -o "src/data/${u}-poc-artists.json" "${S3_BASE}/${u}/poc-artists.json"
  echo "    poc-artists.json"
done

# 5. Per-universe additional data (scores, catalogs, enrichments)
echo ""
echo "── Per-Universe Additional Data ──"

# Sinners
echo "  sinners:"
curl -sf -o "src/data/sinners-ludwig-goransson-scores.json" "${S3_BASE}/sinners/ludwig-goransson-scores.json"
echo "    ludwig-goransson-scores.json"
curl -sf -o "src/data/sinners-raphael-saadiq-catalog.json" "${S3_BASE}/sinners/raphael-saadiq-catalog.json"
echo "    raphael-saadiq-catalog.json"

# Pluribus
echo "  pluribus:"
curl -sf -o "src/data/pluribus-dave-porter-scores.json" "${S3_BASE}/pluribus/dave-porter-scores.json"
echo "    dave-porter-scores.json"
curl -sf -o "src/data/pluribus-thomas-golubic-supervised.json" "${S3_BASE}/pluribus/thomas-golubic-supervised.json"
echo "    thomas-golubic-supervised.json"
curl -sf -o "src/data/pluribus-theme-enrichment.json" "${S3_BASE}/pluribus/theme-enrichment.json"
echo "    theme-enrichment.json"

# Gerwig
echo "  gerwig:"
curl -sf -o "src/data/gerwig-mark-ronson-catalog.json" "${S3_BASE}/gerwig/mark-ronson-catalog.json"
echo "    mark-ronson-catalog.json"
curl -sf -o "src/data/gerwig-jon-brion-scores.json" "${S3_BASE}/gerwig/jon-brion-scores.json"
echo "    jon-brion-scores.json"
curl -sf -o "src/data/gerwig-alexandre-desplat-scores.json" "${S3_BASE}/gerwig/alexandre-desplat-scores.json"
echo "    alexandre-desplat-scores.json"

# Patti Smith
echo "  pattismith:"
curl -sf -o "src/data/pattismith-curated-enrichment.json" "${S3_BASE}/pattismith/curated-enrichment.json"
echo "    curated-enrichment.json"

# Blue Note
echo "  bluenote:"
curl -sf -o "src/data/rudy-van-gelder-albums.json" "${S3_BASE}/bluenote/rudy-van-gelder-albums.json"
echo "    rudy-van-gelder-albums.json"

# 6. Entity registries
echo ""
echo "── Entity Registries ──"
echo "  album-entity-registry.json"
curl -sf -o "src/data/album-entity-registry.json" "${S3_BASE}/album-entity-registry.json"
echo "  venue-entity-registry.json"
curl -sf -o "src/data/venue-entity-registry.json" "${S3_BASE}/venue-entity-registry.json"

# 7. Local catalog patches — auto-restore after cron pull
# Every cron run (8 AM / 12 PM / 7 PM) this section reapplies our local
# enrichments on top of whatever Justin's harvester just shipped to S3.
# Both scripts are idempotent — first run does the work, subsequent runs
# on already-patched data are near no-ops.
#   patch-article-tags.py: walks YTA per-video analysis.md files; tags
#     catalog rows with category_order + category_item_order + adds
#     missing source tags for entities the MD lists.
#   cleanup-trailer-rows.py: merges/renames "X Official Trailer" rows.
# When Justin's harvester writes those fields natively, this section
# becomes a no-op automatically. No code change needed.
echo ""
echo "── Local catalog patches ──"
if [ -d "$HOME/Desktop/my-claude/podcast-test/youtube-analysis-viewer/data/videos" ]; then
  python3 scripts/patch-article-tags.py --all-from "$HOME/Desktop/my-claude/podcast-test/youtube-analysis-viewer/data/videos" 2>&1 | tail -8
else
  echo "  [skip] YTA analysis folder not found — patch-article-tags.py skipped"
fi
python3 scripts/cleanup-trailer-rows.py 2>&1 | tail -6

echo ""
echo "═══ Done. All data refreshed from S3 — $(date) ═══"
