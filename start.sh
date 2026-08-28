#!/usr/bin/env bash
# Pterodactyl 시작 스크립트 — 재시작할 때마다 GitHub 최신 코드로 자동 업데이트 후 실행.
# 패널 Startup 명령에서 이 파일을 호출한다. (GIT_TOKEN 은 패널 환경변수로 주입)
set -e
export GIT_TERMINAL_PROMPT=0   # 인증 실패 시 멈추지 말고 에러 내고 넘어감

REPO="https://x-access-token:${GIT_TOKEN}@github.com/retro1781/sg202608_nexttrack_demo.git"

# 1) 최신 코드로 강제 동기화 (머지 편집기·충돌 없이)
git remote set-url origin "$REPO"
git fetch origin
git reset --hard origin/main

# 2) 의존성 설치 후 실행
pip install --user --no-cache-dir -r requirements.txt
exec python run.py
