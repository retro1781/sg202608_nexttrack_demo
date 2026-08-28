// 05 결제 (시연용 모의 결제 — 실제 금융 거래 없음)
import { h } from "../util.js";
import { store } from "../store.js";
import { navigate } from "../router.js";
import { toast } from "../ui.js";

export default function Payment() {
  const el = h(`
    <section class="view active" id="v-payment">
      <div class="appbar">
        <div class="back" data-go="seat">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M15 19l-7-7 7-7" stroke="#191F28" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
        <span class="title">결제</span>
      </div>
      <div class="scroll">
        <div style="padding:18px 20px 0">
          <div class="pay-card">
            <div class="pay-head">
              <div class="pay-ic">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M5 16V8a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v8" stroke="#fff" stroke-width="2" stroke-linecap="round"/><path d="M4 16h16M8 9h8" stroke="#fff" stroke-width="2" stroke-linecap="round"/><circle cx="8" cy="18.3" r="1.5" fill="#fff"/><circle cx="16" cy="18.3" r="1.5" fill="#fff"/></svg>
              </div>
              <div>
                <div style="font-size:17px;font-weight:800;color:#191F28" id="payRoute"></div>
                <div style="font-size:13px;color:#6B7684;font-weight:600;margin-top:3px" id="paySeat"></div>
              </div>
            </div>
            <div class="tags" style="margin-top:14px">
              <span class="chip" style="color:#0E2C6E;background:#EAF0FB;font-size:11.5px;padding:5px 10px">평일 20일 운행</span>
              <span class="chip" style="color:#0E9E6E;background:#ECFDF5;font-size:11.5px;padding:5px 10px">보호자 안심 알림</span>
            </div>
          </div>

          <div class="pay-card" style="margin-top:14px">
            <div style="font-size:14px;font-weight:800;color:#191F28;margin-bottom:14px">결제 금액</div>
            <div class="pay-row"><span>월 정액</span><b>88,000원</b></div>
            <div class="pay-row"><span>첫 달 50% 할인</span><b style="color:#12388F">−44,000원</b></div>
            <div class="pay-row"><span>3개월 약정 혜택</span><b style="color:#0E9E6E;background:#ECFDF5;border-radius:7px;padding:3px 9px">1개월 무료</b></div>
            <div class="hr"></div>
            <div class="pay-total"><span class="l">첫 달 결제금액</span><span class="v">44,000원</span></div>
            <div style="margin-top:10px;background:#EAF0FB;border-radius:11px;padding:10px 13px;display:flex;align-items:center;gap:8px">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#12388F" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
              <span style="font-size:12.5px;font-weight:700;color:#0E2C6E" id="payPerRide">회당 요금 — 안심 하교 + 보호자 알림</span>
            </div>
          </div>

          <div class="pay-card" style="padding:8px 18px;margin-top:14px">
            <div style="font-size:14px;font-weight:800;color:#191F28;padding:12px 0 6px">결제 수단</div>
            <div class="method">
              <div class="test-badge">TEST</div>
              <span style="flex:1;font-size:15px;font-weight:700;color:#191F28">테스트용 카드 <span style="color:#E11D48;font-weight:700">(실결제 X)</span></span>
              <div class="radio on"><svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
            </div>
          </div>

          <div style="display:flex;align-items:flex-start;gap:8px;margin-top:16px;padding:0 4px">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="margin-top:1px;flex:none"><circle cx="12" cy="12" r="9" stroke="#B0B8C1" stroke-width="2"/><path d="M12 11v5M12 8.2v.1" stroke="#B0B8C1" stroke-width="2" stroke-linecap="round"/></svg>
            <span style="font-size:12.5px;line-height:1.5;color:#8B95A1;font-weight:500">7일 이상 미사용 시 일시정지로 해당 기간을 환불받을 수 있어요. <b style="color:#B0B8C1">(시연용 모의 결제)</b></span>
          </div>
          <div style="height:14px"></div>
        </div>
      </div>
      <div class="footer">
        <button class="cta" id="payBtn">44,000원 결제하고 시작하기</button>
        <div class="homebar"><div></div></div>
      </div>
    </section>`);

  const r = store.state.routes[store.state.selectedRouteId];
  const seat = store.state.selectedSeat;
  if (r) {
    el.querySelector("#payRoute").textContent = `${r.title} ${r.code}`;
    el.querySelector("#paySeat").textContent = `${seat}번 좌석 · 평일 하교`;
    if (r.perRide != null)
      el.querySelector("#payPerRide").textContent =
        `회당 ${Number(r.perRide).toLocaleString("ko-KR")}원 — 안심 하교 + 보호자 알림`;
  }

  const btn = el.querySelector("#payBtn");
  btn.addEventListener("click", async () => {
    btn.disabled = true;
    const prev = btn.textContent;
    btn.textContent = "결제 처리 중…";
    try {
      await store.book(store.state.selectedRouteId, seat);
      navigate("confirm");
    } catch (err) {
      if (err.code === 409) { toast("이미 예약된 좌석이에요. 다른 좌석을 골라주세요."); navigate("seat"); }
      else { toast("네트워크 오류. 다시 시도해주세요."); btn.disabled = false; btn.textContent = prev; }
    }
  });

  return {
    el, name: "payment",
    onShow() { if (!r || seat == null) navigate("home"); },  // 딥링크 방어
    unmount() {},
  };
}
