// 앱 엔트리 — 라우트 등록, 전역 네비게이션, WebSocket 연결
import { store } from "./store.js";
import { register, navigate, start, onNavigate } from "./router.js";
import Login from "./pages/login.js";
import Home from "./pages/home.js";
import Results from "./pages/results.js";
import Seat from "./pages/seat.js";
import Payment from "./pages/payment.js";
import Confirm from "./pages/confirm.js";
import Ticket from "./pages/ticket.js";
import Ride from "./pages/ride.js";
import Candidate from "./pages/candidate.js";
import My from "./pages/my.js";
import Tickets from "./pages/tickets.js";
import Payments from "./pages/payments.js";
import Notice from "./pages/notice.js";

// 각 화면에 실제 URL 경로 부여
register("login", Login, "/");
register("home", Home, "/home");
register("results", Results, "/search");
register("seat", Seat, "/seat");
register("payment", Payment, "/checkout");
register("confirm", Confirm, "/done");
register("ticket", Ticket, "/ticket");
register("ride", Ride, "/ride");
register("candidate", Candidate, "/candidate");
register("my", My, "/my");
register("tickets", Tickets, "/tickets");
register("payments", Payments, "/payments");
register("notice", Notice, "/notice");

// data-go="<route>" 를 가진 요소는 클릭 시 해당 페이지로 이동
document.addEventListener("click", (e) => {
  const t = e.target.closest("[data-go]");
  if (t) { e.preventDefault(); navigate(t.dataset.go); }
});

// 탑승 중 플로팅 배너 — 진행 중 탑승이 있고 ride 페이지가 아닐 때 표시
const rideBanner = document.getElementById("rideBanner");
rideBanner.addEventListener("click", () => navigate("ride"));
function updateRideBanner(name) {
  const show = !!store.state.ride && name !== "ride" && name !== "login" && name !== "confirm";
  rideBanner.hidden = !show;
}
onNavigate(updateRideBanner);

store.connect();
start("login");  // 현재 URL 에 맞는 페이지로 진입 (딥링크/새로고침 지원)
