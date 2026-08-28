#!/usr/bin/env bash
# 의존성 설치 후 앱 실행. (git 최신화는 패널 Startup 명령에서 먼저 수행)
set -e
pip install --user --no-cache-dir -r requirements.txt
exec python run.py
