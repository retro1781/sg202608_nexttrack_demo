// 05b 예약 완료 (결제 직후 — QR은 여기서 안 띄운다)
import { h } from "../util.js";
import { store } from "../store.js";

export default function Confirm() {
  const b = store.state.booking;
  const r = b ? (store.state.routes[b.routeId] || b.route || {}) : {};
  const el = h(`
    <section class="view active" id="v-confirm">
      <div class="done-body" style="display:flex;flex-direction:column">
        <div class="done-hero">
          <div class="done-check">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </div>
          <h2>예약이 완료됐어요!</h2>
          <p>이 좌석은 이제 <b style="color:#fff">내 지정석</b>이에요.<br>탑승할 때 탑승권 QR을 보여주세요.</p>
        </div>
        <div class="ticket" style="margin-top:-34px">
          <div class="cf-route">${r.title || ""} <span class="code">${r.code || ""}</span></div>
          <div class="cf-sub">${b ? b.seatNo + "번 좌석" : ""} · 평일 정기권</div>
          <hr class="tk-dashline">
          <div style="display:flex;justify-content:space-between;font-size:13px">
            <div><div style="color:#8B95A1;font-weight:600">탑승</div><div style="font-weight:800;color:#191F28;margin-top:2px">${r.depart || ""} ${r.departSpot || ""}</div></div>
            <div style="text-align:right"><div style="color:#8B95A1;font-weight:600">하차</div><div style="font-weight:800;color:#191F28;margin-top:2px">${r.arrive || ""} ${r.arriveSpot || ""}</div></div>
          </div>
        </div>
      </div>
      <div class="done-actions">
        <button class="cta" data-go="ticket">내 탑승권 보기</button>
        <button class="cta ghost" data-go="home">홈으로</button>
      </div>
    </section>`);

  return { el, name: "confirm", unmount() {} };
}
