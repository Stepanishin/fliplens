#!/usr/bin/env bash
# Smoke test: eBay OAuth (client credentials) + Browse search on EBAY_DE.
# Usage: scripts/ebay-smoke.sh [query]   (reads keys from .env)
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; source .env; set +a

: "${EBAY_CLIENT_ID:?EBAY_CLIENT_ID missing in .env}"
: "${EBAY_CLIENT_SECRET:?EBAY_CLIENT_SECRET missing in .env}"
QUERY="${1:-Sony WH-1000XM4}"

TOKEN_JSON=$(curl -sS -X POST "https://api.ebay.com/identity/v1/oauth2/token" \
  -u "${EBAY_CLIENT_ID}:${EBAY_CLIENT_SECRET}" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope")

TOKEN=$(printf '%s' "$TOKEN_JSON" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s);if(!j.access_token){console.error("Token error:",s);process.exit(1)}process.stdout.write(j.access_token)})')
echo "OAuth OK"

curl -sS -G "https://api.ebay.com/buy/browse/v1/item_summary/search" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "X-EBAY-C-MARKETPLACE-ID: EBAY_DE" \
  --data-urlencode "q=${QUERY}" \
  --data-urlencode "limit=10" \
| node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s);if(j.errors){console.error(JSON.stringify(j.errors,null,2));process.exit(1)}console.log("total:",j.total);for(const i of j.itemSummaries??[])console.log(`${i.price?.value} ${i.price?.currency} | ${i.condition} | ${i.itemLocation?.country} | ${i.title}`)})'
