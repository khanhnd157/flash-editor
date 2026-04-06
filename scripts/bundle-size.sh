#!/bin/bash
# Bundle size audit script — run after `pnpm -r build`

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'

FAIL=0

check_size() {
  local name=$1
  local path=$2
  local max_kb=$3

  if [ ! -f "$path" ]; then
    echo -e "${YELLOW}SKIP${NC} $name — not found"
    return
  fi

  local raw=$(wc -c < "$path")
  local gzip=$(gzip -c "$path" | wc -c)
  local gzip_kb=$(awk "BEGIN{printf \"%.1f\", $gzip/1024}")
  local raw_kb=$(awk "BEGIN{printf \"%.1f\", $raw/1024}")
  local max_bytes=$((max_kb * 1024))

  if (( gzip > max_bytes )); then
    echo -e "${RED}FAIL${NC} $name: ${gzip_kb}KB gzip (max ${max_kb}KB) [raw ${raw_kb}KB]"
    FAIL=1
  else
    echo -e "${GREEN}PASS${NC} $name: ${gzip_kb}KB gzip (max ${max_kb}KB) [raw ${raw_kb}KB]"
  fi
}

echo "=== Flash Editor Bundle Size Audit ==="
echo ""

check_size "@flash/model"         "packages/model/dist/index.mjs"         10
check_size "@flash/state"         "packages/state/dist/index.mjs"         3
check_size "@flash/transform"     "packages/transform/dist/index.mjs"     3
check_size "@flash/view"          "packages/view/dist/index.mjs"          15
check_size "@flash/core"          "packages/core/dist/index.mjs"          4
check_size "@flash/commands"      "packages/commands/dist/index.mjs"      3
check_size "@flash/i18n"          "packages/i18n/dist/index.mjs"          2
check_size "@flash/ui"            "packages/ui/dist/index.mjs"            20
check_size "@flash/theme-default" "packages/theme-default/dist/index.mjs" 3
check_size "@flash/theme-notion"  "packages/theme-notion/dist/index.mjs"  3
check_size "@flash/theme-docs"    "packages/theme-docs/dist/index.mjs"    3
check_size "@flash/templates"     "packages/templates/dist/index.mjs"     5

echo ""
if [ $FAIL -ne 0 ]; then
  echo -e "${RED}Bundle size audit FAILED${NC}"
  exit 1
else
  echo -e "${GREEN}All packages within size budgets!${NC}"
fi
