// 출발지·도착지 주소 검색 — 다음(카카오) 우편번호 서비스 임베드 오버레이.
// 오프라인/차단 시 prompt() 직접입력 폴백.
import { h } from "../util.js";

let overlay;
function ensure() {
  if (overlay) return overlay;
  overlay = h(`
    <div class="overlay" id="addrOverlay">
      <div class="ov-head">
        <div class="ov-back" id="addrClose">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M15 19l-7-7 7-7" stroke="#191F28" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
        <span class="ov-title" id="addrTitle">주소 검색</span>
      </div>
      <div class="ov-body" id="addrEmbed"></div>
    </div>`);
  overlay.querySelector("#addrClose").addEventListener("click", () => overlay.classList.remove("show"));
  document.getElementById("phoneScreen").appendChild(overlay);
  return overlay;
}

export function openAddress(which, onPick) {
  const title = which === "origin" ? "출발지 검색" : "도착지 검색";
  if (typeof daum === "undefined" || !daum.Postcode) {
    const v = prompt("주소를 입력하세요");
    if (v && v.trim()) onPick(v.trim());
    return;
  }
  const ov = ensure();
  ov.querySelector("#addrTitle").textContent = title;
  const embed = ov.querySelector("#addrEmbed");
  embed.innerHTML = "";
  ov.classList.add("show");
  new daum.Postcode({
    oncomplete: (data) => {
      const addr = data.roadAddress || data.jibunAddress || data.address;
      const label = data.buildingName ? `${addr} (${data.buildingName})` : addr;
      onPick(label);
      ov.classList.remove("show");
    },
    width: "100%", height: "100%",
  }).embed(embed, { autoClose: false });
}
