// 마이 > 공지사항 · 이용안내 (아코디언)
import { h } from "../util.js";

const BACK = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M15 19l-7-7 7-7" stroke="#191F28" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

const NOTICES = [
  { tag: "안내", date: "2026.08.14", title: "안심 하교 셔틀 정식 운행 안내",
    body: "북파주 지역 학생을 대상으로 세경고 → 문산·금촌 노선을 평일 하교 시간에 운행합니다. 같은 학교·같은 방향 학생끼리 좌석을 매칭해 안전하게 함께 하교해요." },
  { tag: "이벤트", date: "2026.08.14", title: "첫 달 정기권 50% 할인",
    body: "지금 예약하면 첫 달 정기권을 50% 할인가(88,000원 → 44,000원)로 이용할 수 있어요. 회당 2,000원부터(권역별) 안심 하교와 보호자 알림을 모두 누리세요." },
  { tag: "이용안내", date: "2026.08.13", title: "보호자 안심 알림은 이렇게 동작해요",
    body: "학생이 버스에 탑승하는 순간 보호자에게 자동으로 '탑승 완료' 알림이 전송되고, 이동 중에는 실시간 위치가 공유돼요. 하차 시에도 다시 알림이 갑니다." },
  { tag: "이용안내", date: "2026.08.12", title: "노선 후보 15명 모이면 자동 개설",
    body: "원하는 노선이 없다면 '노선 후보'로 등록하세요. 같은 방향 학생 15명이 모이면 해당 노선이 자동으로 개설되어 운행을 시작합니다." },
  { tag: "이용안내", date: "2026.08.11", title: "탑승 시 QR을 준비해주세요",
    body: "예약 완료 화면의 탑승 QR을 기사님께 보여주면 탑승이 확인됩니다. 지정 좌석제로 운영되어 내 자리가 항상 보장돼요." },
];

export default function Notice() {
  const el = h(`
    <section class="view active" id="v-notice">
      <div class="appbar"><div class="back" data-go="my">${BACK}</div><span class="title">공지사항 · 이용안내</span></div>
      <div class="scroll" style="background:#F4F5F7">
        <div style="padding:14px 20px 24px">
          <div class="notice-list">
            ${NOTICES.map((n, i) => `
              <div class="ntc ${i === 0 ? "open" : ""}" data-i="${i}">
                <div class="ntc-head">
                  <div style="flex:1">
                    <span class="ntc-tag ${n.tag}">${n.tag}</span>
                    <div class="ntc-title">${n.title}</div>
                    <div class="ntc-date">${n.date}</div>
                  </div>
                  <svg class="ntc-chev" width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="#B0B8C1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </div>
                <div class="ntc-body">${n.body}</div>
              </div>`).join("")}
          </div>
        </div>
      </div>
    </section>`);

  el.querySelectorAll(".ntc").forEach((n) =>
    n.querySelector(".ntc-head").addEventListener("click", () => n.classList.toggle("open")));

  return { el, name: "notice", unmount() {} };
}
