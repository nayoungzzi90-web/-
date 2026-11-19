import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { TtShell } from "@/components/ttotto/TtShell";
import { isAuthConfigured, supabase } from "@/integrations/supabase/client";
import { COMING_SOON, PROVIDER_INFO, enabledProviders, oauthErrorKo, type SocialProvider } from "@/lib/auth-providers";
import { passwordProblem } from "@/lib/password-policy";
import { safeNext } from "@/lib/safe-next";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): { next?: string } => ({
    ...(typeof s["next"] === "string" ? { next: s["next"] } : {}),
  }),
  head: () => ({ meta: [{ title: "로그인 · 또또사주" }] }),
  component: AuthPage,
});

// 상표 로고 이미지는 쓰지 않고 글자만 쓴다(각 사의 색만 따른다).
const SOCIAL_STYLE: Record<SocialProvider, string> = {
  kakao: "!bg-[#FEE500] !text-[#191919] !border-0",
  naver: "!bg-[#03C75A] !text-white !border-0",
  google: "!bg-white !text-[#28231f] !border-[1.5px] !border-[#d6c7ab]",
};

const BOX =
  "mt-1.5 w-full rounded-[14px] border-[1.5px] border-[#d6c7ab] bg-white px-3.5 py-3 text-[17px] outline-none focus:border-[var(--tt-orange)]";

function errorKo(msg: string) {
  if (msg.includes("Invalid login credentials")) return "이메일 또는 비밀번호가 올바르지 않아요.";
  if (msg.includes("already registered")) return "이미 가입된 이메일이에요. 로그인해 주세요.";
  if (msg.includes("not confirmed")) return "이메일 확인 후 다시 로그인해 주세요.";
  if (msg.toLowerCase().includes("password")) return "비밀번호 조건을 확인해 주세요(8자 이상).";
  if (msg.toLowerCase().includes("rate limit")) return "너무 많이 시도했어요. 잠시 후 다시 해 주세요.";
  return "로그인에 문제가 생겼어요. 다시 시도해 주세요.";
}

