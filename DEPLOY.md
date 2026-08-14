# 넥스트랙 배포 가이드

## 이 앱의 배포 제약 (딱 하나만 기억)
- 상태가 **메모리**에 있고 **WebSocket으로 좌석을 실시간 공유**합니다.
- 따라서 **반드시 단일 인스턴스 · 워커 1개**로 실행해야 합니다.
  - ❌ 오토스케일(여러 replica), ❌ 서버리스(Vercel/Netlify 함수) → WebSocket·공유 상태가 깨집니다.
  - ✅ 작은 인스턴스 하나면 동접 30명 데모에 충분합니다.
- 재배포/재시작하면 좌석·예약 상태는 초기화됩니다(데모용이라 정상). 영구 저장이 필요하면 나중에 DB 추가.

준비된 파일: `Dockerfile`, `Procfile`, `runtime.txt` — 어느 플랫폼이든 바로 됩니다.

## ★ Pterodactyl 패널에 배포 (선택하신 방법)

Pterodactyl은 앱을 컨테이너("서버")로 돌리고 **포트를 할당**합니다. 앱은 `0.0.0.0` + 그 할당 포트(`SERVER_PORT`)에 바인딩해야 하는데, `run.py`가 이제 `SERVER_PORT`를 자동 인식합니다.

### 1) 서버 생성
- 관리자 패널 → **Create Server**
- **Egg**: 파이썬용 egg 선택. 추천: parkervcp의 **Python Generic** egg
  (Docker 이미지: `ghcr.io/parkervcp/yolks:python_3.11`)
  - egg가 없으면: https://github.com/parkervcp/eggs → `generic/python` egg import
- 자원: 메모리 **512MB**, 디스크 1GB면 충분. 포트 1개 할당.

### 2) 파일 올리기 (`/home/container` 루트에)
컨테이너 작업폴더는 `/home/container`. 프로젝트 **내용물**(폴더째가 아니라 그 안의 `backend/`, `frontend/`, `svg/`, `requirements.txt`, `run.py` …)을 이 루트에 둡니다.
- **방법 A — Git**: 콘솔에서 `git clone https://github.com/<아이디>/nextrack.git .` (끝에 `.` 필수)
- **방법 B — SFTP**: 패널이 주는 SFTP 정보로 접속해 파일 업로드
- **방법 C — Python Generic egg 변수**: `GIT_ADDRESS`에 저장소 URL, `AUTO_UPDATE=1` 넣으면 부팅 시 자동 pull

### 3) 시작 명령(Startup) 설정
- **Python Generic egg를 쓰면** 변수만 채우면 됩니다:
  - `PY_FILE = run.py`
  - `REQUIREMENTS_FILE = requirements.txt` (부팅 시 자동 설치)
- **직접 명령을 넣는 egg면** Startup Command:
  ```
  pip install --no-cache-dir -r requirements.txt && python run.py
  ```
  (run.py가 `SERVER_PORT`로 바인딩 → 별도 포트 설정 불필요)
  - 매번 설치가 싫으면: `python run.py` 만 두고, install은 최초 1회만 콘솔에서 실행

### 4) 시작 & 접속
- **Start** → 콘솔에 `Uvicorn running on http://0.0.0.0:<port>` 뜨면 성공
- 접속: `http://<노드IP>:<할당포트>/`  · 관제: `.../live`
- 관객 폰도 같은 주소로 접속하면 좌석 실시간 공유됨 (이때는 `ws://`로 동작 — 코드가 자동 처리)

### 5) 도메인 + HTTPS(권장)
`http://IP:포트`도 데모엔 되지만, 깔끔한 주소·`wss` 보안 연결을 원하면 앞단에 **리버스 프록시**를 둡니다(같은 VPS의 nginx / Caddy / Cloudflare Tunnel):
```nginx
# nginx 예시 — 도메인 → 컨테이너 포트, WebSocket 업그레이드 포함
server {
  server_name nextrack.example.com;
  location / {
    proxy_pass http://127.0.0.1:<할당포트>;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;      # WebSocket
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_read_timeout 3600s;
  }
}
```
그 뒤 `certbot`으로 HTTPS 발급하면 프론트가 자동으로 `wss://`를 씁니다.

