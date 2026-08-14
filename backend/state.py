"""
넥스트랙(NEXTRACK) 데모 백엔드 - 인메모리 상태 저장소.

동접 30명 수준 시연용이라 DB 없이 프로세스 메모리로 전부 처리한다.
단일 uvicorn 워커 + asyncio 이면 30명 브로드캐스트는 여유롭다.
좌석 예약은 asyncio.Lock 으로 감싸 중복 예약(더블부킹)을 막는다.
"""
from __future__ import annotations

import asyncio
import re
import secrets
import zlib
from collections import deque
from dataclasses import dataclass, field
from random import Random


def region_core(region: str) -> str:
    """'문산읍'→'문산', '금촌2동'→'금촌', '교하동'→'교하', '광탄면'→'광탄'."""
    core = re.sub(r"\d*\s*(읍|면|동|리)$", "", region).strip()
    return core or region


def school_short(name: str) -> str:
    """'세경고등학교'→'세경고', '운정중학교'→'운정중'."""
    for suf, rep in (("고등학교", "고"), ("중학교", "중"), ("초등학교", "초"), ("학교", "")):
        if name.endswith(suf):
            return name[: -len(suf)] + rep
    return name


def _add_minutes(hhmm: str, mins: int) -> str:
    h, m = map(int, hhmm.split(":"))
    t = h * 60 + m + mins
    return f"{(t // 60) % 24:02d}:{t % 60:02d}"


# (변형 라벨, 소요분, 월정액, 좌석수, 추천, 사전예약비율, 출발시각)
VARIANTS_HAGYO = [
    ("직행", 32, 88000, 28, True, 0.30, "16:50"),
    ("경유", 42, 84000, 24, False, 0.55, "17:05"),
    ("야자 후", 34, 96000, 20, False, 0.20, "21:30"),
]
VARIANTS_DUNGGYO = [
    ("직행", 32, 88000, 28, True, 0.30, "07:20"),
    ("경유", 42, 84000, 24, False, 0.55, "07:05"),
    ("여유", 30, 92000, 22, False, 0.20, "07:40"),
]


# ──────────────────────────────────────────────────────────────
#  좌석 배치 (2 + 통로 + 2, 총 N석)
# ──────────────────────────────────────────────────────────────
def build_layout(total: int) -> list[dict]:
    """total 석을 4열(좌2·우2) 행으로 나눈다. 마지막 행은 남는 만큼만."""
    rows: list[dict] = []
    n = 1
    while n <= total:
        left = [x for x in (n, n + 1) if x <= total]
        right = [x for x in (n + 2, n + 3) if x <= total]
        rows.append({"left": left, "right": right})
        n += 4
    return rows


@dataclass
class Route:
    id: str
    code: str            # F1, R3 ...
    title: str           # "세경고 → 문산"
    origin: str
    dest: str
    depart: str          # "16:50"
    depart_spot: str     # "교문 앞"
    arrive: str          # "17:25"
    arrive_spot: str     # "문산"
    duration_min: int
    road: str            # "지방도"
    price: int           # 월 정액
    school_peers: int    # 같은 학교 N명
    seats_total: int
    recommended: bool = False
    booked: set[int] = field(default_factory=set)

    def remaining(self) -> int:
        return self.seats_total - len(self.booked)

    def summary(self) -> dict:
        return {
            "id": self.id,
            "code": self.code,
            "title": self.title,
            "origin": self.origin,
            "dest": self.dest,
            "depart": self.depart,
            "departSpot": self.depart_spot,
            "arrive": self.arrive,
            "arriveSpot": self.arrive_spot,
            "durationMin": self.duration_min,
            "road": self.road,
            "price": self.price,
            "schoolPeers": self.school_peers,
            "seatsTotal": self.seats_total,
            "remaining": self.remaining(),
            "recommended": self.recommended,
        }

    def detail(self) -> dict:
        d = self.summary()
        d["layout"] = build_layout(self.seats_total)
        d["booked"] = sorted(self.booked)
        return d


@dataclass
class Candidate:
    id: str
    title: str           # "세경고 → 교하 방면"
    subtitle: str        # "운도중 · 오후 5:30 하교 무렵"
    current: int
    target: int
    d_day: int           # 남은 모집일

    def view(self) -> dict:
        pct = round(min(self.current / self.target, 1) * 100)
        return {
            "id": self.id,
            "title": self.title,
            "subtitle": self.subtitle,
            "current": self.current,
            "target": self.target,
            "remaining": max(self.target - self.current, 0),
            "percent": pct,
            "dDay": self.d_day,
        }


@dataclass
class Booking:
    id: str
    route_id: str
    seat_no: int
    nickname: str
    token: str
    boarded: bool = False


