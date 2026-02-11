#!/bin/bash
set -e

echo "Building..."
npm run build

echo "Deploying to S3..."
aws s3 sync dist/ s3://unitedtribes-universes-poc --delete

echo "Done! ✓"
