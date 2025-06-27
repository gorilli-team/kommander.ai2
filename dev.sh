#!/usr/bin/env bash
# Install project dependencies and verify linting and types
set -euo pipefail

npm install
npm run lint
npm run typecheck
