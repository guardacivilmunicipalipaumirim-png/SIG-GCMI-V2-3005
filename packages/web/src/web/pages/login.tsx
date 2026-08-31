import * as React from "react";
import { useLocation } from "wouter";
import { useLogin } from "@/queries/auth";

const AVISO =
  "Você está entrando em um sistema seguro da Guarda Municipal de Ipaumirim, que pode ser usado apenas para fins autorizados. Modificação de qualquer informação neste sistema está sujeita a processo criminal. O órgão monitora todo o uso deste sistema.";

function mensagem(erro: unknown): string {
  const bruto = String((erro as { message?: string })?.message ?? "");
  if (/UNAUTHORIZED|401|inválid/i.test(bruto)) return "Login ou senha inválidos.";
  if (/FORBIDDEN|bloquead/i.test(bruto)) return "Usuário sem acesso ao sistema.";
  return bruto || "Não foi possível entrar. Tente novamente.";
}

export default function LoginPage() {
  const [, navegar] = useLocation();
  const login = useLogin();
  const [dados, setDados] = React.useState({ login: "", senha: "" });

  const entrar = (evento: React.FormEvent) => {
    evento.preventDefault();
    if (!dados.login.trim() || !dados.senha) return;
    login.mutate(
      { login: dados.login.trim(), senha: dados.senha, origem: "web" },
      { onSuccess: () => navegar("/central/dashboard") },
    );
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4">
      {/* Fundo institucional */}
      <img
        src="/images/login-bg.png"
        alt=""
        aria-hidden
        className="pointer-events-none absolute inset-0 size-full object-cover opacity-[0.22]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_20%,rgba(11,16,32,0.55),rgba(3,5,12,0.96))]"
      />

      <main className="entrada relative z-10 flex w-full max-w-[640px] flex-col items-center">
        <img
          src="/images/brasao.png"
          alt="Brasão da Guarda Municipal de Ipaumirim"
          className="w-[132px] object-contain drop-shadow-[0_10px_30px_rgba(0,0,0,0.75)] sm:w-[150px]"
        />

        <h1 className="display mt-7 text-[34px] font-semibold tracking-[0.22em] text-foreground sm:text-[40px]">
          SIG-GCMI
        </h1>

        <form onSubmit={entrar} className="mt-8 flex w-full max-w-[440px] flex-col gap-3">
          <div className="flex items-center gap-4">
            <label
              htmlFor="campo-login"
              className="display w-[92px] shrink-0 text-right text-sm font-semibold uppercase tracking-[0.18em] text-foreground/90"
            >
              Login
            </label>
            <input
              id="campo-login"
              aria-label="Login"
              autoComplete="username"
              value={dados.login}
              onChange={(e) => setDados((d) => ({ ...d, login: e.target.value }))}
              className="h-8 flex-1 rounded-[3px] border border-white/25 bg-white px-2.5 text-sm text-[#0b1020] outline-none focus:border-gold focus:ring-2 focus:ring-gold/40"
            />
          </div>

          <div className="flex items-center gap-4">
            <label
              htmlFor="campo-senha"
              className="display w-[92px] shrink-0 text-right text-sm font-semibold uppercase tracking-[0.18em] text-foreground/90"
            >
              Senha
            </label>
            <input
              id="campo-senha"
              type="password"
              aria-label="Senha"
              autoComplete="current-password"
              value={dados.senha}
              onChange={(e) => setDados((d) => ({ ...d, senha: e.target.value }))}
              className="h-8 flex-1 rounded-[3px] border border-white/25 bg-white px-2.5 text-sm text-[#0b1020] outline-none focus:border-gold focus:ring-2 focus:ring-gold/40"
            />
          </div>

          <div className="flex items-center gap-4">
            <span className="w-[92px] shrink-0" aria-hidden />
            <button
              type="submit"
              disabled={login.isPending}
              className="mt-2 flex flex-1 items-center justify-center gap-2 rounded-[3px] border border-gold/50 bg-primary/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-foreground transition-colors hover:bg-primary-light disabled:opacity-60"
            >
              {login.isPending && (
                <span className="size-3.5 animate-spin rounded-full border-2 border-white/70 border-t-transparent" />
              )}
              {login.isPending ? "Autenticando…" : "Entrar"}
            </button>
          </div>

          {login.isError && (
            <p className="mt-1 text-center text-xs font-semibold uppercase tracking-wide text-danger">
              {mensagem(login.error)}
            </p>
          )}
        </form>
      </main>

      <footer className="absolute inset-x-0 bottom-6 z-10 px-6">
        <p className="mx-auto max-w-[760px] text-center text-[10px] font-semibold uppercase leading-relaxed tracking-[0.08em] text-muted-foreground/90">
          {AVISO}
        </p>
      </footer>
    </div>
  );
}