class Store:
    """전역 상태. 앱 시작 시 seed() 로 초기화한다."""

    def __init__(self) -> None:
        self.routes: dict[str, Route] = {}
        self.candidate: Candidate | None = None
        self.bookings: dict[str, Booking] = {}
        self.candidate_joiners: set[str] = set()
        self.activity: deque = deque(maxlen=40)   # 실시간 활동 피드(관제 대시보드용)
        self.activity_seq: int = 0
        self._route_index: dict[tuple, list[str]] = {}
        self.lock = asyncio.Lock()
        self.seed()

    def seed(self) -> None:
        self.routes: dict[str, Route] = {}
        self._route_index = {}
        # 시연 시작 시 대표 지역 몇 개는 미리 개설해 둔다(대시보드·시뮬레이션용)
        for core in ("문산", "금촌", "교하"):
            self.routes_for("하교", core, "세경고등학교")
        self.candidate = Candidate(
            id="C_KYOHA",
            title="세경고 → 교하 방면",
            subtitle="세경고 · 오후 5:30 하교 무렵",
            current=12, target=15, d_day=9,
        )
        self.bookings.clear()
        self.candidate_joiners.clear()
        self.activity.clear()
        self.activity_seq = 0

    # ── 지역 기반 노선 생성/조회 ──────────────────────────
    def routes_for(self, mode: str, region: str, school: str) -> list["Route"]:
        """(등교/하교, 지역, 학교) 조합의 노선들. 없으면 생성해 캐시(좌석 상태 유지)."""
        core = region_core(region)
        sh = school_short(school)
        key = (mode, sh, core)
        ids = self._route_index.get(key)
        if ids is None:
            ids = self._generate(mode, core, sh, school)
            self._route_index[key] = ids
        return [self.routes[i] for i in ids]

    def _generate(self, mode: str, core: str, sh: str, school: str) -> list[str]:
        variants = VARIANTS_HAGYO if mode == "하교" else VARIANTS_DUNGGYO
        base = format(zlib.crc32(f"{mode}|{sh}|{core}".encode()) & 0xFFFFFFFF, "08x")
        ids: list[str] = []
        for i, (sub, dur, price, seats, rec, ratio, dep) in enumerate(variants):
            rid = f"r{base}{i}"
            arr = _add_minutes(dep, dur)
            if mode == "하교":
                title = f"{sh} → {core}"
                origin, dest, dspot, aspot = school, core, "교문 앞", core
            else:
                title = f"{core} → {sh}"
                origin, dest, dspot, aspot = core, school, core, "교문 앞"
            rnd = Random(zlib.crc32(rid.encode()))
            k = int(seats * ratio)
            booked = set(rnd.sample(range(1, seats + 1), k)) if k else set()
            peers = 6 + (zlib.crc32(rid.encode()) % 11)
            self.routes[rid] = Route(
                id=rid, code=sub, title=title,
                origin=origin, dest=dest,
                depart=dep, depart_spot=dspot, arrive=arr, arrive_spot=aspot,
                duration_min=dur, road="지방도", price=price,
                school_peers=peers, seats_total=seats, recommended=rec, booked=booked,
            )
            ids.append(rid)
        return ids

    # ── 조회 ──────────────────────────────────────────────
    def route_summaries(self) -> list[dict]:
        # 추천 노선을 먼저
        rs = sorted(self.routes.values(), key=lambda r: (not r.recommended, r.code))
        return [r.summary() for r in rs]

    def snapshot(self, online: int) -> dict:
        return {
            "type": "snapshot",
            "routes": {rid: r.detail() for rid, r in self.routes.items()},
            "candidate": self.candidate.view() if self.candidate else None,
            "online": online,
            "activity": list(self.activity),
            "stats": self.stats(),
        }

    def stats(self) -> dict:
        total = sum(r.seats_total for r in self.routes.values())
        booked = sum(len(r.booked) for r in self.routes.values())
        boarded = sum(1 for b in self.bookings.values() if b.boarded)
        return {
            "seatsTotal": total,
            "seatsBooked": booked,
            "bookings": len(self.bookings),
            "boarded": boarded,
        }

    def add_activity(self, kind: str, text: str) -> dict:
        self.activity_seq += 1
        item = {"id": self.activity_seq, "kind": kind, "text": text}
        self.activity.appendleft(item)
        return item

    # ── 변경 (호출부에서 lock 사용) ────────────────────────
    def book_seat(self, route_id: str, seat_no: int, nickname: str) -> Booking | None:
        route = self.routes.get(route_id)
        if route is None:
            return None
        if seat_no < 1 or seat_no > route.seats_total:
            return None
        if seat_no in route.booked:
            return None
        route.booked.add(seat_no)
        booking = Booking(
            id=secrets.token_urlsafe(6),
            route_id=route_id,
            seat_no=seat_no,
            nickname=nickname,
            token=f"NEXTRACK|{route_id}|{seat_no}|{secrets.token_hex(4)}",
        )
        self.bookings[booking.id] = booking
        return booking

    def release_seat(self, route_id: str, seat_no: int) -> bool:
        route = self.routes.get(route_id)
        if route and seat_no in route.booked:
            route.booked.discard(seat_no)
            return True
        return False

    def join_candidate(self, session_id: str) -> Candidate | None:
        if self.candidate is None:
            return None
        if session_id not in self.candidate_joiners:
            self.candidate_joiners.add(session_id)
            if self.candidate.current < self.candidate.target:
                self.candidate.current += 1
        return self.candidate

    def board(self, booking_id: str) -> Booking | None:
        """탑승 체크인 처리(보호자 알림 트리거). 없는 예약이면 None."""
        b = self.bookings.get(booking_id)
        if b is None:
            return None
        b.boarded = True
        return b

    def free_seats(self, route_id: str) -> list[int]:
        route = self.routes.get(route_id)
        if route is None:
            return []
        return [n for n in range(1, route.seats_total + 1) if n not in route.booked]
