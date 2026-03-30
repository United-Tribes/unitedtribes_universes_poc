#!/bin/bash
# Pull latest data from S3 — run from repo root
# Usage: bash pull-data.sh

S3_BASE="http://unitedtribes-visualizations-1758769416.s3-website-us-east-1.amazonaws.com/universe-data"

echo "Pulling data from S3..."

# Video entity indexes (per-universe)
for u in blue-note pluribus sinners patti-smith greta-gerwig; do
  echo "  Video index: ${u}"
  curl -sf -o "src/data/${u}-video-entity-index.json" "${S3_BASE}/video-indexes/${u}-video-entity-index.json"
done

# All-video entity index (complete — all 815+ videos across all universes)
echo "  All-video entity index (37MB)..."
curl -sf -o "src/data/all-video-entity-index.json" "${S3_BASE}/all-video-entity-index.json"

# Enriched content catalog (discovery playlists, works discussed, media assets)
echo "  Enriched content catalog (30MB)..."
curl -sf -o "src/data/enriched-content-catalog.json" "${S3_BASE}/enriched-content-catalog.json"

echo "Done."
