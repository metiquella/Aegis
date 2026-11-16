#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
echo "== training report =="
node --experimental-strip-types src/cli.ts
echo
echo "== scoring the suspicious example =="
node --experimental-strip-types src/cli.ts score "$(cat examples/suspicious-transaction.json)"
