"""
넥스트랙(NEXTRACK) · 프리로 — 창업경진대회 시연용 프로토타입 백엔드.

FastAPI + WebSocket. 핵심 시연 포인트:
  1) 실시간 공유 좌석맵 — 관객 여러 명이 각자 폰으로 접속해 좌석을 잡으면
     모두의 화면에서 좌석이 실시간으로 채워진다 (WebSocket 브로드캐스트).
  2) 노선 후보 모집 — 15명 모이면 자동 개설. 참여 버튼을 누르면 카운트가 오른다.
  3) 탑승 QR — 예약 시 실제 스캔 가능한 QR(segno) 발급.

동접 30명 최적화:
  - 상태는 전부 인메모리 (DB 없음) → I/O 지연 0.
  - 단일 이벤트 루프에서 async 처리, 좌석 변경만 asyncio.Lock 으로 직렬화.
  - 브로드캐스트는 죽은 소켓을 즉시 걷어내고 payload 를 최소화(델타 위주).
  - 정적 파일은 StaticFiles(ETag/Last-Modified 자동)로 서빙.
"""
from __future__ import annotations

import asyncio
import io
import json
import secrets
import urllib.parse
import urllib.request
from pathlib import Path

import segno
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Query
from fastapi.responses import Response, JSONResponse, FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from starlette.exceptions import HTTPException as StarletteHTTPException

from .state import Store

# 발표자용 리셋 토큰 (기본값은 데모용, 환경변수로 덮어쓰기 권장)
import os
ADMIN_TOKEN = os.environ.get("NEXTRACK_ADMIN_TOKEN", "demo-reset")

# 나이스(NEIS) OpenAPI 키 — 하드코딩(환경변수로 덮어쓰기 가능)
NEIS_KEY = os.environ.get("NEIS_KEY", "2ff325e81ec94cbd818f9c024d3efe4f")

FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"
SVG_DIR = Path(__file__).resolve().parent.parent / "svg"   # 브랜드 로고 SVG
SCHOOL_CACHE = Path(__file__).resolve().parent / "cache" / "paju_schools.json"

# 파주 읍·면·동 (도착 지역 자동완성용) — 권역별 그룹
PAJU_REGION_GROUPS = [
    {"label": "운정·교하 신도시", "items": [
        "운정1동", "운정2동", "운정3동", "운정4동", "운정5동", "운정6동",
        "교하동", "야당동", "와동동", "목동동", "동패동", "다율동", "상지석동", "하지석동",
        "문발동", "서패동", "산남동", "송촌동", "당하동", "신촌동", "연다산동", "오도동",
    ]},
    {"label": "금촌·조리권", "items": [
        "금촌1동", "금촌2동", "금촌3동", "아동동", "야동동", "금릉동", "검산동", "맥금동",
        "조리읍", "월롱면",
    ]},
    {"label": "문산·법원·북파주", "items": [
        "문산읍", "파주읍", "법원읍", "광탄면", "탄현면", "파평면", "적성면", "군내면",
    ]},
]
PAJU_REGIONS = [x for g in PAJU_REGION_GROUPS for x in g["items"]]

# 파주 학교 목록 — 사전 프리페치 캐시 로드(없으면 소형 폴백)
PAJU_SCHOOLS_FALLBACK = [
    "세경고등학교", "운정고등학교", "한빛고등학교", "지산고등학교", "문산고등학교",
    "문산제일고등학교", "파주고등학교", "봉일천고등학교", "교하고등학교", "야당고등학교",
    "한민고등학교", "광탄고등학교", "삼광고등학교", "동패고등학교", "가온고등학교",
]
def _norm_schools(raw) -> list[dict]:
    out = []
    for it in raw:
        if isinstance(it, dict):
            out.append({"name": it.get("name", ""), "addr": it.get("addr", "")})
        else:
            out.append({"name": it, "addr": ""})
    return [x for x in out if x["name"]]


try:
    PAJU_SCHOOLS: list[dict] = _norm_schools(json.loads(SCHOOL_CACHE.read_text(encoding="utf-8")))
except Exception:
    PAJU_SCHOOLS = _norm_schools(PAJU_SCHOOLS_FALLBACK)


