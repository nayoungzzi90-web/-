import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Shell } from "@/components/Shell";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): { ref?: string; next?: string } => ({
    ...(typeof s["ref"] === "string" ? { ref: s["ref"] } : {}),
    ...(typeof s["next"] === "string" ? { next: s["next"] } : {}),
  }),
  head: () => ({
    meta: [
      { title: "로그인 — 오행 친구들" },
      {
        name: "description",
        content: "이메일 또는 구글 계정으로 로그인하고 내 사주 기록을 저장해요.",
      },
      { property: "og:title", content: "로그인 — 오행 친구들" },
      { property: "og:description", content: "내 사주 기록 저장하기" },
    ],
  }),
  component: AuthPage,
});

const FIELD = "mt-1 w-full rounded-xl border border-input bg-card px-3 py-2.5 text-base";

function errorKo(msg: string) {
  if (msg.includes("Invalid login credentials")) return "이메일 또는 비밀번호가 올바르지 않아요.";
  if (msg.includes("already registered")) return "이미 가입된 이메일이에요. 로그인해 주세요.";
  if (msg.includes("not confirmed")) return "이메일 확인 후 다시 로그인해 주세요.";
  if (msg.toLowerCase().includes("password")) return "비밀번호는 6자 이상이어야 해요.";
  if (msg.toLowerCase().includes("rate limit"))
    return "너무 많이 시도했어요. 잠시 후 다시 해 주세요.";
  return "로그인에 문제가 생겼어요. 다시 시도해 주세요.";
}

function AuthPage() {
  const { ref, next } = Route.useSearch();
  const nav = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ref) sessionStorage.setItem("ref", ref);
  }, [ref]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) return setErr("이메일과 비밀번호를 입력해 주세요.");
    setErr("");
    setBusy(true);
    try {
      const { data, error } =
        mode === "signup"
          ? await supabase.auth.signUp({ email, password })
          : await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setErr(errorKo(error.message));
        return;
      }
      if (mode === "signup" && !data.session) {
        setSent(true);
        return;
      }
      nav({ to: next && next.startsWith("/") ? next : "/" });
    } catch {
      setErr("로그인에 문제가 생겼어요. 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell title="로그인">
      <h1 className="mb-1 font-serif text-xl font-bold">환영해요 🏮</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        로그인하면 출생정보와 풀이 기록이 저장돼요. 가입하면 엽전 4닢을 드려요.
      </p>
      {sent ? (
        <div className="card-hanji p-6 text-center">
          <p className="text-4xl">📬</p>
          <p className="mt-3 font-serif">이메일로 확인 링크를 보냈어요</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {email} 메일함을 확인하고 링크를 눌러주세요.
          </p>
        </div>
      ) : (
        <form className="card-hanji space-y-4 p-5" onSubmit={submit}>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMode("signin")}
              className={`rounded-xl border py-2 text-sm ${mode === "signin" ? "border-primary bg-primary text-primary-foreground" : "border-input bg-card"}`}
            >
              로그인
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`rounded-xl border py-2 text-sm ${mode === "signup" ? "border-primary bg-primary text-primary-foreground" : "border-input bg-card"}`}
            >
              회원가입
            </button>
          </div>
          <label className="block text-sm font-bold">
            이메일
            <input
              type="email"
              required
              className={FIELD}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </label>
          <label className="block text-sm font-bold">
            비밀번호
            <input
              type="password"
              required
              className={FIELD}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
            />
          </label>
          {err && (
            <p role="alert" className="text-sm text-destructive">
              {err}
            </p>
          )}
          <button
            disabled={busy}
            className="w-full rounded-full bg-primary py-3 font-bold text-primary-foreground disabled:opacity-50"
          >
            {mode === "signup" ? "가입하고 4닢 받기" : "로그인"}
          </button>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            또는
            <span className="h-px flex-1 bg-border" />
          </div>
          <button
            type="button"
            className="w-full rounded-full border border-input bg-card py-3 font-bold"
            onClick={async () => {
              const r = await lovable.auth.signInWithOAuth("google", {
                redirect_uri: window.location.origin,
              });
              if (r.error) setErr("구글 로그인에 문제가 생겼어요. 다시 시도해 주세요.");
            }}
          >
            Google로 계속하기
          </button>
        </form>
      )}
    </Shell>
  );
}
