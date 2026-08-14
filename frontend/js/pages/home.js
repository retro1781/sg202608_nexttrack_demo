// 02 홈 — 등교/하교 + 학교(NEIS)·파주지역 입력, 내 탑승권, 하단 탭바
import { h } from "../util.js";
import { store } from "../store.js";
import { navigate } from "../router.js";
import { openPicker, fetchSchools, fetchRegions } from "../components/searchPicker.js";
import { openTimeSheet } from "../components/timeSheet.js";
import { tabbarHTML, wireTabbar } from "../components/tabbar.js";

const DEFAULT_TIME = { 하교: "오후 5:00 하교", 등교: "오전 7:40 등교" };

export default function Home() {
  const el = h(`
    <section class="view active" id="v-home">
      <div class="home-top">
        <div style="flex:1">
          <div class="home-hi">홍길동님 👋</div>
          <div class="home-sub">오늘도 안전하게 하교해요</div>
        </div>
        <div class="home-bell">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8" stroke="#4E5968" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M10.5 20a1.5 1.5 0 0 0 3 0" stroke="#4E5968" stroke-width="2" stroke-linecap="round"/></svg>
          <span class="dot-red"></span>
        </div>
      </div>
      <div class="scroll" style="background:#F4F5F7">
        <div style="padding:14px 20px 28px">
          <div class="card home-search">
            <div class="seg" id="modeSeg">
              <button class="seg-btn" data-mode="등교">등교</button>
              <button class="seg-btn on" data-mode="하교">하교</button>
            </div>

            <div class="home-od">
              <div class="od-row tap" id="fieldSchool" role="button" tabindex="0">
                <div style="flex:1"><div class="lab" id="labSchool">출발 · 학교</div><div class="val" id="valSchool"></div></div>
                <span class="find">검색</span>
              </div>
              <div class="od-line"></div>
              <div class="od-row tap" id="fieldRegion" role="button" tabindex="0">
                <div style="flex:1"><div class="lab" id="labRegion">도착 · 지역(파주)</div><div class="val" id="valRegion"></div></div>
                <span class="find">검색</span>
              </div>
            </div>

            <div class="field tap home-time" id="fieldTime" role="button" tabindex="0">
              <div class="ic">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8.5" stroke="#12388F" stroke-width="2"/><path d="M12 8v4l2.5 2" stroke="#12388F" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </div>
              <div style="flex:1"><div class="lab" id="labTime">하교 시간</div><div class="val" id="valTime"></div></div>
              <svg class="chev" width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="#B0B8C1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </div>
            <button class="cta" id="searchBtn" style="margin-top:16px">노선 조회하기</button>
          </div>

          <div class="section-title">내 탑승권</div>
          <div id="homeTicket"></div>

          <div class="section-title">자주 찾는 파주 지역</div>
          <div class="quick-row">
            <button class="quick" data-region="문산읍">문산</button>
            <button class="quick" data-region="금촌1동">금촌</button>
            <button class="quick" data-region="교하동">교하</button>
            <button class="quick" data-region="운정3동">운정</button>
            <button class="quick" data-region="법원읍">법원</button>
          </div>

          <div class="event-banner">
            <div>
              <div class="eb-title">첫 달 50% 할인 🎉</div>
              <div class="eb-sub">지금 예약하면 회당 약 4,000원</div>
            </div>
            <div class="eb-badge">EVENT</div>
          </div>
        </div>
      </div>

      ${tabbarHTML("home")}
    </section>`);

  const q = store.state.query;
  const setVal = (sel, v) => { const e = el.querySelector(sel); if (e) e.textContent = v; };

  function reflect() {
    setVal("#valSchool", q.school);
    setVal("#valRegion", q.region);
    setVal("#valTime", q.time);
    const hagyo = q.mode === "하교";
    el.querySelector("#labSchool").textContent = hagyo ? "출발 · 학교" : "도착 · 학교";
    el.querySelector("#labRegion").textContent = hagyo ? "도착 · 지역(파주)" : "출발 · 지역(파주)";
    el.querySelector("#labTime").textContent = hagyo ? "하교 시간" : "등교 시간";
    el.querySelectorAll("#modeSeg .seg-btn").forEach((b) =>
      b.classList.toggle("on", b.dataset.mode === q.mode));
  }

  el.querySelectorAll("#modeSeg .seg-btn").forEach((b) =>
    b.addEventListener("click", () => {
      if (q.mode === b.dataset.mode) return;
      store.setQuery("mode", b.dataset.mode);
      store.setQuery("time", DEFAULT_TIME[b.dataset.mode]);
      reflect();
    }));

  el.querySelector("#fieldSchool").addEventListener("click", () =>
    openPicker({ title: "학교 검색", placeholder: "학교 이름 (예: 세경고)", fetcher: fetchSchools,
      mapQuery: (it) => it.sub || `${it.value} 파주`,
      onPick: (v) => { store.setQuery("school", v); reflect(); } }));
  el.querySelector("#fieldRegion").addEventListener("click", () =>
    openPicker({ title: "도착 지역 (파주)", placeholder: "읍·면·동 (예: 문산)", fetcher: fetchRegions,
      mapQuery: (it) => `파주시 ${it.value}`,
      onPick: (v) => { store.setQuery("region", v); reflect(); } }));
  el.querySelector("#fieldTime").addEventListener("click", () =>
    openTimeSheet(q.time, (v) => { store.setQuery("time", v); reflect(); }, q.mode));

  el.querySelector(".home-bell").addEventListener("click", () => navigate("notice"));
  el.querySelector("#searchBtn").addEventListener("click", () => navigate("results"));
  el.querySelectorAll(".quick").forEach((b) =>
    b.addEventListener("click", () => { store.setQuery("region", b.dataset.region); reflect(); navigate("results"); }));
  wireTabbar(el);

  const ticketBox = el.querySelector("#homeTicket");
  function renderTicket() {
    const b = store.state.booking;
    if (!b) {
      ticketBox.replaceChildren(h(`
        <div class="card ticket-empty">
          <div class="te-ic">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1-2 2H6a2 2 0 0 1-2-2 2 2 0 0 0 0-4z" stroke="#B0B8C1" stroke-width="2" stroke-linejoin="round"/></svg>
          </div>
          <div>
            <div class="te-t">예매된 탑승권이 없어요</div>
            <div class="te-d">노선을 조회하고 좌석을 예약해보세요</div>
          </div>
        </div>`));
      return;
    }
    const r = store.state.routes[b.routeId] || b.route;
    const node = h(`
      <div class="card ticket-mini">
        <div class="tm-top"><span class="tm-live">오늘 하교</span><span class="tm-code">${r.code}</span></div>
        <div class="tm-route">${r.title}</div>
        <div class="tm-line">
          <div class="tm-when"><b>${r.depart}</b> ${r.departSpot}</div>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="#B0B8C1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          <div class="tm-when"><b>${r.arrive}</b> ${r.arriveSpot}</div>
          <div class="tm-seat">${b.seatNo}번</div>
        </div>
        <div class="tm-cta">내 탑승권 · QR 보기 ›</div>
      </div>`);
    node.addEventListener("click", () => navigate("ticket"));
    ticketBox.replaceChildren(node);
  }

  const unsub = store.subscribe((evt) => { if (evt.type === "booking") renderTicket(); });

  return {
    el, name: "home",
    onShow() { reflect(); renderTicket(); },
    unmount() { unsub(); },
  };
}
