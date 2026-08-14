// 08 마이페이지 (간단)
import { h } from "../util.js";
import { store } from "../store.js";
import { navigate } from "../router.js";
import { toast, modal } from "../ui.js";
import { tabbarHTML, wireTabbar } from "../components/tabbar.js";
import { getLog, monthCount, totalCount, fmtDate } from "../rideLog.js";

export default function My() {
  const b = store.state.booking;
  const log = getLog();
  const rows = log.slice(0, 12);
  const logRows = rows.map((r, i) =>
    `<div class="rl-row${i >= 3 ? " rl-hidden" : ""}"><div><div class="rl-route">${r.route}</div><div class="rl-date">${fmtDate(r.date)}${r.seat ? ` · ${r.seat}번` : ""}</div></div><span class="rl-badge">이용완료</span></div>`
  ).join("");
  const moreBtn = rows.length > 3
    ? `<button class="rl-more" data-more data-exp="0">더보기 (${rows.length - 3}개 더)</button>` : "";

  const el = h(`
    <section class="view active" id="v-my">
      <div class="my-top">
        <div class="my-avatar">홍</div>
        <div style="flex:1">
          <div class="my-name">홍길동님</div>
          <div class="my-id">세경고등학교 · 안심 하교 이용중</div>
        </div>
        <span class="my-grade">🎫 정기권</span>
      </div>
      <div class="scroll" style="background:#F4F5F7">
        <div style="padding:16px 20px 24px">
          <div class="my-summary">
            <div class="ms-cell"><div class="ms-n">${monthCount()}</div><div class="ms-l">이번 달 탑승</div></div>
            <div class="ms-div"></div>
            <div class="ms-cell"><div class="ms-n">${totalCount()}</div><div class="ms-l">누적 탑승</div></div>
            <div class="ms-div"></div>
            <div class="ms-cell"><div class="ms-n">${b ? 1 : 0}</div><div class="ms-l">이용중 노선</div></div>
          </div>

          <div class="section-title">탑승 로그</div>
          <div class="card ridelog">
            <div class="rl-top">
              <div><div class="rl-big">이번 달 <b>${monthCount()}</b>회</div><div class="rl-sub">안전하게 하교했어요 🚌</div></div>
              <div class="rl-badge2">최근순</div>
            </div>
            <div class="rl-list">${logRows}</div>
            ${moreBtn}
          </div>

          <div class="section-title">이용 관리</div>
          <div class="card my-menu">
            <div class="mi" data-act="ticket"><span class="mi-ic">🎫</span><span class="mi-t">내 탑승권</span><span class="mi-arw">›</span></div>
            <div class="mi" data-act="pay"><span class="mi-ic">💳</span><span class="mi-t">결제 수단 · 정기결제 내역</span><span class="mi-arw">›</span></div>
            <div class="mi" data-act="guardian"><span class="mi-ic">🔔</span><span class="mi-t">보호자 안심 알림 설정</span><span class="mi-badge">ON</span><span class="mi-arw">›</span></div>
          </div>

          <div class="section-title">고객센터</div>
          <div class="card my-menu">
            <div class="mi" data-act="notice"><span class="mi-ic">📢</span><span class="mi-t">공지사항 · 이용안내</span><span class="mi-arw">›</span></div>
            <div class="mi" data-act="cs"><span class="mi-ic">💬</span><span class="mi-t">문의하기</span><span class="mi-arw">›</span></div>
            <div class="mi" data-act="logout"><span class="mi-ic">🚪</span><span class="mi-t" style="color:#E11D48">로그아웃</span><span class="mi-arw">›</span></div>
          </div>

          <div class="my-ver">넥스트랙 NEXTRACK v0.1 · 세경고 말랑연구소<br>시연 프로토타입</div>
        </div>
      </div>
      ${tabbarHTML("my")}
    </section>`);

  wireTabbar(el);

  // 탑승 로그 더보기/접기
  const more = el.querySelector("[data-more]");
  if (more) more.addEventListener("click", () => {
    const exp = more.dataset.exp === "1";
    el.querySelectorAll(".rl-row").forEach((row, i) => row.classList.toggle("rl-hidden", exp && i >= 3));
    more.dataset.exp = exp ? "0" : "1";
    more.textContent = exp ? `더보기 (${rows.length - 3}개 더)` : "접기";
  });

  el.querySelectorAll(".mi[data-act]").forEach((mi) =>
    mi.addEventListener("click", () => {
      const act = mi.dataset.act;
      if (act === "ticket") navigate("tickets");
      else if (act === "pay") navigate("payments");
      else if (act === "notice") navigate("notice");
      else if (act === "guardian") modal({ title: "보호자 안심 알림", body: "탑승·하차 순간 보호자에게 자동으로 알림이 전송됩니다. <b>(시연에서는 항상 ON)</b>" });
      else if (act === "logout") modal({ title: "로그아웃", body: "로그아웃하시겠어요?", confirmText: "로그아웃" }).then(() => navigate("login"));
      else toast("해당 기능은 시연에서 제외되었습니다.");
    }));

  return { el, name: "my", unmount() {} };
}
