// 경량 SPA 라우터 — 각 페이지가 실제 URL 경로를 갖는다 (History API).
// 페이지 팩토리는 { el, name, onShow?, unmount? } 를 반환한다.
const routes = {};   // name -> { factory, path }
const byPath = {};   // path -> name
let current = null;
let afterNav = null;

export function onNavigate(fn) { afterNav = fn; }

export function register(name, factory, path) {
  routes[name] = { factory, path };
  if (path) byPath[path] = name;
}

function mount(name, params) {
  const r = routes[name];
  if (!r) { console.warn("[router] unknown route:", name); return null; }
  if (current && current.unmount) current.unmount();
  const app = document.getElementById("app");
  app.innerHTML = "";
  const page = r.factory(params || {});
  app.appendChild(page.el);
  current = page;
  if (page.onShow) page.onShow();
  if (afterNav) { try { afterNav(name); } catch (e) {} }
  return r;
}

// 앱 내부 이동 — URL 을 pushState 로 갱신
export function navigate(name, params) {
  const r = mount(name, params);
  if (r && r.path && location.pathname !== r.path) {
    history.pushState({ name }, "", r.path);
  }
}

// 첫 진입/새로고침 + 뒤로가기(popstate) 처리
export function start(fallback = "login") {
  window.addEventListener("popstate", () => {
    mount(byPath[location.pathname] || fallback);
  });
  const name = byPath[location.pathname] || fallback;
  const r = mount(name);
  if (r && r.path) history.replaceState({ name }, "", r.path);
}

export function currentName() { return current ? current.name : null; }
