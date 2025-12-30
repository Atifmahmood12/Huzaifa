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
  site_key=$(basename "$site_dir")
  # try to read human-friendly siteName from config.json (falls back to folder name)
  pretty_name="$(sed -n 's/.*"siteName"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$site_dir/config.json" 2>/dev/null || true)"
  if [ -z "$pretty_name" ]; then
    pretty_name="$site_key"
  fi

  dest="$OUT/$pretty_name"
  mkdir -p "$dest"
  echo " - Copying $site_key -> $dest"
  cp -R "$site_dir"/* "$dest/" 2>/dev/null || true
done

# Note: do not create a root index.html; publish sites under their named folders (e.g. /Haris/ and /Huzaifa/)

echo "Build complete. Output: $OUT"
