#!/bin/bash
# Pull ALL latest data from S3 — run from repo root
# Usage: bash pull-data.sh

S3_BASE="http://unitedtribes-visualizations-1758769416.s3-website-us-east-1.amazonaws.com/universe-data"

echo "═══ Pulling ALL data from S3 ═══"
echo ""

# 1. Per-universe video entity indexes
echo "── Video Entity Indexes ──"
for u in blue-note pluribus sinners patti-smith greta-gerwig; do
  echo "  ${u}-video-entity-index.json"
  curl -sf -o "src/data/${u}-video-entity-index.json" "${S3_BASE}/video-indexes/${u}-video-entity-index.json"
done

# 2. All-video entity index (complete — 815+ videos)
echo "  all-video-entity-index.json (37MB)..."
curl -sf -o "src/data/all-video-entity-index.json" "${S3_BASE}/all-video-entity-index.json"

# 3. Enriched content catalog (16K+ items)
echo ""
echo "── Enriched Content Catalog ──"
echo "  enriched-content-catalog.json (30MB)..."
curl -sf -o "src/data/enriched-content-catalog.json" "${S3_BASE}/enriched-content-catalog.json"

# 4. Per-universe data (universe.json, response.json, artist-albums.json)
echo ""
echo "── Per-Universe Data ──"
for u in bluenote gerwig pattismith pluribus sinners; do
  echo "  ${u}:"
  curl -sf -o "src/data/${u}-universe.json" "${S3_BASE}/${u}/${u}-universe.json"
  echo "    universe.json"
  curl -sf -o "src/data/${u}-response.json" "${S3_BASE}/${u}/${u}-response.json"
  echo "    response.json"
  curl -sf -o "src/data/${u}-artist-albums.json" "${S3_BASE}/${u}/artist-albums.json"
  echo "    artist-albums.json"
done

# 5. Blue Note special: Rudy Van Gelder albums
echo "  bluenote: rudy-van-gelder-albums.json"
curl -sf -o "src/data/rudy-van-gelder-albums.json" "${S3_BASE}/bluenote/rudy-van-gelder-albums.json"

# 6. Entity registries
echo ""
echo "── Entity Registries ──"
echo "  album-entity-registry.json"
curl -sf -o "src/data/album-entity-registry.json" "${S3_BASE}/album-entity-registry.json"
echo "  venue-entity-registry.json"
curl -sf -o "src/data/venue-entity-registry.json" "${S3_BASE}/venue-entity-registry.json"

echo ""
echo "═══ Done. All data refreshed from S3. ═══"