def _neis_paju_schools(q: str) -> list[dict]:
    """온디맨드 NEIS 조회(캐시에 없을 때 폴백). 파주 소재만. {name, addr}."""
    url = ("https://open.neis.go.kr/hub/schoolInfo?"
           + urllib.parse.urlencode({"KEY": NEIS_KEY, "Type": "json",
                                     "pIndex": 1, "pSize": 60, "SCHUL_NM": q}))
    with urllib.request.urlopen(url, timeout=6) as r:
        data = json.loads(r.read().decode("utf-8"))
    info = data.get("schoolInfo")
    if not info or len(info) < 2:
        return []
    out = []
    for row in info[1].get("row", []):
        addr = (row.get("ORG_RDNMA") or "").strip()
        if "파주시" in addr:
            name = row.get("SCHUL_NM", "")
            if name:
                out.append({"name": name, "addr": addr})
    return out

app = FastAPI(title="NEXTRACK Demo", docs_url="/api/docs", openapi_url="/api/openapi.json")
store = Store()


# ──────────────────────────────────────────────────────────────
#  WebSocket 연결 관리 + 브로드캐스트
# ──────────────────────────────────────────────────────────────
class Hub:
    def __init__(self) -> None:
        self.active: set[WebSocket] = set()

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        self.active.add(ws)

    def disconnect(self, ws: WebSocket) -> None:
        self.active.discard(ws)

    @property
    def online(self) -> int:
        return len(self.active)

    async def broadcast(self, message: dict) -> None:
        if not self.active:
            return
        dead: list[WebSocket] = []
        # gather 로 병렬 전송, 실패한 소켓은 정리
        async def _send(ws: WebSocket) -> None:
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)

        await asyncio.gather(*(_send(ws) for ws in list(self.active)))
        for ws in dead:
            self.active.discard(ws)


hub = Hub()


@app.on_event("startup")
async def _quiet_windows_disconnects() -> None:
    """윈도우 asyncio(Proactor)에서 클라이언트가 소켓을 급히 끊을 때 나오는
    ConnectionResetError 트레이스백을 무음 처리. 동접 30명이 접속/이탈을
    반복해도 콘솔이 지저분해지지 않게 한다. (기능에는 영향 없음)"""
    loop = asyncio.get_running_loop()
    default = loop.get_exception_handler()

    def handler(loop, context):  # noqa: ANN001
        exc = context.get("exception")
        if isinstance(exc, (ConnectionResetError, ConnectionAbortedError)):
            return
        if default:
            default(loop, context)
        else:
            loop.default_exception_handler(context)

    loop.set_exception_handler(handler)


async def broadcast_presence() -> None:
    await hub.broadcast({"type": "presence", "online": hub.online})


# ──────────────────────────────────────────────────────────────
#  REST API
# ──────────────────────────────────────────────────────────────
@app.get("/api/health")
async def health() -> dict:
    return {"ok": True, "online": hub.online}


@app.get("/api/schools")
async def schools(q: str = Query(default="")) -> dict:
    """학교명 자동완성 — 사전 프리페치한 파주 학교 캐시(이름+주소)에서 부분일치.
    캐시에 없으면 NEIS 온디맨드 조회로 보완."""
    ql = q.strip()
    if not ql:
        items = PAJU_SCHOOLS[:20]
    else:
        items = [s for s in PAJU_SCHOOLS if ql in s["name"]]
        if not items:
            try:
                items = await asyncio.to_thread(_neis_paju_schools, ql)
            except Exception:
                items = []

    def short_addr(a: str) -> str:
        return a.replace("경기도 ", "", 1)  # 표시용으로 '경기도 ' 접두 제거

    seen, uniq = set(), []
    for s in items:
        if s["name"] not in seen:
            seen.add(s["name"])
            uniq.append({"name": s["name"], "addr": short_addr(s.get("addr", ""))})
    return {"items": uniq[:20]}


@app.get("/api/regions")
async def regions(q: str = Query(default="")) -> dict:
    """파주 읍·면·동 자동완성 — 권역 그룹으로 반환."""
    ql = q.strip()
    groups = []
    for g in PAJU_REGION_GROUPS:
        items = [r for r in g["items"] if (not ql or ql in r)]
        if items:
            groups.append({"label": g["label"], "items": items})
    return {"groups": groups}


# 지오코딩(주소→좌표) — OSM Nominatim, 서버에서 호출하고 메모리 캐시
_geocode_cache: dict[str, dict] = {}


