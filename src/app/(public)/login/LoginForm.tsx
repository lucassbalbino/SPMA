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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { loginSchema } from "@/lib/validation/schemas/login.schema";
import { normalizarDocumento, type TipoDocumento } from "@/lib/validation/documento";
import { aplicarMascaraDocumento, TAMANHO_MASCARA } from "@/lib/validation/mascara-documento";

export function LoginForm() {
  const router = useRouter();
  // GO entra com CNPJ, os demais com CPF. O login não sabe o tipo antes de
  // entrar, então quem digita escolhe a máscara; `loginSchema` tira a
  // pontuação e decide CPF/CNPJ pelo comprimento, como sempre.
  const [tipoDocumento, setTipoDocumento] = useState<TipoDocumento>("CPF");
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

  // Um CNPJ que chega inteiro com a máscara de CPF (o autopreenchimento do
  // navegador guarda os 14 caracteres crus de antes da máscara) troca
  // sozinho para CNPJ, em vez de ser cortado em 11.
  function handleDocumentoChange(valor: string) {
    const tipo =
      tipoDocumento === "CPF" && normalizarDocumento(valor).length > 11 ? "CNPJ" : tipoDocumento;
    setTipoDocumento(tipo);
    setDocumento(aplicarMascaraDocumento(tipo, valor));
  }

  function alternarTipoDocumento(usarCnpj: boolean) {
    const novoTipo = usarCnpj ? "CNPJ" : "CPF";
    setTipoDocumento(novoTipo);
    setDocumento((atual) => aplicarMascaraDocumento(novoTipo, atual));
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <FieldGroup>
        <Field data-invalid={!!erro}>
          <FieldLabel htmlFor="cpf">{tipoDocumento}</FieldLabel>
          <Input
            id="cpf"
            name="cpf"
            autoComplete="username"
            // CNPJ alfanumérico tem letras: teclado numérico só no CPF.
            inputMode={tipoDocumento === "CPF" ? "numeric" : "text"}
            autoCapitalize="characters"
            maxLength={TAMANHO_MASCARA[tipoDocumento]}
            value={documento}
            onChange={(event) => handleDocumentoChange(event.target.value)}
            disabled={enviando}
          />
          {/* `Label`, não `FieldLabel`: este pinta um fundo quando o controle
              dentro dele está ligado, e o switch viraria uma caixa. */}
          <Label htmlFor="usar-cnpj" className="w-fit font-normal">
            <Switch
              id="usar-cnpj"
              checked={tipoDocumento === "CNPJ"}
              onCheckedChange={alternarTipoDocumento}
              disabled={enviando}
            />
            Entrar com CNPJ
          </Label>
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
