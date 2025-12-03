#!/usr/bin/env bash

set -euo pipefail

pnpm install --frozen-lockfile
pnpm exec playwright install-deps
pnpm exec playwright install
pnpm run -r build
pnpm deploy --filter=@cloudydaiyz/furu-controller-app --prod prod/controller
cd prod/controller
pm2 start dist/index.js --name "controller"