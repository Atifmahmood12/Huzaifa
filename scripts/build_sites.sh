#!/usr/bin/env bash
set -euo pipefail

# Simple build: assemble out/ with common assets and per-site folders
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT_DIR/out"

echo "Building sites into $OUT"
rm -rf "$OUT"
mkdir -p "$OUT"

# copy shared assets and categories
cp -R "$ROOT_DIR/assets" "$OUT/"
cp "$ROOT_DIR/categories.json" "$OUT/" 2>/dev/null || true

# Build each site under sites/* -> out/<SiteName>/
for site_dir in "$ROOT_DIR"/sites/*; do
  [ -d "$site_dir" ] || continue
  site_name=$(basename "$site_dir")
  dest="$OUT/$site_name"
  mkdir -p "$dest"
  echo " - Copying $site_name -> $dest"
  cp -R "$site_dir"/* "$dest/" 2>/dev/null || true
  # If the site has an index.html, also copy it to out/index.html for root if site is huzaifa
  if [ "$site_name" = "huzaifa" ] && [ -f "$dest/index.html" ]; then
    cp "$dest/index.html" "$OUT/index.html"
  fi
done

echo "Build complete. Output: $OUT"
