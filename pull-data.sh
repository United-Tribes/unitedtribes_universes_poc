#!/bin/bash
# Pull latest assembled universe data from S3 into src/data/
# Run from the POC repo root: bash pull-data.sh
#
# S3 is the canonical source for assembled data. Justin pushes
# updated data there after running the harvester pipeline.

S3_BASE="http://unitedtribes-visualizations-1758769416.s3-website-us-east-1.amazonaws.com/universe-data"
DATA_DIR="$(dirname "$0")/src/data"

UNIVERSES="gerwig sinners pluribus bluenote pattismith"

echo "Pulling latest universe data from S3..."
echo ""

for u in $UNIVERSES; do
  printf "  %-12s " "$u"
  curl -sf -o "${DATA_DIR}/${u}-universe.json" "${S3_BASE}/${u}/${u}-universe.json" && \
  curl -sf -o "${DATA_DIR}/${u}-response.json" "${S3_BASE}/${u}/${u}-response.json" && \
  echo "✅" || echo "❌ (not found on S3)"
done

echo ""
echo "Done. Restart your dev server to pick up changes."
