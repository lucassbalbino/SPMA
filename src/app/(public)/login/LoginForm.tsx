// Formulário documento (CPF ou CNPJ) + senha (REQ-AU-01, REQ-AU-03,
// REQ-AU-04), colocado junto de `page.tsx`. Componente cliente separado
// porque `page.tsx` precisa continuar sendo um Server Component para chamar
// `connection()` e forçar renderização dinâmica - sem isso a página seria prerenderizada no build e o nonce do CSP
// não teria como ser injetado (ver comentário em `page.tsx`).
//
// Visual da tela de referência do design system SPMA (docs/design-system.md):
// rótulo acima, campo de 52px com ícone à esquerda, olho para mostrar a
// senha e o botão "Entrar" de 64px com a seta. A referência pede perfil e
// e-mail; o SPMA entra com CPF ou CNPJ e descobre o perfil sozinho, então o
// primeiro campo é o documento. "Lembrar-me" e "Esqueci minha senha" ficam de
// fora até existirem no backend; no lugar deles vai a dica do 1º acesso.
//
// A validação de schema aqui é só conveniência (AD-004): o servidor é a
// autoridade e reconfere o corpo em POST /api/auth/login antes de qualquer
// efeito.
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, IdCard, Lock } from "lucide-react";
import { FieldError } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { loginSchema } from "@/lib/validation/schemas/login.schema";
import {
  aplicarMascaraDocumento,
  TAMANHO_MASCARA,
  tipoDocumentoDigitado,
} from "@/lib/validation/mascara-documento";

const CLASSE_CAIXA =
  "flex h-(--spma-control-height) items-center gap-3 rounded-md border border-spma-border bg-spma-surface px-4 text-spma-ink-800 transition-shadow focus-within:border-spma-primary-600 focus-within:shadow-spma-focus has-disabled:opacity-60";
const CLASSE_CAIXA_INVALIDA = "border-destructive";
const CLASSE_CAMPO =
  "min-w-0 flex-1 bg-transparent text-spma-body-lg text-spma-ink-900 outline-none placeholder:text-spma-ink-600 disabled:cursor-not-allowed";
const CLASSE_ROTULO = "text-spma-label text-spma-ink-900";

export function LoginForm() {
  const router = useRouter();
  // GO entra com CNPJ, os demais com CPF. O login não sabe o tipo antes de
  // entrar, então a máscara segue o que foi digitado (até 11 caracteres é
  // CPF, depois disso CNPJ); `loginSchema` tira a pontuação e decide
  // CPF/CNPJ pelo comprimento, como sempre.
  const [documento, setDocumento] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro(null);

    const entrada = loginSchema.safeParse({ documento, senha });
    if (!entrada.success) {
      setErro(entrada.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }

    setEnviando(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entrada.data),
      });
      const corpo = await res.json();

      if (!res.ok) {
        setErro(corpo.erro ?? "Não foi possível entrar");
        return;
      }

      router.push(corpo.proximaRota ?? "/painel");
    } finally {
      setEnviando(false);
    }
  }

  // A máscara é escolhida pelos caracteres sem pontuação, não pelo texto já
  // mascarado: o 12º dígito digitado depois de um CPF completo troca para
  // CNPJ, e apagar até 11 volta para CPF.
  function handleDocumentoChange(valor: string) {
    setDocumento(aplicarMascaraDocumento(tipoDocumentoDigitado(valor), valor));
  }

  const IconeOlho = mostrarSenha ? EyeOff : Eye;

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col">
      <div className="flex flex-col gap-9">
        <div className="flex flex-col gap-3">
          <label htmlFor="cpf" className={CLASSE_ROTULO}>
            CPF ou CNPJ
          </label>
          <div className={cn(CLASSE_CAIXA, erro && CLASSE_CAIXA_INVALIDA)}>
            <IdCard aria-hidden="true" strokeWidth={1.75} className="size-[22px] shrink-0" />
            <input
              id="cpf"
              name="cpf"
              autoComplete="username"
              // Sem teclado numérico: o mesmo campo recebe o CNPJ alfanumérico.
              inputMode="text"
              autoCapitalize="characters"
              // O maior dos dois, senão o 12º caractere nem chegaria a ser
              // digitado para trocar a máscara.
              maxLength={TAMANHO_MASCARA.CNPJ}
              placeholder="Digite seu CPF ou CNPJ"
              value={documento}
              onChange={(event) => handleDocumentoChange(event.target.value)}
              disabled={enviando}
              aria-invalid={!!erro}
              className={CLASSE_CAMPO}
            />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <label htmlFor="senha" className={CLASSE_ROTULO}>
            Senha
          </label>
          <div className={cn(CLASSE_CAIXA, erro && CLASSE_CAIXA_INVALIDA)}>
            <Lock aria-hidden="true" strokeWidth={1.75} className="size-[22px] shrink-0" />
            <input
              id="senha"
              name="senha"
              type={mostrarSenha ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Digite sua senha"
              value={senha}
              onChange={(event) => setSenha(event.target.value)}
              disabled={enviando}
              aria-invalid={!!erro}
              aria-describedby="senha-dica"
              className={CLASSE_CAMPO}
            />
            {/* O nome acessível vem do texto (sr-only), não de aria-label:
                um aria-label "Mostrar senha" também casaria com
                getByLabel("Senha") e tornaria o campo ambíguo. */}
            <button
              type="button"
              onClick={() => setMostrarSenha((valor) => !valor)}
              aria-pressed={mostrarSenha}
              className="inline-flex shrink-0 rounded-sm text-spma-ink-800 focus-visible:shadow-spma-focus focus-visible:outline-none"
            >
              <IconeOlho aria-hidden="true" strokeWidth={1.75} className="size-[22px]" />
              <span className="sr-only">Mostrar a senha digitada</span>
            </button>
          </div>
        </div>
      </div>

      {/* PASB-06: a senha em branco é o pedido de 1º acesso. */}
      <p id="senha-dica" className="mt-6 text-spma-body-md text-spma-ink-600">
        Primeiro acesso? Deixe a senha em branco.
      </p>

      {erro && <FieldError className="mt-3 text-spma-body-md">{erro}</FieldError>}

      <button
        type="submit"
        disabled={enviando}
        className="relative mt-9 flex h-(--spma-button-height-lg) w-full items-center justify-center rounded-md bg-spma-primary-700 text-spma-button text-spma-ink-0 transition-colors hover:bg-spma-primary-800 focus-visible:shadow-spma-focus focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-spma-divider disabled:text-spma-ink-500"
      >
        Entrar
        <ArrowRight
          aria-hidden="true"
          strokeWidth={1.75}
          className="absolute right-8 size-[22px]"
        />
      </button>
    </form>
  );
}
