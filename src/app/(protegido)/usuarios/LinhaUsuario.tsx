// Uma linha da lista da Gestão de usuários: leitura e, se o servidor marcou
// a linha como `editavel`, a edição de cadastro e o reset de senha dentro da
// própria linha (GU-22, GU-23, GU-31, GU-40, GU-45, GU-46).
//
// O botão "Editar" só aparece quando o servidor diz que pode (GU-21/22), mas
// isso é conveniência: `PATCH /api/usuarios` e `POST
// /api/usuarios/resetar-senha` reavaliam escopo e matriz a cada request
// (AD-033). O alvo vai sempre no corpo, nunca na URL (GU-48).
"use client";

import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { headerCSRF } from "@/lib/security/csrf-client";
import { NOME_TIPO_USUARIO } from "@/lib/ui/tipos-usuario";
import type { LinhaGestao } from "@/lib/usuarios/consulta";

const SENHA_RESETADA =
  "Senha resetada. No próximo acesso, o usuário entra com a senha em branco.";

export function LinhaUsuario({
  usuario,
  editando,
  aoEditar,
  aoFechar,
  aoSalvar,
}: {
  usuario: LinhaGestao;
  editando: boolean;
  aoEditar: () => void;
  aoFechar: () => void;
  /** Fecha a linha e recarrega a página atual da lista (GU-31). */
  aoSalvar: () => void;
}) {
  return (
    <li className="flex flex-col gap-3 rounded-lg border border-border px-3 py-2 text-sm">
      <div className="grid items-center gap-1 sm:grid-cols-[1fr_1fr_1fr_1fr_auto]">
        <span className="font-medium">{usuario.nome ?? "—"}</span>
        <span>{usuario.documento}</span>
        <span>{NOME_TIPO_USUARIO[usuario.tipo]}</span>
        <span className="text-muted-foreground">{usuario.email ?? "—"}</span>
        {usuario.editavel && !editando ? (
          <Button type="button" variant="outline" size="sm" onClick={aoEditar}>
            Editar
          </Button>
        ) : (
          <span />
        )}
      </div>
      {editando && <EdicaoUsuario usuario={usuario} aoFechar={aoFechar} aoSalvar={aoSalvar} />}
    </li>
  );
}

/**
 * Montado só enquanto a linha está aberta: os campos começam sempre com os
 * valores atuais do usuário (GU-23).
 */
function EdicaoUsuario({
  usuario,
  aoFechar,
  aoSalvar,
}: {
  usuario: LinhaGestao;
  aoFechar: () => void;
  aoSalvar: () => void;
}) {
  const id = useId();
  const [nome, setNome] = useState(usuario.nome ?? "");
  const [email, setEmail] = useState(usuario.email ?? "");
  const [documento, setDocumento] = useState(usuario.documento);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [confirmandoReset, setConfirmandoReset] = useState(false);
  const [enviando, setEnviando] = useState(false);

  // GU-40: CNPJ (14 dígitos) para GO, CPF (11) para os demais, como na criação.
  const ehGO = usuario.tipo === "GO";
  const tamanhoDocumento = ehGO ? 14 : 11;

  async function enviar(url: string, method: string, corpo: unknown): Promise<boolean> {
    setErro(null);
    setAviso(null);
    setEnviando(true);

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", ...headerCSRF() },
        body: JSON.stringify(corpo),
      });

      if (!res.ok) {
        // GU-31: o erro fica na linha, que segue aberta.
        const resposta = await res.json().catch(() => null);
        setErro(resposta?.erro ?? "Não foi possível salvar");
        return false;
      }

      return true;
    } catch {
      setErro("Não foi possível salvar");
      return false;
    } finally {
      setEnviando(false);
    }
  }

  async function salvar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // Só vai o que o gestor alterou. Reenviar um campo intocado faria a rota
    // validá-lo de novo: um usuário sem nome não teria o e-mail corrigido
    // ("Nome é obrigatório"), e o mesmo documento não é troca (GU-39).
    const alteracoes = {
      nome: nome !== (usuario.nome ?? "") ? nome : undefined,
      email: email !== (usuario.email ?? "") ? email : undefined,
      documentoNovo: documento !== usuario.documento ? documento : undefined,
    };

    if (Object.values(alteracoes).every((valor) => valor === undefined)) {
      aoFechar();
      return;
    }

    const ok = await enviar("/api/usuarios", "PATCH", {
      documentoAtual: usuario.documento,
      ...alteracoes,
    });

    if (ok) aoSalvar();
  }

  async function resetarSenha() {
    setConfirmandoReset(false);

    const ok = await enviar("/api/usuarios/resetar-senha", "POST", {
      documento: usuario.documento,
    });

    if (ok) setAviso(SENHA_RESETADA);
  }

  return (
    <form onSubmit={salvar} noValidate>
      <FieldGroup>
        <Field data-invalid={!!erro}>
          <FieldLabel htmlFor={`${id}-nome`}>Nome</FieldLabel>
          <Input
            id={`${id}-nome`}
            value={nome}
            onChange={(event) => setNome(event.target.value)}
            disabled={enviando}
          />
        </Field>
        <Field data-invalid={!!erro}>
          <FieldLabel htmlFor={`${id}-email`}>E-mail</FieldLabel>
          <Input
            id={`${id}-email`}
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={enviando}
          />
        </Field>
        <Field data-invalid={!!erro}>
          <FieldLabel htmlFor={`${id}-documento`}>{ehGO ? "CNPJ" : "CPF"}</FieldLabel>
          <Input
            id={`${id}-documento`}
            inputMode="numeric"
            maxLength={tamanhoDocumento}
            value={documento}
            onChange={(event) =>
              setDocumento(event.target.value.replace(/\D/g, "").slice(0, tamanhoDocumento))
            }
            disabled={enviando}
          />
        </Field>
        {erro && <FieldError>{erro}</FieldError>}
        {aviso && <p className="text-sm text-muted-foreground">{aviso}</p>}
        {confirmandoReset ? (
          // GU-45: nada é enviado antes da confirmação.
          <div className="flex flex-wrap items-center gap-2">
            <span>Resetar a senha deste usuário?</span>
            <Button type="button" variant="destructive" onClick={resetarSenha}>
              Confirmar reset
            </Button>
            <Button type="button" variant="outline" onClick={() => setConfirmandoReset(false)}>
              Cancelar
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={enviando}>
              Salvar
            </Button>
            <Button type="button" variant="outline" onClick={aoFechar} disabled={enviando}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => setConfirmandoReset(true)}
              disabled={enviando}
            >
              Resetar senha
            </Button>
          </div>
        )}
      </FieldGroup>
    </form>
  );
}
