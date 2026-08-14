// 마이 > 내 탑승권 (이용중 정기권 + 지난 이용 내역)
import { h } from "../util.js";
import { store } from "../store.js";
import { navigate } from "../router.js";

const BACK = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M15 19l-7-7 7-7" stroke="#191F28" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

export default function Tickets() {
  const b = store.state.booking;
  let active;
  if (b) {
    const r = store.state.routes[b.routeId] || b.route;
    active = `
      <div class="pass" id="activePass">
        <div class="pass-top"><span class="pass-live">이용중</span><span class="pass-code">${r.code}</span></div>
        <div class="pass-route">${r.title}</div>
        <div class="pass-meta">${b.seatNo}번 좌석 · ${r.depart} ${r.departSpot} 승차 → ${r.arrive} ${r.arriveSpot}</div>
        <div class="pass-foot"><span>평일 정기권 · 보호자 알림 ON</span><span class="pass-go">QR 보기 ›</span></div>
      </div>`;
  } else {
    active = `
      <div class="card ticket-empty">
        <div class="te-ic"><svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1-2 2H6a2 2 0 0 1-2-2 2 2 0 0 0 0-4z" stroke="#B0B8C1" stroke-width="2" stroke-linejoin="round"/></svg></div>
        <div><div class="te-t">이용중인 정기권이 없어요</div><div class="te-d">노선을 조회하고 좌석을 예약해보세요</div></div>
      </div>`;
  }

  const el = h(`
    <section class="view active" id="v-tickets">
      <div class="appbar"><div class="back" data-go="my">${BACK}</div><span class="title">내 탑승권</span></div>
      <div class="scroll" style="background:#F4F5F7">
        <div style="padding:14px 20px 24px">
          <div class="section-title" style="margin-top:2px">이용중인 정기권</div>
          ${active}
          <div class="section-title">지난 이용 내역</div>
          <div class="card my-menu">
            <div class="past-row"><div><div class="pr-route">세경고 → 문산 F1</div><div class="pr-date">2026.08.13 (수) · 14번 좌석</div></div><span class="pr-done">이용완료</span></div>
            <div class="past-row"><div><div class="pr-route">세경고 → 문산 F1</div><div class="pr-date">2026.08.12 (화) · 14번 좌석</div></div><span class="pr-done">이용완료</span></div>
            <div class="past-row"><div><div class="pr-route">세경고 → 금촌 R3</div><div class="pr-date">2026.08.11 (월) · 8번 좌석</div></div><span class="pr-done">이용완료</span></div>
          </div>
        </div>
      </div>
    </section>`);

  const ap = el.querySelector("#activePass");
  if (ap) ap.addEventListener("click", () => navigate("ticket"));

  return { el, name: "tickets", unmount() {} };
}