### 체크리스트
- [ ] 파일이 `/home/container` **루트**에 있나 (`ls`에 backend/ frontend/ requirements.txt 보여야 함)
- [ ] `backend/cache/paju_schools.json` 포함됐나 (학교 자동완성용)
- [ ] Python **3.10+** 이미지인가 (3.11 권장)
- [ ] 포트 바인딩이 `SERVER_PORT`인가 (콘솔 로그로 확인)
- [ ] 컨테이너 아웃바운드 인터넷 되나 (지도 지오코딩/경로용 — 보통 기본 허용)

---

## 0. (다른 방법용) GitHub에 올리기
```bash
git init
git add .
git commit -m "NEXTRACK 배포"
git branch -M main
git remote add origin https://github.com/<본인아이디>/nextrack.git
git push -u origin main
```
> `backend/cache/paju_schools.json`(파주 학교 목록)은 커밋에 포함되어야 합니다(.gitignore에서 제외 안 함 — OK).

## 1. Render (무료 · 글로벌) — 추천 입문
1. https://render.com → GitHub 연결 → **New → Web Service** → 이 저장소 선택
2. 설정: **Environment = Docker** (Dockerfile 자동 인식) / Instance = Free
3. Deploy → 몇 분 뒤 `https://nextrack-xxxx.onrender.com` 발급
- 무료 플랜은 15분 미사용 시 잠들었다가 첫 요청에 ~30초 깨어납니다. **발표 직전에 한 번 접속해 깨워두세요.** (월 $7면 항상 켜짐)

## 2. Cloudtype (한국 · 무료 · 한글 UI)
1. https://cloudtype.io → GitHub 연결 → 프로젝트 새로 만들기 → 저장소 선택
2. 빌드 방식 **Dockerfile** 선택 → 포트 `8000` → 배포
3. 발급된 도메인으로 접속

## 3. Fly.io (WebSocket 친화 · CLI)
```bash
# flyctl 설치 후
fly launch        # Dockerfile 감지, 앱 이름/지역(nrt=도쿄) 선택, DB는 No
fly deploy
```
- `fly.toml`에서 인스턴스 1개 유지(오토스케일 끄기).

## 환경변수 (선택)
| 변수 | 기본값 | 설명 |
|---|---|---|
| `PORT` | 8000 | 플랫폼이 자동 주입 |
| `NEIS_KEY` | (하드코딩됨) | 나이스 키 교체 시 |
| `NEXTRACK_ADMIN_TOKEN` | `demo-reset` | 관제 대시보드 리셋/시뮬 토큰 |

> ⚠️ `NEXTRACK_ADMIN_TOKEN`을 바꾸면 `frontend/live.html`의 `const TOKEN` 값도 같이 바꿔야 대시보드 버튼이 동작합니다. 데모면 기본값 그대로 두는 게 편합니다.

## 배포 후 체크
- `https://도메인/` — 앱, `https://도메인/live` — 관제 대시보드
- 관객은 각자 폰으로 그 도메인 접속 → 좌석 실시간 공유
- 지도(OSM/Nominatim/OSRM)·폰트·Leaflet은 사용자의 브라우저에서 인터넷으로 로드됩니다(HTTPS 자동).

## 실서비스로 키울 때(나중에)
- 좌석/예약을 **DB(예: Postgres, Redis)** 로 이전 → 재시작에도 유지 + 다중 인스턴스 가능(Redis pub/sub로 WS 브로드캐스트).
- 지도 경로는 공개 데모 서버(OSRM/Nominatim) 대신 **자체 호스팅 또는 카카오/네이버 지도**로 교체(트래픽 한도).
