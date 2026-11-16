#!/bin/sh
# Create + merge one PR. Args: branch title body
set -eu
TOK=$(grep '^password=' "${SESSION_HOME:-$HOME}/.local/share/kilo/cloud-agent/git-credentials" | head -1 | cut -d= -f2-)
API="https://api.github.com/repos/metiquella/Aegis"
HEAD="$1"; TITLE="$2"; BODY="$3"
RESP=$(curl -s -X POST -H "Authorization: token $TOK" -H "Accept: application/vnd.github+json" \
  "$API/pulls" -d "{\"title\":\"$TITLE\",\"head\":\"$HEAD\",\"base\":\"main\",\"body\":\"$BODY\"}")
NUM=$(printf '%s' "$RESP" | grep -o '"number": *[0-9]*' | head -1 | grep -o '[0-9]*')
if [ -z "$NUM" ]; then echo "CREATE FAILED [$HEAD]: $(printf '%s' "$RESP" | head -c 200)"; exit 1; fi
echo "created PR #$NUM ($TITLE)"
sleep 1
curl -s -X PUT -H "Authorization: token $TOK" -H "Accept: application/vnd.github+json" \
  "$API/pulls/$NUM/merge" -d '{"merge_method":"squash"}' | grep -o '"merged": *[a-z]*\|"message": *"[^"]*"' | head -2