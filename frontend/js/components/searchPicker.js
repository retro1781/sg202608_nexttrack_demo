// 자동완성 검색 오버레이 — 학교(NEIS 캐시) / 파주 지역 공용.
// 항목 선택 시 지도(구글맵 임베드)로 "여기가 맞나요?" 확인 후 확정.
import { h } from "../util.js";

let overlay, input, listEl, curFetcher, curPick, curMapQuery, debTimer, curItems = [];

function ensure() {
  if (overlay) return overlay;
  overlay = h(`
    <div class="overlay picker" id="pickerOverlay">
      <div class="ov-head">
        <div class="ov-back" id="pickerClose">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M15 19l-7-7 7-7" stroke="#191F28" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
        <span class="ov-title" id="pickerTitle">검색</span>
      </div>
      <div class="picker-search">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="#8B95A1" stroke-width="2"/><path d="M20 20l-3.5-3.5" stroke="#8B95A1" stroke-width="2" stroke-linecap="round"/></svg>
        <input id="pickerInput" type="text" autocomplete="off" placeholder="검색">
      </div>
      <div class="picker-list" id="pickerList"></div>
    </div>`);
  input = overlay.querySelector("#pickerInput");
  listEl = overlay.querySelector("#pickerList");
  overlay.querySelector("#pickerClose").addEventListener("click", close);
  input.addEventListener("input", () => { clearTimeout(debTimer); debTimer = setTimeout(run, 180); });
  document.getElementById("phoneScreen").appendChild(overlay);
  return overlay;
}

function close() { overlay.classList.remove("show"); }