def _nominatim(q: str) -> dict | None:
    url = "https://nominatim.openstreetmap.org/search?" + urllib.parse.urlencode(
        {"q": q, "format": "json", "limit": 1, "countrycodes": "kr"})
    req = urllib.request.Request(url, headers={"User-Agent": "nextrack-demo/0.1 (school shuttle demo)"})
    with urllib.request.urlopen(req, timeout=7) as r:
        arr = json.loads(r.read().decode("utf-8"))
    if not arr:
        return None
    return {"lat": float(arr[0]["lat"]), "lon": float(arr[0]["lon"])}


@app.get("/api/geocode")
async def geocode(q: str = Query(default="")) -> dict:
    ql = q.strip()
    if not ql:
        return {"ok": False}
    if ql in _geocode_cache:
        return _geocode_cache[ql]
    try:
        res = await asyncio.to_thread(_nominatim, ql)
    except Exception:
        res = None
    out = {"ok": bool(res), **(res or {})}
    if res:
        _geocode_cache[ql] = out
    return out


# 도로 경로(OSRM) — 실시간 위치가 길을 따라가도록. 서버 호출 + 캐시.
_route_cache: dict[tuple, dict] = {}


def _osrm(o: tuple, d: tuple) -> dict | None:
    url = (f"https://router.project-osrm.org/route/v1/driving/"
           f"{o[1]},{o[0]};{d[1]},{d[0]}?overview=full&geometries=geojson")
    req = urllib.request.Request(url, headers={"User-Agent": "nextrack-demo/0.1"})
    with urllib.request.urlopen(req, timeout=8) as r:
        data = json.loads(r.read().decode("utf-8"))
    routes = data.get("routes") or []
    if not routes:
        return None
    coords = [[c[1], c[0]] for c in routes[0]["geometry"]["coordinates"]]  # [lon,lat]→[lat,lon]
    return {"coords": coords, "distance": routes[0].get("distance"), "duration": routes[0].get("duration")}


@app.get("/api/route")
async def route_geo(o: str = Query(default=""), d: str = Query(default="")) -> dict:
    try:
        olat, olon = (float(x) for x in o.split(","))
        dlat, dlon = (float(x) for x in d.split(","))
    except Exception:
        return {"ok": False}
    key = (round(olat, 5), round(olon, 5), round(dlat, 5), round(dlon, 5))
    if key in _route_cache:
        return _route_cache[key]
    try:
        res = await asyncio.to_thread(_osrm, (olat, olon), (dlat, dlon))
    except Exception:
        res = None
    out = {"ok": bool(res), **(res or {})}
    if res:
        _route_cache[key] = out
    return out


@app.get("/api/routes")
async def search_routes(
    mode: str = Query(default="하교"),
    region: str = Query(default="문산읍"),
    school: str = Query(default="세경고등학교"),
    time: str = Query(default=""),
) -> dict:
    """등교/하교 + 지역 + 학교 기반으로 여러 노선을 반환(없으면 생성)."""
    mode = mode if mode in ("등교", "하교") else "하교"
    async with store.lock:
        before = len(store.routes)
        routes = store.routes_for(mode, region, school)
        grew = len(store.routes) > before
        summaries = [r.summary() for r in routes]
    if grew:
        # 새 지역 노선이 생성되면 대시보드/다른 접속자에게도 반영
        await hub.broadcast(store.snapshot(hub.online))
    return {
        "query": {"mode": mode, "region": region, "school": school, "time": time},
        "routes": summaries,
        "online": hub.online,
    }


@app.get("/api/routes/{route_id}")
async def route_detail(route_id: str) -> dict:
    route = store.routes.get(route_id)
    if route is None:
        raise HTTPException(status_code=404, detail="route not found")
    return route.detail()


class BookReq(BaseModel):
    routeId: str
    seatNo: int
    nickname: str = "학생"


@app.post("/api/book")
async def book(req: BookReq) -> JSONResponse:
    async with store.lock:  # 더블부킹 방지
        nickname = req.nickname[:12] or "학생"
        booking = store.book_seat(req.routeId, req.seatNo, nickname)
        if booking is None:
            route = store.routes.get(req.routeId)
            remaining = route.remaining() if route else 0
            raise HTTPException(
                status_code=409,
                detail={"message": "이미 예약된 좌석이거나 잘못된 좌석입니다.", "remaining": remaining},
            )
        route = store.routes[req.routeId]
        remaining = route.remaining()
        activity = store.add_activity("book", f"{nickname}님이 {route.code} {req.seatNo}번 좌석 예약")

    # 잠금 밖에서 브로드캐스트 (좌석 델타 + 활동 피드)
    await hub.broadcast({
        "type": "seat",
        "routeId": req.routeId,
        "seatNo": req.seatNo,
        "status": "booked",
        "remaining": remaining,
    })
    await hub.broadcast({"type": "activity", "item": activity, "stats": store.stats()})
    return JSONResponse({
        "bookingId": booking.id,
        "routeId": booking.route_id,
        "seatNo": booking.seat_no,
        "token": booking.token,
        "route": route.summary(),
        "remaining": remaining,
    })


