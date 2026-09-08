#!/bin/bash
# 최신 KEEP개 GitHub Release만 남기고 나머지(과거 버전)는 release + tag를 삭제한다.
# electron-updater의 차등 업데이트는 "설치된 로컬 파일 vs 최신 릴리즈의 blockmap"만 비교하므로
# 과거 릴리즈를 지워도 자동 업데이트 동작에는 영향이 없다.
set -euo pipefail

KEEP=5
REPO="SteveKim0513/mac-shortcut-manager"
TOKEN="$(gh auth token --hostname github.com --user SteveKim0513)"

TAGS=$(GH_TOKEN="$TOKEN" gh release list -R "$REPO" --limit 100 --json tagName,createdAt \
  --jq 'sort_by(.createdAt) | reverse | .[].tagName')

COUNT=0
while IFS= read -r TAG; do
  [ -z "$TAG" ] && continue
  COUNT=$((COUNT + 1))
  if [ "$COUNT" -le "$KEEP" ]; then
    echo "유지: $TAG"
  else
    echo "삭제: $TAG"
    GH_TOKEN="$TOKEN" gh release delete "$TAG" -R "$REPO" --cleanup-tag -y
  fi
done <<< "$TAGS"
