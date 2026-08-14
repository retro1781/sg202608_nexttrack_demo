// 하단 탭바 컴포넌트 (홈 · 탑승권 · 마이) — 여러 페이지에서 공유
import { navigate } from "../router.js";
import { store } from "../store.js";
import { toast } from "../ui.js";

const ICON = {
  home: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M4 11l8-6 8 6M6 10v9h12v-9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  ticket: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1-2 2H6a2 2 0 0 1-2-2 2 2 0 0 0 0-4z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M14 6v12" stroke="currentColor" stroke-width="2" stroke-dasharray="2 2"/></svg>`,
  my: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="currentColor" stroke-width="2"/><path d="M4 20c0-4 3.6-6 8-6s8 2 8 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
};

export function tabbarHTML(active) {
  const tab = (k, label) => `<div class="tab ${k === active ? "on" : ""}" data-tab="${k}">${ICON[k]}<span>${label}</span></div>`;
  return `<nav class="tabbar">${tab("home", "홈")}${tab("ticket", "탑승권")}${tab("my", "마이")}</nav>`;
}

export function wireTabbar(root) {
  root.querySelectorAll(".tab[data-tab]").forEach((t) =>
    t.addEventListener("click", () => {
      const k = t.dataset.tab;
      if (k === "home") navigate("home");
      else if (k === "ticket") {
        if (store.state.ride) navigate("ride");          // 탑승 중이면 실시간 탑승 화면으로
        else if (store.state.booking) navigate("ticket");
        else toast("예매된 탑승권이 없어요");
      }
      else if (k === "my") navigate("my");
    }));
}
