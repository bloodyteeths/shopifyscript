#!/usr/bin/env bash
set -euo pipefail

# Append directive note to docs/PROOFKIT_ROADMAP_FINAL.md if not present
if ! grep -q "sole source of truth" docs/PROOFKIT_ROADMAP_FINAL.md 2>/dev/null; then
  cat >> docs/PROOFKIT_ROADMAP_FINAL.md <<'EOF'

---

> Handoff: Current batch finished green. From now on, use this file as the sole source of truth. Do not rewrite completed modules unless tests fail. Follow R0→R3 and M0→M9 with small diffs. Respect feature flags; CM_API stays OFF.
EOF
fi

# Check backend flags in code
if grep -q 'FEATURE_AI_DRAFTS' backend/server.js && grep -q 'ENABLE_SCRIPT' backend/server.js; then
  echo "Flags present in backend/server.js"
fi

echo "Handoff ready. Run smoke tests per PROOFKIT_ROADMAP_FINAL.md."


