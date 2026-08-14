// 07 실시간 탑승 — 도로를 따라 움직이는 버스(OSRM), 보호자 알림, 도착 시 하차 QR
import { h } from "../util.js";
import { store } from "../store.js";
import { addRide, todayYMD } from "../rideLog.js";

const RIDE_SECONDS = 26;   // 시연용: 출발→도착 애니메이션 길이

export default function Ride() {
  const b = store.state.booking;
  const r = b ? (store.state.routes[b.routeId] || b.route || {}) : {};

  const el = h(`
    <section class="view active" id="v-ride">
      <div class="appbar">
        <div class="back" data-go="home"><svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M15 19l-7-7 7-7" stroke="#191F28" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
        <span class="title">실시간 탑승</span>
        <span class="live-tag" style="margin-left:auto;margin-right:6px"><span class="live-blip"></span>실시간</span>
      </div>
      <div class="ride-map"><div class="ride-canvas"></div><div class="map-loading" id="rLoad">실시간 위치 불러오는 중…</div></div>
      <div class="ride-panel">
        <div class="ride-hd">
          <div class="ride-route">${r.title || ""} <span class="code">${r.code || ""}</span> · ${b ? b.seatNo + "번" : ""}</div>
          <div class="ride-eta" id="rideEta">이동 준비 중…</div>
        </div>
        <div class="ride-note">📍 실시간 위치로 안전하게 이동 중이에요</div>
        <button class="cta" id="alightBtn" disabled>도착하면 하차 QR이 열려요</button>
      </div>
    </section>`);

  let lmap = null, timer = null;
  const cleanup = () => {
    if (timer) { clearInterval(timer); timer = null; }
    if (lmap) { try { lmap.remove(); } catch (e) {} lmap = null; }
  };

  // 탑승 체크인 — 최초 1회만: 진행중 상태 설정 + 서버 체크인(대시보드) + 탑승 로그
  function board() {
    if (!b) return;
    if (!store.state.ride || store.state.ride.bookingId !== b.bookingId) {
      store.state.ride = { bookingId: b.bookingId, routeId: b.routeId, startAt: Date.now(), durationSec: RIDE_SECONDS };
      store.board(b.bookingId).catch(() => {});   // 보호자 알림은 뒤에서 발송(학생 화면엔 안 띄움)
      addRide({ date: todayYMD(), route: `${r.title} ${r.code}`, seat: b.seatNo, bookingId: b.bookingId });
    }
  }

  const gq = (s) => (/(고|중|초)$/.test(s) || String(s).includes("학교")) ? s : `파주시 ${s}`;
  const geo = async (s) => {
    try { const g = await fetch(`/api/geocode?q=${encodeURIComponent(gq(s))}`).then((x) => x.json()); return g.ok ? [g.lat, g.lon] : null; }
    catch (e) { return null; }
  };

  function segLen(a, c) {
    const k = Math.cos((a[0] + c[0]) / 2 * Math.PI / 180);
    return Math.hypot(c[0] - a[0], (c[1] - a[1]) * k);
  }

  async function startMap() {
    const [o, d] = await Promise.all([geo(r.origin || ""), geo(r.dest || "")]);
    if (!document.body.contains(el) || !o || !d || typeof L === "undefined") {
      const ld = el.querySelector("#rLoad"); if (ld) ld.textContent = "지도를 불러올 수 없어요";
      return;
    }
    // 도로 경로(OSRM), 실패 시 직선
    let path = [o, d];
    try {
      const rt = await fetch(`/api/route?o=${o[0]},${o[1]}&d=${d[0]},${d[1]}`).then((x) => x.json());
      if (rt.ok && rt.coords && rt.coords.length > 1) path = rt.coords;
    } catch (e) {}
    if (!document.body.contains(el)) return;

    const ld = el.querySelector("#rLoad"); if (ld) ld.remove();
    lmap = L.map(el.querySelector(".ride-canvas"), {
      zoomControl: false, attributionControl: false, dragging: false, tap: false,
      scrollWheelZoom: false, doubleClickZoom: false, touchZoom: false, boxZoom: false, keyboard: false,
    });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", { maxZoom: 19 }).addTo(lmap);
    L.polyline(path, { color: "#12388F", weight: 5, opacity: 0.85 }).addTo(lmap);
    L.circleMarker(o, { radius: 7, color: "#fff", weight: 2, fillColor: "#0E9E6E", fillOpacity: 1 }).addTo(lmap);
    L.circleMarker(d, { radius: 7, color: "#fff", weight: 2, fillColor: "#191F28", fillOpacity: 1 }).addTo(lmap);
    const busIcon = L.divIcon({ className: "", html: '<div class="bus-dot">🚌</div>', iconSize: [30, 30], iconAnchor: [15, 15] });
    const bus = L.marker(path[0], { icon: busIcon, zIndexOffset: 1000 }).addTo(lmap);
    lmap.fitBounds(path, { padding: [30, 30] });
    setTimeout(() => { if (lmap) lmap.invalidateSize(); }, 60);

    // 누적 거리 → 진행률에 맞춰 도로 위 위치 보간
    const cum = [0];
    for (let i = 1; i < path.length; i++) cum.push(cum[i - 1] + segLen(path[i - 1], path[i]));
    const total = cum[cum.length - 1] || 1;

    const eta = el.querySelector("#rideEta");
    const alight = el.querySelector("#alightBtn");
    // 진행중 상태의 시작시각 기준 → 다른 화면 갔다 와도 이어서 진행
    const ride = store.state.ride || { startAt: Date.now(), durationSec: RIDE_SECONDS };
    // setInterval 사용(브라우저 미표시 상태에서도 동작 — rAF는 스로틀됨)
    timer = setInterval(() => {
      const p = Math.min((Date.now() - ride.startAt) / (ride.durationSec * 1000), 1);
      const target = p * total;
      let i = 1;
      while (i < cum.length && cum[i] < target) i++;
      const a = path[i - 1], c = path[Math.min(i, path.length - 1)];
      const segT = cum[i] > cum[i - 1] ? (target - cum[i - 1]) / (cum[i] - cum[i - 1]) : 0;
      bus.setLatLng([a[0] + (c[0] - a[0]) * segT, a[1] + (c[1] - a[1]) * segT]);
      const remainMin = Math.max(0, Math.round((1 - p) * (r.durationMin || 30)));
      if (eta) eta.textContent = p >= 1 ? "🏁 곧 하차예요! 하차 QR을 준비하세요" : `이동 중 · 약 ${remainMin}분 후 도착 (${Math.round(p * 100)}%)`;
      if (p >= 1) {
        clearInterval(timer); timer = null;
        alight.disabled = false;
        alight.classList.add("ready");
        alight.textContent = "🎫 하차하기 (하차 QR)";
      }
    }, 80);
  }

  // 하차 QR 모달
  function showAlightQR() {
    if (!b) return;
    const dim = h(`
      <div class="map-dim">
        <div class="map-card">
          <div class="alight-pop">
            <div class="tk-pill" style="background:#0E9E6E">하차 QR</div>
            <div class="alight-route">${r.title} ${r.code}</div>
            <div class="qr-wrap" id="alightQr"></div>
            <div class="tk-token">하차 시 기사님께 이 QR을 보여주세요</div>
            <div class="alight-note">🔔 하차하면 보호자에게 도착 알림이 전송돼요</div>
            <button class="cta" data-close style="margin-top:14px">확인</button>
            <button class="cta ghost" data-go="home" style="margin-top:10px">이용 종료 · 홈으로</button>
          </div>
        </div>
      </div>`);
    const img = new Image();
    img.src = `/api/booking/${b.bookingId}/qr.svg`;
    img.style.width = "100%"; img.style.height = "100%";
    dim.querySelector("#alightQr").appendChild(img);
    const remove = () => { dim.classList.remove("show"); setTimeout(() => dim.remove(), 180); };
    dim.querySelector("[data-close]").addEventListener("click", remove);
    // 이용 종료 → 진행중 탑승 상태 해제(배너 사라짐). data-go="home"이 홈 이동 처리
    dim.querySelector('[data-go="home"]').addEventListener("click", () => { store.state.ride = null; remove(); });
    dim.addEventListener("click", (e) => { if (e.target === dim) remove(); });
    document.getElementById("phoneScreen").appendChild(dim);
    setTimeout(() => dim.classList.add("show"), 10);
  }

  el.querySelector("#alightBtn").addEventListener("click", () => {
    if (!el.querySelector("#alightBtn").disabled) showAlightQR();
  });

  return {
    el, name: "ride",
    onShow() { board(); startMap(); },
    unmount() { cleanup(); },
  };
}