function norm(it) {
  return typeof it === "string"
    ? { value: it, label: it, sub: "" }
    : { value: it.name, label: it.name, sub: it.addr || "" };
}
const esc = (s) => String(s).replace(/"/g, "&quot;");

function itemHTML(it, i) {
  return `<div class="picker-item" data-i="${i}">
     <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style="flex:none;margin-top:1px"><circle cx="12" cy="10" r="3" stroke="#12388F" stroke-width="2"/><path d="M5 20c0-3.3 3.1-5 7-5s7 1.7 7 5" stroke="#12388F" stroke-width="2" stroke-linecap="round"/></svg>
     <span class="pi-text"><span class="pi-name">${it.label}</span>${it.sub ? `<span class="pi-sub">${it.sub}</span>` : ""}</span>
   </div>`;
}

const CHEV = `<svg class="pg-chev" width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="#B0B8C1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

// data 는 배열(학교) 또는 { groups:[{label,items}] }(지역) 둘 다 지원.
// 지역은 권역 그룹을 눌러서 펼치는 아코디언으로 표시.
function render(data) {
  curItems = [];
  const query = input.value.trim();
  let html = "";
  const push = (raw) => { const n = norm(raw); const i = curItems.push(n) - 1; return itemHTML(n, i); };

  if (data && Array.isArray(data.groups)) {
    if (!data.groups.length) { listEl.innerHTML = `<div class="picker-empty">검색 결과가 없어요</div>`; return; }
    data.groups.forEach((g, gi) => {
      const open = query !== "";   // 검색 중이면 모두 펼치고, 평소엔 전부 접음
      html += `<div class="picker-acc${open ? " open" : ""}">
        <button type="button" class="picker-group" data-g="${gi}">
          <span class="pg-label">${g.label}</span>
          <span class="pg-right"><span class="pg-count">${g.items.length}</span>${CHEV}</span>
        </button>
        <div class="picker-acc-body">${g.items.map(push).join("")}</div>
      </div>`;
    });
  } else {
    const arr = Array.isArray(data) ? data : [];
    if (!arr.length) { listEl.innerHTML = `<div class="picker-empty">검색 결과가 없어요</div>`; return; }
    arr.forEach((raw) => { html += push(raw); });
  }

  listEl.innerHTML = html;
  listEl.querySelectorAll(".picker-group[data-g]").forEach((hd) =>
    hd.addEventListener("click", () => hd.closest(".picker-acc").classList.toggle("open")));
  listEl.querySelectorAll(".picker-item").forEach((el) =>
    el.addEventListener("click", () => {
      const it = curItems[Number(el.dataset.i)];
      if (curMapQuery) showMapConfirm(it);
      else { curPick(it.value); close(); }
    }));
}

// 지도 확인 팝업 (OpenStreetMap — 키 불필요, 한국 신도시 표기 양호)
async function showMapConfirm(it) {
  const q = curMapQuery(it);
  const dim = h(`
    <div class="map-dim">
      <div class="map-card">
        <div class="map-frame"><div class="map-loading">지도 불러오는 중…</div></div>
        <div class="map-info">
          <div class="map-name">${it.label}</div>
          <div class="map-addr">${it.sub || q}</div>
        </div>
        <div class="map-q">여기가 맞나요?</div>
        <div class="map-btns">
          <button class="map-cancel">다시 선택</button>
          <button class="map-ok">네, 맞아요</button>
        </div>
      </div>
    </div>`);
  let lmap = null;
  const remove = () => {
    if (lmap) { try { lmap.remove(); } catch (e) {} lmap = null; }
    dim.classList.remove("show");
    setTimeout(() => dim.remove(), 180);
  };
  dim.querySelector(".map-ok").addEventListener("click", () => { remove(); curPick(it.value); close(); });
  dim.querySelector(".map-cancel").addEventListener("click", remove);
  dim.addEventListener("click", (e) => { if (e.target === dim) remove(); });
  document.getElementById("phoneScreen").appendChild(dim);
  setTimeout(() => dim.classList.add("show"), 10);

  // 주소 → 좌표(서버 지오코딩) → Leaflet 지도(키 불필요, 인터랙션 off)
  let lat = 37.7599, lon = 126.7802, marker = false;  // 실패 시 파주시 중심
  try {
    const g = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`).then((r) => r.json());
    if (g.ok) { lat = g.lat; lon = g.lon; marker = true; }
  } catch (e) {}

  const frame = dim.querySelector(".map-frame");
  if (!frame || !document.body.contains(dim)) return;
  if (typeof L === "undefined") { frame.innerHTML = `<div class="map-loading">지도를 불러올 수 없어요</div>`; return; }
  frame.innerHTML = `<div class="map-canvas"></div>`;
  try {
    lmap = L.map(frame.querySelector(".map-canvas"), {
      zoomControl: false, attributionControl: false, dragging: false, tap: false,
      scrollWheelZoom: false, doubleClickZoom: false, touchZoom: false, boxZoom: false, keyboard: false,
    }).setView([lat, lon], 16);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", { maxZoom: 19 }).addTo(lmap);
    if (marker) {
      L.circleMarker([lat, lon], { radius: 9, color: "#fff", weight: 3, fillColor: "#12388F", fillOpacity: 1 }).addTo(lmap);
    }
    setTimeout(() => { if (lmap) lmap.invalidateSize(); }, 60);
  } catch (e) {
    frame.innerHTML = `<div class="map-loading">지도를 불러올 수 없어요</div>`;
  }
}

async function run() {
  const q = input.value.trim();
  try { render(await curFetcher(q)); }
  catch (e) { render([]); }
}

export function openPicker({ title, placeholder, fetcher, onPick, mapQuery }) {
  ensure();
  curFetcher = fetcher;
  curPick = onPick;
  curMapQuery = mapQuery || null;
  overlay.querySelector("#pickerTitle").textContent = title;
  input.placeholder = placeholder || "검색";
  input.value = "";
  listEl.innerHTML = "";
  overlay.classList.add("show");
  run();
  setTimeout(() => input.focus(), 60);
}

export const fetchSchools = (q) =>
  fetch(`/api/schools?q=${encodeURIComponent(q)}`).then((r) => r.json()).then((d) => d.items || []);
export const fetchRegions = (q) =>
  fetch(`/api/regions?q=${encodeURIComponent(q)}`).then((r) => r.json());  // { groups: [...] }
