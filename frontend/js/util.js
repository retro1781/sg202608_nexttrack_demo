// 공용 DOM 유틸
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

// HTML 문자열 → DOM 노드 (첫 번째 엘리먼트)
export function h(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

export const won = (n) => Number(n).toLocaleString("ko-KR") + "원";
export const shortText = (s, n = 12) => (s && s.length > n ? s.slice(0, n) + "…" : s);
