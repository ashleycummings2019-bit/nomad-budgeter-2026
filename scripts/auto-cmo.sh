#!/bin/bash
for i in {1..8}; do
  echo "========== Running CMO Batch $i =========="
  node --env-file=.env scripts/cmo-content-generator.mjs
  git add src/blog/*.md
  if ! git diff --cached --quiet; then
    git commit -m "feat(content): Tier 2 auto-batch $i"
    git push
  else
    echo "Nothing new to commit."
  fi
  sleep 5
done
echo "Auto-batching complete."