function AuthPage() {
  const { next } = Route.useSearch();
  const nav = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [sent, setSent] = useState(false);
  const [resendMsg, setResendMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(true);
  const [providers, setProviders] = useState<SocialProvider[]>([]);
  useEffect(() => {
    setReady(isAuthConfigured());
    setProviders(enabledProviders());
  }, []);

  // 소셜 로그인: 제공자 화면으로 이동했다가 이 사이트(로그인 뒤 가려던 곳)로 돌아온다. 돌아올 주소는 Supabase 의 허용 주소에 등록돼 있어야 한다.
  const social = async (p: SocialProvider) => {
    setErr("");
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: PROVIDER_INFO[p].supabaseId as never,
        options: { redirectTo: `${window.location.origin}${safeNext(next)}` },
      });
      if (error) setErr(oauthErrorKo(error.message));
    } catch {
      setErr(oauthErrorKo(undefined));
    } finally {
      setBusy(false);
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) return setErr("이메일과 비밀번호를 입력해 주세요.");
    if (mode === "signup") {
      const problem = passwordProblem(password, email);
      if (problem) return setErr(problem);
    }
    setErr("");
    setBusy(true);
    try {
      const { data, error } =
        mode === "signup"
          ? await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } })
          : await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setErr(errorKo(error.message));
        return;
      }
      if (mode === "signup" && !data.session) {
        setSent(true);
        return;
      }
      void nav({ to: safeNext(next) });
    } catch {
      setErr("로그인에 문제가 생겼어요. 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  };

  const seg = (on: boolean) =>
    `rounded-[14px] border-[1.5px] py-2.5 text-[16px] font-bold ${on ? "border-[#e0a84a] bg-[#fff0c2]" : "border-[#d6c7ab] bg-white"}`;

  return (
    <TtShell title="로그인">
      <h1 className="mt-5 text-[clamp(26px,7.4vw,32px)] leading-tight">
        환영해요, <mark className="tt-mark">또또</mark>예요
      </h1>
      <p className="mt-2 text-[15px] text-[var(--tt-muted)]">로그인하면 내 닢과 열어본 이야기를 이어서 볼 수 있어요.</p>

      {!ready ? (
        <div className="hj-card p-5 text-center" role="status">
          <p className="text-[18px] font-bold">로그인은 준비 중이에요</p>
          <p className="mt-1 text-[14px] text-[var(--tt-muted)]">지금은 로그인 없이 내 사주와 오늘의 운세쿠키를 볼 수 있어요.</p>
        </div>
      ) : sent ? (
        <div className="hj-card p-5 text-center">
          <p className="text-[19px] font-bold">이메일로 확인 링크를 보냈어요</p>
          <p className="mt-2 text-[14px] text-[var(--tt-muted)]">
            {email} 메일함에서 링크를 눌러 주세요. 안 보이면 스팸함도 살펴봐 주세요. 링크는 한 번만 쓸 수 있어요.
          </p>
          <button
            type="button"
            className="tt-btn tt-sub mt-4"
            onClick={async () => {
              setResendMsg("");
              const { error } = await supabase.auth.resend({ type: "signup", email, options: { emailRedirectTo: window.location.origin } });
              setResendMsg(error ? "지금은 다시 보내지 못했어요. 잠시 뒤에 해 주세요." : "확인 메일을 다시 보냈어요.");
            }}
          >
            확인 메일 다시 보내기
          </button>
          {resendMsg && <p role="status" className="mt-2 text-[13px]">{resendMsg}</p>}
          <button type="button" className="mt-3 text-[13px] text-[var(--tt-muted)] underline" onClick={() => { setSent(false); setMode("signin"); }}>
            이미 확인했다면 로그인하기
          </button>
        </div>
      ) : (
        <div className="hj-card space-y-4 p-5">
          {(providers.length > 0 || COMING_SOON.length > 0) && (
            <div className="space-y-2.5" aria-label="소셜 로그인">
              {COMING_SOON.map((p) => (
                <button
                  key={p}
                  type="button"
                  disabled
                  aria-disabled="true"
                  className="tt-btn w-full !min-h-[54px] !rounded-[16px] !text-[17px] !shadow-none !border-0 !bg-[#f6f0e4] !text-[#7d7467] !opacity-100"
                >
                  {PROVIDER_INFO[p].label.replace("로 계속하기", "")} 로그인 · 준비 중
                </button>
              ))}
              {providers.map((p) => (
                <button
                  key={p}
                  type="button"
                  disabled={busy}
                  onClick={() => void social(p)}
                  className={`tt-btn w-full !min-h-[54px] !rounded-[16px] !text-[17px] !shadow-none disabled:opacity-50 ${SOCIAL_STYLE[p]}`}
                >
                  {PROVIDER_INFO[p].label}
                </button>
              ))}
              <div className="flex items-center gap-2 pt-1 text-[13px] text-[var(--tt-muted)]" aria-hidden>
                <span className="h-px flex-1 bg-[var(--hair)]" />
                또는 이메일로
                <span className="h-px flex-1 bg-[var(--hair)]" />
              </div>
            </div>
          )}
        <form className="space-y-4" onSubmit={submit}>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className={seg(mode === "signin")} onClick={() => setMode("signin")}>로그인</button>
            <button type="button" className={seg(mode === "signup")} onClick={() => setMode("signup")}>회원가입</button>
          </div>
          <label className="block text-[15px] font-bold text-[var(--tt-muted)]">
            이메일
            <input type="email" required className={BOX} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </label>
          <label className="block text-[15px] font-bold text-[var(--tt-muted)]">
            비밀번호
            <input type="password" required className={BOX} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "signup" ? "new-password" : "current-password"} />
          </label>
          {mode === "signup" && <p className="text-[13px] text-[var(--tt-muted)]">비밀번호는 8자 이상이어야 해요. 가입하면 이메일로 확인 링크가 가요.</p>}
          {err && <p role="alert" className="text-[14px] font-bold text-[#c2410c]">{err}</p>}
          <button disabled={busy} className="tt-btn tt-primary disabled:opacity-50">
            {busy ? "잠시만요…" : mode === "signup" ? "가입하기" : "로그인"}
          </button>
        </form>
        </div>
      )}
    </TtShell>
  );
}