@app.get("/api/booking/{booking_id}")
async def get_booking(booking_id: str) -> dict:
    b = store.bookings.get(booking_id)
    if b is None:
        raise HTTPException(status_code=404, detail="booking not found")
    route = store.routes.get(b.route_id)
    return {
        "bookingId": b.id,
        "routeId": b.route_id,
        "seatNo": b.seat_no,
        "nickname": b.nickname,
        "token": b.token,
        "boarded": b.boarded,
        "route": route.summary() if route else None,
    }


@app.post("/api/booking/{booking_id}/board")
async def board(booking_id: str) -> dict:
    """탑승 체크인 → 보호자 안심 알림 트리거(시연). 활동 피드에 반영."""
    async with store.lock:
        b = store.board(booking_id)
        if b is None:
            raise HTTPException(status_code=404, detail="booking not found")
        route = store.routes.get(b.route_id)
        activity = store.add_activity("board", f"{b.nickname}님 탑승 완료 · 보호자 알림 발송")
    depart = f"{route.depart} {route.depart_spot}" if route else "정류장"
    notice = f"[넥스트랙] {b.nickname}님이 {depart}에서 안전하게 탑승했어요. 실시간 위치로 이동 중입니다 🚌"
    await hub.broadcast({"type": "activity", "item": activity, "stats": store.stats()})
    return {"ok": True, "boarded": True, "guardianNotice": notice}


@app.get("/api/booking/{booking_id}/qr.svg")
async def booking_qr(booking_id: str) -> Response:
    b = store.bookings.get(booking_id)
    if b is None:
        raise HTTPException(status_code=404, detail="booking not found")
    qr = segno.make(b.token, error="m")
    buf = io.BytesIO()
    qr.save(buf, kind="svg", scale=1, border=2, dark="#12388F", light=None)
    svg = buf.getvalue().decode("utf-8")
    return Response(
        content=svg,
        media_type="image/svg+xml",
        headers={"Cache-Control": "public, max-age=3600"},
    )


@app.get("/api/candidate")
async def candidate() -> dict:
    if store.candidate is None:
        raise HTTPException(status_code=404, detail="no candidate")
    return store.candidate.view()


class JoinReq(BaseModel):
    sessionId: str = ""


@app.post("/api/candidate/join")
async def candidate_join(req: JoinReq) -> dict:
    sid = req.sessionId or secrets.token_urlsafe(6)
    async with store.lock:
        cand = store.join_candidate(sid)
        if cand is None:
            raise HTTPException(status_code=404, detail="no candidate")
        view = cand.view()
        activity = store.add_activity("join", f"노선 후보 '{cand.title}' 참여 {cand.current}/{cand.target}명")
    await hub.broadcast({"type": "candidate", **view})
    await hub.broadcast({"type": "activity", "item": activity, "stats": store.stats()})
    return view


# ──────────────────────────────────────────────────────────────
#  발표자용: 상태 초기화 + 자동 시뮬레이션(봇 예약)
# ──────────────────────────────────────────────────────────────
import random  # noqa: E402

_sim = {"task": None}


class ResetReq(BaseModel):
    token: str = ""


@app.post("/api/admin/reset")
async def admin_reset(req: ResetReq) -> dict:
    """발표 사이사이에 좌석/후보 상태를 초기화. 시뮬레이션도 정지."""
    if not secrets.compare_digest(req.token, ADMIN_TOKEN):
        raise HTTPException(status_code=403, detail="forbidden")
    await _stop_sim()
    async with store.lock:
        store.seed()
    await hub.broadcast(store.snapshot(hub.online))
    return {"ok": True}


