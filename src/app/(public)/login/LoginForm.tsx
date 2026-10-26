// Formulário documento (CPF ou CNPJ) + senha (REQ-AU-01, REQ-AU-03,
// REQ-AU-04), colocado junto de `page.tsx`. Componente cliente separado
// porque `page.tsx` precisa continuar sendo um Server Component para chamar
// `connection()` e forçar renderização dinâmica - sem isso a página seria prerenderizada no build e o nonce do CSP
// não teria como ser injetado (ver comentário em `page.tsx`).
//
// A validação de schema aqui é só conveniência (AD-004): o servidor é a
// autoridade e reconfere o corpo em POST /api/auth/login antes de qualquer
// efeito.
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { loginSchema } from "@/lib/validation/schemas/login.schema";
import {
  aplicarMascaraDocumento,
  TAMANHO_MASCARA,
  tipoDocumentoDigitado,
} from "@/lib/validation/mascara-documento";

export function LoginForm() {
  const router = useRouter();
  // GO entra com CNPJ, os demais com CPF. O login não sabe o tipo antes de
  // entrar, então a máscara segue o que foi digitado (até 11 caracteres é
  // CPF, depois disso CNPJ); `loginSchema` tira a pontuação e decide
  // CPF/CNPJ pelo comprimento, como sempre.
  const [documento, setDocumento] = useState("");
  const [senha, setSenha] = useState("");
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

  return (
    <form onSubmit={handleSubmit} noValidate>
      <FieldGroup>
        <Field data-invalid={!!erro}>
          <FieldLabel htmlFor="cpf">CPF ou CNPJ</FieldLabel>
          <Input
            id="cpf"
            name="cpf"
            autoComplete="username"
            // Sem teclado numérico: o mesmo campo recebe o CNPJ alfanumérico.
            inputMode="text"
            autoCapitalize="characters"
            // O maior dos dois, senão o 12º caractere nem chegaria a ser
            // digitado para trocar a máscara.
            maxLength={TAMANHO_MASCARA.CNPJ}
            value={documento}
            onChange={(event) => handleDocumentoChange(event.target.value)}
            disabled={enviando}
          />
        </Field>
        <Field data-invalid={!!erro}>
          <FieldLabel htmlFor="senha">Senha</FieldLabel>
          <Input
            id="senha"
            name="senha"
            type="password"
            autoComplete="current-password"
            value={senha}
            onChange={(event) => setSenha(event.target.value)}
            disabled={enviando}
            aria-describedby="senha-dica"
          />
          {/* PASB-06: a senha em branco é o pedido de 1º acesso. */}
          <FieldDescription id="senha-dica">
            Primeiro acesso? Deixe a senha em branco.
          </FieldDescription>
        </Field>
        {erro && <FieldError>{erro}</FieldError>}
        <Button type="submit" disabled={enviando}>
          Entrar
        </Button>
      </FieldGroup>
    </form>
  );
}
