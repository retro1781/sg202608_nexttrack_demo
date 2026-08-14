// 탑승 로그 — localStorage에 저장(시연용 과거 내역 시드 + 실제 탑승 시 추가)
const KEY = "nextrack_ridelog";
const DOW = ["일", "월", "화", "수", "목", "금", "토"];
const pad = (n) => String(n).padStart(2, "0");
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const todayYMD = () => ymd(new Date());

function seed() {
  const today = new Date();
  const routes = [
    ["세경고 → 문산", "직행", 14], ["세경고 → 문산", "직행", 14],
    ["세경고 → 금촌", "경유", 8], ["세경고 → 교하", "직행", 6],
    ["세경고 → 문산", "직행", 14], ["세경고 → 금촌", "경유", 8],
  ];
  const daysAgo = [1, 2, 3, 6, 7, 8, 9, 10, 13, 14];
  return daysAgo.map((k, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - k);
    const r = routes[i % routes.length];
    return { date: ymd(d), route: `${r[0]} ${r[1]}`, seat: r[2] };
  });
}

export function getLog() {
  let log;
  try { log = JSON.parse(localStorage.getItem(KEY)); } catch (e) { log = null; }
  if (!Array.isArray(log)) { log = seed(); localStorage.setItem(KEY, JSON.stringify(log)); }
  return log;
}

export function addRide(entry) {
  const log = getLog();
  if (entry.bookingId && log.some((r) => r.bookingId === entry.bookingId)) return;  // 중복 방지
  log.unshift(entry);
  localStorage.setItem(KEY, JSON.stringify(log));
}

export function monthCount() {
  const now = new Date();
  const ym = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
  return getLog().filter((r) => r.date && r.date.startsWith(ym)).length;
}

export function totalCount() { return getLog().length; }

export function fmtDate(s) {
  const [y, m, dd] = s.split("-").map(Number);
  const d = new Date(y, m - 1, dd);
  return `${pad(m)}.${pad(dd)} (${DOW[d.getDay()]})`;
}
