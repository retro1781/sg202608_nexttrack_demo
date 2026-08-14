# 넥스트랙 NEXTRACK — 시연용 프로토타입

북파주 학생 안심 하교 셔틀 좌석 매칭 서비스. 창업경진대회 시연용 FastAPI 프로토타입.
세경고 말랑연구소.

## 핵심 시연 포인트

1. **실시간 공유 좌석맵** — 관객 여러 명이 각자 폰으로 접속해 좌석을 잡으면 **모두의 화면에서 좌석이 실시간으로 채워집니다** (WebSocket 브로드캐스트). 상단 `접속 N` 배지로 동접자 수도 실시간 표시.
2. **노선 후보 자동 개설** — 15명 모이면 자동 개설. `참여하기`를 누르면 진행률이 모두에게 실시간 반영.
3. **탑승 QR** — 예약 시 실제 스캔 가능한 QR(segno)을 발급.

유저 플로우: 로그인 → **홈(고속버스 앱 스타일: 출발/도착 주소검색·하교시간 선택)** → 노선 조회 → **실시간 좌석 선택** → (모의)결제 → 내 탑승권 + 탑승 QR → 노선 후보 참여.

- 출발지·도착지: **다음(카카오) 우편번호 서비스** 임베드로 실제 주소 검색 (오프라인 시 직접입력 폴백).
- 하교시간: 바텀시트에서 선택 (정규/보충/야자 시간대).
- 홈 하단 탭바 + **내 탑승권 보기**(예약 QR 재확인).
- 결제수단은 **"테스트용 카드(실결제 X)"** — 실제 금융 거래 없음.

## 실행

```bash
pip install -r requirements.txt
python run.py
```

브라우저에서 http://localhost:8000

### 관객 참여형 시연 (추천)

발표자 노트북에서 서버를 켜고, 노트북 IP를 확인한 뒤(예: `ipconfig`) 같은 와이파이의
관객 폰에서 `http://<발표자IP>:8000` 접속. 각자 좌석을 잡으면 발표 화면 좌석맵이
실시간으로 채워지는 장면을 연출할 수 있습니다.

### 발표자용 실시간 관제 대시보드 — `http://localhost:8000/live`

큰 화면(프로젝터)에 띄워두는 **관제 대시보드**. 접속자 수, 노선별 좌석 채워짐,
탑승(보호자 알림) 건수, 노선 후보 진행률과 **실시간 활동 피드**가 라이브로 갱신됩니다.

- **시뮬레이션 시작** 버튼: 관객이 적어도 봇이 자동으로 좌석을 예약하며 화면이 살아 움직입니다.
- **초기화** 버튼: 좌석/후보/피드를 처음 상태로 되돌립니다.

### 탑승 체크인 → 보호자 안심 알림 (핵심 차별점 시연)

예약 완료(탑승권) 화면의 **"🚌 탑승하기"** 버튼을 누르면, 보호자에게 전송되는
안심 알림(모의 푸시)이 그 자리에서 뜹니다 — "○○ 학생이 안전하게 탑승했어요".
관제 대시보드 활동 피드에도 즉시 반영됩니다.

### URL 경로

각 화면은 실제 경로를 가집니다: `/`(로그인) · `/home` · `/search` · `/seat` ·
`/checkout` · `/ticket` · `/candidate` · `/live`(관제). 새로고침·뒤로가기·딥링크 지원.

## 발표 사이 초기화

좌석/후보 상태를 처음으로 되돌리려면:

```bash
curl -X POST http://localhost:8000/api/admin/reset -H "Content-Type: application/json" -d "{\"token\":\"demo-reset\"}"
```

토큰은 `NEXTRACK_ADMIN_TOKEN` 환경변수로 변경 가능.

## 동접 30명 최적화

- 상태 전부 **인메모리** (DB 없음) → 지연 0, 의존성 최소.
- 단일 이벤트 루프 async 처리, 좌석 변경만 `asyncio.Lock`으로 직렬화(더블부킹 방지).
- 브로드캐스트는 죽은 소켓 즉시 정리 + **델타 payload**(변경된 좌석 1건만) 전송.
- 정적 파일은 `StaticFiles`(ETag/Last-Modified)로 서빙, Pretendard는 CDN 캐시.

## 구조

```
backend/
  main.py     FastAPI 앱 · REST · WebSocket 허브 · QR
  state.py    인메모리 상태(노선·좌석·후보·예약)
frontend/
  index.html         앱 셸 (폰 프레임 + 상태바 + #app 마운트 + 토스트)
  styles.css         디자인 토큰(프리로 앱 목업)
  js/
    main.js          엔트리: 라우트 등록 · 전역 네비 · WS 연결
    store.js         전역 상태 + WebSocket + 액션(pub/sub)
    router.js        경량 SPA 라우터(한 번에 한 페이지 마운트)
    ui.js            토스트 · 모달(팝업)
    util.js          DOM 헬퍼
    components/      addressSearch(다음 주소) · timeSheet · seatMap
    pages/           login · home · results · seat · payment · ticket · candidate
run.py               uvicorn 실행
```

## API 요약

| Method | Path | 설명 |
|---|---|---|
| GET | `/api/routes` | 노선 검색(시드 반환) |
| GET | `/api/routes/{id}` | 노선 상세 + 좌석맵 |
| POST | `/api/book` | 좌석 예약(Lock, 더블부킹 방지) |
| GET | `/api/booking/{id}` | 예약 조회 |
| GET | `/api/booking/{id}/qr.svg` | 탑승 QR (SVG) |
| POST | `/api/booking/{id}/board` | 탑승 체크인 → 보호자 알림 |
| GET | `/api/candidate` | 노선 후보 현황 |
| POST | `/api/candidate/join` | 후보 참여(+1) |
| POST | `/api/admin/reset` | 상태 초기화(토큰) |
| POST | `/api/admin/sim` | 봇 시뮬레이션 시작/정지(토큰) |
| GET | `/live` | 발표자용 실시간 관제 대시보드 |
| WS  | `/ws` | 스냅샷 + 좌석/후보/활동/접속자 실시간 |

> 결제는 시연용 **모의 처리**입니다(실제 금융 거래 없음).
