// 04 좌석 선택 — 실시간 공유 좌석맵
import { h, won } from "../util.js";
import { store } from "../store.js";
import { navigate } from "../router.js";
import { toast } from "../ui.js";
import { seatRowsHTML } from "../components/seatMap.js";

export default function Seat() {
  const el = h(`
    <section class="view active" id="v-seat">
      <div class="appbar" style="border-bottom:1px solid #F2F4F6">
        <div class="back" data-go="results">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M15 19l-7-7 7-7" stroke="#191F28" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
        <span class="title" id="seatTitle"></span>
      </div>
      <div class="scroll" style="background:#FBFBFD">
        <div style="padding:16px 22px 0">
          <div class="mini-timeline" id="seatTimeline"></div>
          <div class="seat-foot" style="margin-top:20px;margin-bottom:0;align-items:center">
            <div style="font-size:16px;font-weight:800;color:#191F28">좌석을 선택하세요</div>
            <div class="legend">
              <div class="lg"><div class="sw" style="border:1.5px solid #B7C8EC"></div><span>가능</span></div>
              <div class="lg"><div class="sw" style="background:#12388F"></div><span>선택</span></div>
              <div class="lg"><div class="sw" style="background:#F1F3F6"></div><span>예약됨</span></div>
            </div>
          </div>
          <div class="bus">
            <div class="bus-head">
              <div class="drv">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#B0B8C1" stroke-width="2"/><path d="M12 7v5l3 2" stroke="#B0B8C1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                운전석
              </div>
              <div class="door">출입문</div>
            </div>
            <div class="seat-rows" id="seatRows"></div>
          </div>
          <div style="height:18px"></div>
        </div>
      </div>
      <div class="footer">
        <div class="seat-foot">
          <div>
            <div class="lab">선택한 좌석</div>
            <div class="sel-label" id="selLabel">좌석을 골라주세요</div>
          </div>
          <div style="text-align:right"><div class="p" id="seatPrice"></div></div>
        </div>
        <button class="cta" id="toPayBtn" disabled>이 좌석으로 결제하기</button>
        <div class="homebar"><div></div></div>
      </div>
    </section>`);

  const rid = store.state.selectedRouteId;
  const route = () => store.state.routes[rid];

  function renderTimeline() {
    const r = route(); if (!r) return;
    el.querySelector("#seatTimeline").innerHTML = `
      <div class="t" style="text-align:center"><b style="font-size:15px;font-weight:800">${r.depart}</b><span style="font-size:10.5px;color:#8B95A1;font-weight:600">${r.departSpot}</span></div>
      <div class="bar" style="flex:1;position:relative;height:2px;background:#E5E8EB"><em style="position:absolute;top:-8px;left:50%;transform:translateX(-50%);background:#fff;font-size:10px;font-weight:700;color:#12388F;padding:0 6px;font-style:normal">${r.durationMin}분</em></div>
      <div class="t" style="text-align:center"><b style="font-size:15px;font-weight:800">${r.arrive}</b><span style="font-size:10.5px;color:#8B95A1;font-weight:600">${r.arriveSpot}</span></div>`;
  }

  function renderFooter() {
    const has = store.state.selectedSeat != null;
    el.querySelector("#selLabel").textContent = has ? `${store.state.selectedSeat}번 좌석` : "좌석을 골라주세요";
    el.querySelector("#toPayBtn").disabled = !has;
  }

  function renderGrid() {
    const r = route(); if (!r) return;
    el.querySelector("#seatTitle").textContent = `${r.title} ${r.code}`;
    el.querySelector("#seatPrice").textContent = "월 " + won(r.price);
    el.querySelector("#seatRows").innerHTML = seatRowsHTML(r, store.state.selectedSeat);
    el.querySelectorAll("#seatRows .seat.avail").forEach((s) =>
      s.addEventListener("click", () => {
        store.state.selectedSeat = Number(s.dataset.seat);
        renderGrid(); renderFooter();
      }));
    renderFooter();
  }

  el.querySelector("#toPayBtn").addEventListener("click", () => {
    if (store.state.selectedSeat != null) navigate("payment");
  });

  const unsub = store.subscribe((evt) => {
    if (evt.type === "snapshot") renderGrid();
    if (evt.type === "seat" && evt.routeId === rid) {
      if (evt.status === "booked" && store.state.selectedSeat === evt.seatNo) {
        store.state.selectedSeat = null;
        toast(`${evt.seatNo}번은 방금 다른 학생이 예약했어요`);
      }
      renderGrid();
      const cell = el.querySelector(`#seatRows .seat[data-seat="${evt.seatNo}"]`);
      if (cell) { cell.classList.add("just"); setTimeout(() => cell.classList.remove("just"), 500); }
    }
  });

  return {
    el, name: "seat",
    onShow() {
      if (!rid) { navigate("home"); return; }       // 딥링크 방어: 노선 미선택
      // 동적 생성 노선이라 좌석맵 상세(layout/booked)를 조회해서 반영
      fetch(`/api/routes/${encodeURIComponent(rid)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d) store.state.routes[rid] = { ...(store.state.routes[rid] || {}), ...d };
          if (!route()) { navigate("home"); return; }
          renderTimeline(); renderGrid();
        })
        .catch(() => { if (route()) { renderTimeline(); renderGrid(); } });
    },
    unmount() { unsub(); },
  };
}
