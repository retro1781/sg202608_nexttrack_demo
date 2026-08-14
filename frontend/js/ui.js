// 토스트 · 모달(팝업) — 폰 프레임(#phoneScreen) 안에서 뜬다
import { h } from "./util.js";

let toastTimer;
export function toast(msg) {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2200);
}

// 중앙 팝업. 확인/닫기 시 resolve.
export function modal({ title = "알림", body = "", confirmText = "확인" } = {}) {
  return new Promise((resolve) => {
    const root = document.getElementById("phoneScreen");
    const wrap = h(`
      <div class="modal-dim">
        <div class="modal-card" role="dialog" aria-modal="true">
          ${title ? `<div class="modal-title">${title}</div>` : ""}
          <div class="modal-body">${body}</div>
          <button class="modal-btn">${confirmText}</button>
        </div>
      </div>`);
    const close = () => {
      wrap.classList.remove("show");
      setTimeout(() => wrap.remove(), 200);
      resolve();
    };
    wrap.querySelector(".modal-btn").addEventListener("click", close);
    wrap.addEventListener("click", (e) => { if (e.target === wrap) close(); });
    root.appendChild(wrap);
    // rAF는 탭이 비활성/비합성 상태일 때 지연될 수 있어 setTimeout 사용
    setTimeout(() => wrap.classList.add("show"), 10);
  });
}
