// 전역 상태 + WebSocket 클라이언트 + 액션. 아주 단순한 pub/sub.
// 페이지는 subscribe(fn) 으로 이벤트를 받고 unmount 시 해제한다.
const listeners = new Set();

const SID_KEY = "nextrack_sid";
let sid = localStorage.getItem(SID_KEY);
if (!sid) { sid = "s_" + Math.random().toString(36).slice(2, 9); localStorage.setItem(SID_KEY, sid); }
const nickname = "홍길동";

export const store = {
  state: {
    routes: {},
    candidate: null,
    online: 0,
    booking: null,
    ride: null,   // 진행 중 탑승 { bookingId, routeId, startAt, durationSec }
    selectedRouteId: null,
    selectedSeat: null,
    query: { mode: "하교", school: "세경고등학교", region: "문산읍", time: "오후 5:00 하교" },
    sid,
    nickname,
  },

  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  emit(evt) { listeners.forEach((fn) => { try { fn(evt); } catch (e) { console.error(e); } }); },

  setQuery(key, val) { this.state.query[key] = val; this.emit({ type: "query", key }); },

  // ── WebSocket ──────────────────────────────
  connect() {
    const proto = location.protocol === "https:" ? "wss" : "ws";
    let retry = 0, pingT;
    const open = () => {
      const ws = new WebSocket(`${proto}://${location.host}/ws`);
      ws.onopen = () => {
        retry = 0;
        clearInterval(pingT);
        pingT = setInterval(() => { try { ws.send("ping"); } catch (e) {} }, 25000);
      };
      ws.onmessage = (ev) => { let m; try { m = JSON.parse(ev.data); } catch (e) { return; } this._onMessage(m); };
      ws.onclose = () => { clearInterval(pingT); retry = Math.min(retry + 1, 6); setTimeout(open, 500 * retry); };
      ws.onerror = () => { try { ws.close(); } catch (e) {} };
    };
    open();

    // 최초 페인트용 REST 폴백 (WS 스냅샷이 늦을 때)
    fetch("/api/routes").then((r) => r.json()).then((d) => {
      if (Object.keys(this.state.routes).length === 0 && d.routes) {
        d.routes.forEach((r) => { this.state.routes[r.id] = { ...r, layout: [], booked: [] }; });
        this.emit({ type: "snapshot" });
      }
      if (!this.state.online) { this.state.online = d.online || 0; this.emit({ type: "presence" }); }
    }).catch(() => {});
  },

  _onMessage(m) {
    const s = this.state;
    switch (m.type) {
      case "snapshot":
        s.routes = m.routes || {};
        s.candidate = m.candidate || null;
        s.online = m.online || 0;
        this.emit({ type: "snapshot" });
        break;
      case "seat": {
        const r = s.routes[m.routeId];
        if (r) {
          const set = new Set(r.booked);
          if (m.status === "booked") set.add(m.seatNo); else set.delete(m.seatNo);
          r.booked = Array.from(set);
          if (typeof m.remaining === "number") r.remaining = m.remaining;
        }
        this.emit({ type: "seat", routeId: m.routeId, seatNo: m.seatNo, status: m.status });
        break;
      }
      case "candidate":
        s.candidate = m;
        this.emit({ type: "candidate" });
        break;
      case "presence":
        s.online = m.online;
        this.emit({ type: "presence" });
        break;
    }
  },

  // ── 액션 ───────────────────────────────────
  async book(routeId, seatNo) {
    const r = await fetch("/api/book", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ routeId, seatNo, nickname: this.state.nickname }),
    });
    if (r.status === 409) {
      const detail = await r.json().catch(() => ({}));
      const err = new Error("conflict"); err.code = 409; err.detail = detail; throw err;
    }
    if (!r.ok) throw new Error("book failed");
    const data = await r.json();
    this.state.booking = data;
    this.emit({ type: "booking" });
    return data;
  },

  async board(bookingId) {
    const r = await fetch(`/api/booking/${bookingId}/board`, { method: "POST" });
    if (!r.ok) throw new Error("board failed");
    return r.json();
  },

  async joinCandidate() {
    const r = await fetch("/api/candidate/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: this.state.sid }),
    });
    if (!r.ok) throw new Error("join failed");
    const c = await r.json();
    this.state.candidate = c;
    this.emit({ type: "candidate" });
    return c;
  },
};
