// 마이 > 결제 수단 · 정기결제 내역
import { h } from "../util.js";
import { store } from "../store.js";
import { modal } from "../ui.js";

const BACK = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M15 19l-7-7 7-7" stroke="#191F28" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

export default function Payments() {
  const b = store.state.booking;
  const r = b ? (store.state.routes[b.routeId] || b.route) : null;

  const subscription = r
    ? `<div class="pay-sub">
         <div class="ps-head"><div class="ps-title">${r.title} ${r.code} 정기권</div><span class="ps-badge">이용중</span></div>
         <div class="ps-row"><span>월 정액</span><b>88,000원</b></div>
         <div class="ps-row"><span>다음 결제 예정일</span><b>2026.09.14</b></div>
         <button class="ps-cancel" data-act="cancel">구독 일시정지</button>
       </div>`
    : `<div class="card ticket-empty"><div class="te-ic">💳</div><div><div class="te-t">이용중인 정기권이 없어요</div><div class="te-d">노선을 예약하면 정기결제가 시작돼요</div></div></div>`;

  const history = r
    ? `<div class="pay-hist-row"><div><div class="ph-t">첫 달 정기권 결제</div><div class="ph-d">2026.08.14 · 테스트용 카드</div></div><div class="ph-amt">44,000원</div></div>
       <div class="pay-hist-row"><div><div class="ph-t">첫 달 50% 할인</div><div class="ph-d">2026.08.14 · 프로모션</div></div><div class="ph-amt discount">−44,000원</div></div>`
    : `<div class="pay-hist-empty">결제 내역이 없어요</div>`;

  const el = h(`
    <section class="view active" id="v-payments">
      <div class="appbar"><div class="back" data-go="my">${BACK}</div><span class="title">결제 수단</span></div>
      <div class="scroll" style="background:#F4F5F7">
        <div style="padding:14px 20px 24px">
          <div class="section-title" style="margin-top:2px">등록된 결제 수단</div>
          <div class="card pay-method-card">
            <div class="pmc-badge">TEST</div>
            <div style="flex:1">
              <div class="pmc-name">테스트용 카드 <span style="color:#E11D48;font-weight:700">(실결제 X)</span></div>
              <div class="pmc-no">넥스트랙 시연 · 1234-****-****-0000</div>
            </div>
            <span class="pmc-def">기본</span>
          </div>
          <button class="add-method" data-act="add">+ 결제 수단 추가</button>

          <div class="section-title">정기결제(구독)</div>
          ${subscription}

          <div class="section-title">결제 내역</div>
          <div class="card my-menu">${history}</div>

          <div class="pay-guard">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#B0B8C1" stroke-width="2"/><path d="M12 11v5M12 8.2v.1" stroke="#B0B8C1" stroke-width="2" stroke-linecap="round"/></svg>
            <span>시연용 모의 결제입니다 · 실제 금융 거래는 발생하지 않아요</span>
          </div>
        </div>
      </div>
    </section>`);

  el.querySelectorAll("[data-act]").forEach((btn) =>
    btn.addEventListener("click", () => {
      const a = btn.dataset.act;
      if (a === "cancel") modal({ title: "구독 일시정지", body: "7일 이상 미사용 시 일시정지로 해당 기간을 환불받을 수 있어요. <b>(시연에서는 제외)</b>" });
      else modal({ body: "결제 수단 추가는 시연에서 제외되었습니다." });
    }));

  return { el, name: "payments", unmount() {} };
}
