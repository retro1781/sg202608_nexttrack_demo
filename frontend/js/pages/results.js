// 03 검색 결과 — 등교/하교 + 지역 기반으로 여러 노선을 조회해 표시
import { h } from "../util.js";
import { store } from "../store.js";
import { navigate } from "../router.js";

function schoolShort(name) {
  return name.replace(/고등학교$/, "고").replace(/중학교$/, "중").replace(/초등학교$/, "초").replace(/학교$/, "");
}
function regionCore(region) {
  return region.replace(/\d*\s*(읍|면|동|리)$/, "") || region;
}

export default function Results() {
  const el = h(`
    <section class="view active" id="v-results">
      <div class="search-head">
        <div class="appbar" style="padding:0;height:54px">
          <div class="back" data-go="home">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M15 19l-7-7 7-7" stroke="#191F28" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </div>
          <span class="title">검색 결과</span>
        </div>
        <div class="search-pill" id="editPill">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="#6B7684" stroke-width="2"/><path d="M20 20l-3.5-3.5" stroke="#6B7684" stroke-width="2" stroke-linecap="round"/></svg>
          <span class="q"></span>
          <span style="font-size:13px;font-weight:700;color:#12388F">수정</span>
        </div>
      </div>
      <div class="scroll">
        <div style="padding:18px 20px 20px">
          <div class="result-title" id="resultTitle">노선을 찾고 있어요…</div>
          <div id="routeList"></div>
          <div class="dashed">
            <div class="t">찾는 노선이 없나요?</div>
            <div class="d">같은 방향 학생 15명이 모이면<br>자동으로 노선이 개설돼요.</div>
            <div class="go" data-go="candidate" style="cursor:pointer">노선 후보 현황 보기 →</div>
          </div>
        </div>
      </div>
    </section>`);

  const q = store.state.query;
  const sh = schoolShort(q.school);
  const core = regionCore(q.region);
  el.querySelector(".search-pill .q").textContent = q.mode === "하교"
    ? `${sh} → ${core} · ${q.time}`
    : `${core} → ${sh} · ${q.time}`;
  el.querySelector("#editPill").addEventListener("click", () => navigate("home"));

  const listEl = el.querySelector("#routeList");
  const seatBadge = (r) => {
    if (r.remaining <= 0) return `<span class="seat-badge full">매진</span>`;
    return `<span class="seat-badge ${r.remaining <= 3 ? "low" : "ok"}">잔여 ${r.remaining}석</span>`;
  };

  function render(routes) {
    el.querySelector("#resultTitle").innerHTML =
      `딱 맞는 노선 <span style="color:#12388F">${routes.length}개</span>를 찾았어요`;
    listEl.innerHTML = routes.map((r) => {
      const full = r.remaining <= 0, rec = r.recommended;
      return `
      <div class="route-card ${rec ? "rec" : "plain"}">
        ${rec ? `<div class="rec-tag">추천 · 같은 학교 ${r.schoolPeers}명</div>` : ""}
        <div class="rc-head">
          <div class="rc-name">${r.title} <span class="code ${rec ? "" : "dim"}">${r.code}</span></div>
          ${seatBadge(r)}
        </div>
        <div class="timeline">
          <div class="t"><b>${r.depart}</b><span>${r.departSpot}</span></div>
          <div class="bar"><em>${r.durationMin}분${rec ? " · " + r.road : ""}</em></div>
          <div class="t"><b>${r.arrive}</b><span>${r.arriveSpot}</span></div>
        </div>
        ${rec ? `<div class="tags"><span class="tag">교문 앞 탑승</span><span class="tag">지정 좌석</span><span class="tag">보호자 알림</span></div><div class="hr"></div>` : `<div style="height:14px"></div>`}
        <div class="rc-foot">
          <div>
            <div class="price">월 ${Number(r.price).toLocaleString("ko-KR")}<small>원</small></div>
            ${rec ? `<div class="price-sub">회당 약 4,000원</div>` : ""}
          </div>
          <button class="btn-sm ${rec ? "" : "soft"}" ${full ? "disabled style='background:#C5CCD6;color:#fff'" : ""} data-route="${r.id}">${full ? "매진" : "좌석 선택"}</button>
        </div>
      </div>`;
    }).join("");

    listEl.querySelectorAll("[data-route]").forEach((btn) => {
      if (btn.disabled) return;
      btn.addEventListener("click", () => {
        store.state.selectedRouteId = btn.dataset.route;
        store.state.selectedSeat = null;
        navigate("seat");
      });
    });
  }

  async function load() {
    const params = new URLSearchParams({ mode: q.mode, region: q.region, school: q.school, time: q.time });
    try {
      const d = await fetch(`/api/routes?${params}`).then((r) => r.json());
      const routes = d.routes || [];
      // 좌석 페이지가 참조할 수 있게 요약을 store 에 병합
      routes.forEach((r) => { store.state.routes[r.id] = { ...(store.state.routes[r.id] || {}), ...r }; });
      render(routes);
    } catch (e) {
      el.querySelector("#resultTitle").textContent = "노선을 불러오지 못했어요. 다시 시도해주세요.";
    }
  }

  return { el, name: "results", onShow() { load(); }, unmount() {} };
}