async def _sim_step() -> None:
    """봇 한 명이 빈 좌석 하나를 예약(가끔 노선 후보에도 참여)."""
    async with store.lock:
        routes = [r for r in store.routes.values() if r.remaining() > 0]
        if routes:
            route = random.choice(routes)
            free = store.free_seats(route.id)
            seat = random.choice(free)
            nick = "홍길동"
            store.book_seat(route.id, seat, nick)
            remaining = route.remaining()
            act = store.add_activity("book", f"{nick}님이 {route.code} {seat}번 좌석 예약")
        else:
            route = seat = remaining = act = None
    if route is not None:
        await hub.broadcast({"type": "seat", "routeId": route.id, "seatNo": seat,
                             "status": "booked", "remaining": remaining})
        await hub.broadcast({"type": "activity", "item": act, "stats": store.stats()})

    if random.random() < 0.30:
        async with store.lock:
            cand = store.join_candidate("sim_" + secrets.token_hex(3))
            view = cand.view() if cand else None
            act2 = store.add_activity("join", f"노선 후보 참여 {cand.current}/{cand.target}명") if cand else None
        if view:
            await hub.broadcast({"type": "candidate", **view})
            await hub.broadcast({"type": "activity", "item": act2, "stats": store.stats()})


async def _sim_loop() -> None:
    while True:
        await asyncio.sleep(random.uniform(1.6, 3.4))
        try:
            await _sim_step()
        except Exception:
            pass


async def _stop_sim() -> None:
    task = _sim["task"]
    if task is not None:
        task.cancel()
        _sim["task"] = None


class SimReq(BaseModel):
    token: str = ""
    on: bool = True


@app.post("/api/admin/sim")
async def admin_sim(req: SimReq) -> dict:
    """봇 자동 예약 시뮬레이션 시작/정지 (관제 대시보드에서 제어)."""
    if not secrets.compare_digest(req.token, ADMIN_TOKEN):
        raise HTTPException(status_code=403, detail="forbidden")
    if req.on and _sim["task"] is None:
        _sim["task"] = asyncio.create_task(_sim_loop())
    elif not req.on:
        await _stop_sim()
    return {"ok": True, "running": _sim["task"] is not None}


@app.get("/api/admin/sim")
async def admin_sim_status() -> dict:
    return {"running": _sim["task"] is not None}


# ──────────────────────────────────────────────────────────────
#  WebSocket — 접속 시 전체 스냅샷, 이후 델타 브로드캐스트
# ──────────────────────────────────────────────────────────────
@app.websocket("/ws")
async def ws_endpoint(ws: WebSocket) -> None:
    await hub.connect(ws)
    try:
        await ws.send_json(store.snapshot(hub.online))
        await broadcast_presence()  # 접속자 수 변화 알림
        while True:
            # 클라이언트의 ping/keepalive 만 수신 (서버→클라 위주)
            await ws.receive_text()
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        hub.disconnect(ws)
        await broadcast_presence()


# ──────────────────────────────────────────────────────────────
#  정적 프론트엔드 + SPA 경로 폴백
#  (/home, /search, /seat ... 같은 클라이언트 경로 직접 접속 시 index.html 반환)
# ──────────────────────────────────────────────────────────────
@app.get("/live")
async def live_dashboard() -> FileResponse:
    """발표자용 실시간 관제 대시보드."""
    return FileResponse(str(FRONTEND_DIR / "live.html"))


import re as _re
import time as _time

# 자산 버전 — 서버가 뜰 때마다 새 값이라 프론트 파일이 항상 최신으로 로드됨(캐시 무효화)
ASSET_VERSION = "v" + str(int(_time.time()))


def render_index() -> HTMLResponse:
    html = (FRONTEND_DIR / "index.html").read_text(encoding="utf-8").replace("{{V}}", ASSET_VERSION)
    return HTMLResponse(html, headers={"Cache-Control": "no-cache, must-revalidate"})


@app.get("/")
async def index_page() -> HTMLResponse:
    return render_index()


class SPAStaticFiles(StaticFiles):
    async def get_response(self, path: str, scope):
        # /v.../js/main.js 처럼 버전 프리픽스로 오면 벗겨서 실제 파일 서빙
        # (윈도우에선 경로 구분자가 역슬래시라 둘 다 처리)
        path = _re.sub(r"^v\d+[\\/]", "", path)
        try:
            response = await super().get_response(path, scope)
        except StarletteHTTPException as exc:
            if exc.status_code == 404:
                return render_index()   # 클라이언트 라우트 → 버전 주입된 SPA 진입점
            raise
        if response.status_code == 404:
            return render_index()
        response.headers["Cache-Control"] = "no-cache, must-revalidate"
        return response


app.mount("/svg", StaticFiles(directory=str(SVG_DIR)), name="svg")   # 브랜드 로고
app.mount("/", SPAStaticFiles(directory=str(FRONTEND_DIR), html=True), name="static")
