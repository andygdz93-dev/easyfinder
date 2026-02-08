#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-https://easyfinder.fly.dev}"
ORIGIN="${ORIGIN:-https://easyfinder.vercel.app}"

curl -i -X OPTIONS "${BASE_URL}/api/auth/login" \
  -H "Origin: ${ORIGIN}" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Authorization, Content-Type"

echo "----"

curl -i -X OPTIONS "${BASE_URL}/api/auth/register" \
  -H "Origin: ${ORIGIN}" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Authorization, Content-Type"
