# 넥스트랙 배포용 이미지 (Fly.io / Render / Cloudtype / 어떤 곳이든)
FROM python:3.11-slim

WORKDIR /app

# 의존성 먼저 (레이어 캐시)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 앱 전체 (backend / frontend / svg / backend/cache 포함)
COPY . .

ENV PORT=8000
EXPOSE 8000

# ⚠️ 인메모리 상태 + WebSocket 공유이므로 반드시 워커 1개(단일 인스턴스)
CMD ["sh", "-c", "uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1 --ws-ping-interval 20 --ws-ping-timeout 20"]
