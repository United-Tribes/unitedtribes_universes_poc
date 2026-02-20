#!/bin/bash
set -e

echo "Building..."
npm run build

echo "Deploying to S3..."
aws s3 cp dist/ s3://unitedtribes-visualizations-1758769416/universes-poc/ --recursive

echo "Done! ✓"
echo "Live at: http://unitedtribes-visualizations-1758769416.s3-website-us-east-1.amazonaws.com/universes-poc/index.html"
