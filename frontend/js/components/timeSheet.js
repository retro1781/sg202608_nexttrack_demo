// 하교 시간 선택 바텀시트.
import { h } from "../util.js";

export const TIMES_HAGYO = [
  { t: "오후 4:00 하교", tag: "정규" },
  { t: "오후 4:30 하교", tag: "정규" },
  { t: "오후 5:00 하교", tag: "정규" },
  { t: "오후 5:30 하교", tag: "정규" },
  { t: "오후 6:00 하교", tag: "보충" },
  { t: "오후 9:00 하교", tag: "야자" },
  { t: "오후 9:30 하교", tag: "야자" },
  { t: "오후 10:00 하교", tag: "야자" },
];
export const TIMES_DUNGGYO = [
  { t: "오전 7:00 등교", tag: "이른" },
  { t: "오전 7:20 등교", tag: "정규" },
  { t: "오전 7:40 등교", tag: "정규" },
  { t: "오전 8:00 등교", tag: "정규" },
  { t: "오전 8:20 등교", tag: "여유" },
];

let dim, sheet;
function ensure() {
  if (sheet) return;
  const root = document.getElementById("phoneScreen");
  dim = h(`<div class="sheet-dim" id="timeDim"></div>`);
  sheet = h(`
    <div class="sheet" id="timeSheet">
      <div class="sheet-grip"></div>
      <div class="sheet-title">하교 시간 선택</div>
      <div class="sheet-list" id="timeList"></div>
    </div>`);
  root.appendChild(dim);
  root.appendChild(sheet);
  dim.addEventListener("click", close);
}
function close() { dim.classList.remove("show"); sheet.classList.remove("show"); }

export function openTimeSheet(current, onPick, mode = "하교") {
  ensure();
  const isDeung = mode === "등교";
  sheet.querySelector(".sheet-title").textContent = `${isDeung ? "등교" : "하교"} 시간 선택`;
  const TIMES = isDeung ? TIMES_DUNGGYO : TIMES_HAGYO;
  const list = sheet.querySelector("#timeList");
  list.innerHTML = TIMES.map((o) => `
    <div class="time-opt ${o.t === current ? "on" : ""}" data-time="${o.t}">
      <span>${o.t}</span>
      <span style="display:flex;align-items:center;gap:8px">
        <span class="tag2">${o.tag}</span>
        <svg class="check" width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </span>
    </div>`).join("");
  Array.from(list.children).forEach((c) =>
    c.addEventListener("click", () => { onPick(c.dataset.time); close(); }));
  dim.classList.add("show");
  sheet.classList.add("show");
}
