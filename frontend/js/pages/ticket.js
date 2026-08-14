// 06 내 탑승권 — 탑승 QR + [탑승하기] → 실시간 탑승 페이지
import { h } from "../util.js";
import { store } from "../store.js";

export default function Ticket() {
  const b = store.state.booking;
  const r = b ? (store.state.routes[b.routeId] || b.route || {}) : {};
  const el = h(`
    <section class="view active" id="v-ticket">
      <div class="appbar">
        <div class="back" data-go="home"><svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M15 19l-7-7 7-7" stroke="#191F28" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
        <span class="title">내 탑승권</span>
      </div>
      <div class="done-body" style="display:flex;flex-direction:column;justify-content:center;padding:0 20px">
        <div class="ticket standalone">
          <div class="tk-pill">탑승 QR</div>
          <div class="tk-route" id="tkRoute"></div>
          <div class="tk-seat" id="tkSeat"></div>
          <div class="qr-wrap" id="qrWrap"></div>
          <div class="tk-token">탑승 시 기사님께 이 QR을 보여주세요</div>
          <hr class="tk-dashline">
          <div style="display:flex;justify-content:space-between;font-size:13px">
            <div><div style="color:#8B95A1;font-weight:600">탑승</div><div style="font-weight:800;color:#191F28;margin-top:2px" id="tkDepart"></div></div>
            <div style="text-align:right"><div style="color:#8B95A1;font-weight:600">하차</div><div style="font-weight:800;color:#191F28;margin-top:2px" id="tkArrive"></div></div>
          </div>
        </div>
      </div>
      <div class="done-actions">
        <button class="cta" data-go="ride">🚌 탑승하기 (기사님께 QR 확인)</button>
        <button class="cta ghost" data-go="home">홈으로</button>
      </div>
    </section>`);

  if (b) {
    el.querySelector("#tkRoute").textContent = `${r.title} ${r.code}`;
    el.querySelector("#tkSeat").textContent = `${b.seatNo}번 좌석 · ${r.depart} ${r.departSpot} 승차`;
    el.querySelector("#tkDepart").textContent = `${r.depart} ${r.departSpot}`;
    el.querySelector("#tkArrive").textContent = `${r.arrive} ${r.arriveSpot}`;
    const img = new Image();
    img.src = `/api/booking/${b.bookingId}/qr.svg`;
    img.alt = "탑승 QR";
    img.style.width = "100%";
    img.style.height = "100%";
    el.querySelector("#qrWrap").appendChild(img);
  } else {
    el.querySelector("#tkRoute").textContent = "예약 정보가 없어요";
  }

  return { el, name: "ticket", unmount() {} };
}
