// 01 로그인 (시연용: 인증 없이 진입)
import { h } from "../util.js";
import { navigate } from "../router.js";
import { modal } from "../ui.js";

export default function Login() {
  const el = h(`
    <section class="view active" id="v-onboarding">
      <div class="login">
        <div class="login-brand">
          <img class="login-logo" src="/svg/nextrack_full.svg" alt="넥스트랙 NEXTRACK">
        </div>

        <form class="login-form" id="loginForm" autocomplete="off">
          <label class="in-field">
            <span class="in-label">아이디</span>
            <input type="text" id="loginId" placeholder="아이디 또는 학번" value="sekyung">
          </label>
          <label class="in-field">
            <span class="in-label">비밀번호</span>
            <input type="password" id="loginPw" placeholder="비밀번호" value="demo1234">
          </label>
          <button type="submit" class="cta" id="loginBtn" style="margin-top:6px">로그인</button>
        </form>

        <div class="login-links">
          <span>회원가입</span><i></i><span>아이디 찾기</span><i></i><span>비밀번호 찾기</span>
        </div>

        <div class="login-or"><span>또는</span></div>
        <button class="kakao-btn" id="kakaoBtn">
          <svg width="19" height="19" viewBox="0 0 24 24"><path d="M12 4C6.9 4 3 7.2 3 11.1c0 2.5 1.7 4.7 4.2 6-.2.6-.7 2.4-.8 2.8 0 .2.2.4.4.2.3-.2 2.7-1.8 3.5-2.4.5.1 1.1.1 1.7.1 5.1 0 9-3.2 9-7.1S17.1 4 12 4z" fill="#191600"/></svg>
          카카오로 3초 만에 시작
        </button>

        <div class="login-foot">넥스트랙 · 세경고 말랑연구소 · 시연 프로토타입</div>
        <div class="homebar"><div></div></div>
      </div>
    </section>`);

  el.querySelector("#loginForm").addEventListener("submit", (e) => {
    e.preventDefault();
    navigate("home");
  });
  el.querySelector("#kakaoBtn").addEventListener("click", () =>
    modal({ title: "카카오 로그인", body: "카카오 로그인은 시연상 제외되었습니다." }));
  el.querySelectorAll(".login-links span").forEach((s) =>
    s.addEventListener("click", () => modal({ body: "해당 기능은 시연에서 제외되었습니다." })));

  return { el, name: "login", unmount() {} };
}
