// 07 노선 후보 — 15명 모이면 자동 개설, 실시간 진행률
import { h } from "../util.js";
import { store } from "../store.js";
import { toast } from "../ui.js";

export default function Candidate() {
  const el = h(`
    <section class="view active" id="v-candidate">
      <div class="appbar">
        <div class="back" data-go="results">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M15 19l-7-7 7-7" stroke="#191F28" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
        <span class="title">노선 후보</span>
      </div>
      <div class="scroll">
        <div style="padding:18px 20px 0">
          <div class="cand-hero">
            <div class="top">
              <span class="badge">모집 중 · <span id="candDday">D-9</span></span>
              <span style="font-size:12px;font-weight:600;color:rgba(255,255,255,.85)">자동 개설 대기</span>
            </div>
            <h3 id="candTitle"></h3>
            <div class="sub" id="candSub"></div>
            <div class="cand-count">
              <span class="big" id="candCur">0</span>
              <span class="of">/ <span id="candTgt">15</span>명</span>
              <span class="left"><span id="candLeft">0</span>명 남음</span>
            </div>
            <div class="progress"><div id="candBar" style="width:0%"></div></div>
            <div class="cand-note" id="candNote"></div>
          </div>

          <div class="avatars">
            <div class="ava-stack">
              <div class="ava" style="background:#FF5BA8">김</div>
              <div class="ava" style="background:#12388F">이</div>
              <div class="ava" style="background:#0E9E6E">박</div>
              <div class="ava" style="background:#D97706">최</div>
              <div class="ava" style="background:#8B5CF6">+8</div>
            </div>
            <div style="flex:1;font-size:13px;color:#4E5968;font-weight:600">우리 학교 학생들이<br>이 노선을 기다리고 있어요</div>
          </div>

          <button class="cta" id="joinBtn" style="margin-top:18px">이 노선 후보에 참여하기</button>
          <div style="text-align:center;margin-top:12px;font-size:12.5px;color:#8B95A1;font-weight:600">참여해도 지금 결제되지 않아요 · 개설되면 알림을 보내드려요</div>
        </div>
      </div>
    </section>`);

  function render() {
    const c = store.state.candidate;
    if (!c) return;
    el.querySelector("#candTitle").textContent = c.title;
    el.querySelector("#candSub").textContent = c.subtitle;
    el.querySelector("#candCur").textContent = c.current;
    el.querySelector("#candTgt").textContent = c.target;
    el.querySelector("#candLeft").textContent = c.remaining;
    el.querySelector("#candDday").textContent = "D-" + c.dDay;
    el.querySelector("#candBar").style.width = c.percent + "%";
    const open = c.remaining <= 0;
    el.querySelector("#candNote").textContent = open
      ? "🎉 인원이 모두 모였어요! 노선이 곧 개설됩니다."
      : `${c.remaining}명만 더 모이면 이 노선이 자동으로 개설돼요.`;
    const jb = el.querySelector("#joinBtn");
    jb.disabled = open;
    jb.textContent = open ? "개설 완료 — 곧 운행 시작" : "이 노선 후보에 참여하기";
  }

  el.querySelector("#joinBtn").addEventListener("click", async () => {
    const jb = el.querySelector("#joinBtn");
    jb.disabled = true;
    try {
      const c = await store.joinCandidate();
      render();
      toast(c.remaining <= 0 ? "노선이 개설됐어요! 🎉" : `참여 완료! ${c.current}/${c.target}명`);
    } catch (e) {
      toast("네트워크 오류. 다시 시도해주세요.");
      jb.disabled = false;
    }
  });

  const unsub = store.subscribe((evt) => {
    if (evt.type === "candidate" || evt.type === "snapshot") render();
  });

  return { el, name: "candidate", onShow() { render(); }, unmount() { unsub(); } };
}
