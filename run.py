"""넥스트랙 데모 실행 스크립트.

    python run.py            # 기본 0.0.0.0:8000
    HOST=0.0.0.0 PORT=8000 python run.py

시연 팁: 같은 와이파이의 관객 폰에서 http://<발표자IP>:8000 으로 접속하면
좌석이 실시간으로 채워지는 것을 함께 볼 수 있습니다.
동접 30명은 단일 워커(현재 설정)로 충분합니다.
"""
import os
import uvicorn

# PORT(일반 PaaS) 또는 SERVER_PORT(Pterodactyl) 자동 인식
PORT = int(os.environ.get("PORT") or os.environ.get("SERVER_PORT") or 8000)

if __name__ == "__main__":
    uvicorn.run(
        "backend.main:app",
        host=os.environ.get("HOST", "0.0.0.0"),
        port=PORT,
        workers=1,          # 인메모리 공유 상태이므로 단일 워커 (동접 30명엔 충분)
        log_level="info",
        ws_ping_interval=20,
        ws_ping_timeout=20,
    )
