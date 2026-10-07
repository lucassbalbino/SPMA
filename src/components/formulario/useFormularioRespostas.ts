"use client";

// O estado e as duas ações ("Salvar rascunho", "Encerrar") que os três
// formulários de questionário repetiam palavra por palavra.
//
// As três cópias tinham os mesmos 7 `useState`, o mesmo `setCampo`, o mesmo
// `toggleCheckbox`, o mesmo `salvarRascunho` e o mesmo `encerrar` - só
// mudavam as URLs e o cálculo do que NÃO é aplicável. Centralizar importa por
// uma razão além do volume: `alterados` + o filtro de não-aplicáveis é o que
// decide o CORPO do PATCH, e um erro ali grava resposta de pergunta que não
// se aplica (ou perde a que se aplica) em silêncio, sem erro de servidor.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { headerCSRF } from "@/lib/security/csrf-client";
import type { StatusFormulario } from "@/generated/prisma/enums";
import type { CampoDef } from "./tipos";

export interface OpcoesFormularioRespostas<R> {
  status: StatusFormulario;
  respostasIniciais: R;
  podeEditar: boolean;
  /** Endpoint do PATCH de gravação parcial. */
  urlPatch: string;
  /** Endpoint do POST de encerramento. */
  urlEncerrar: string;
  /**
   * Chaves que, no estado atual, não se aplicam mais - condicionais órfãs e,
   * na avaliação, o bloco de "apenas para quem concluiu". Ficam FORA do
   * PATCH: o valor continua no estado local (caso a pessoa volte atrás), mas
   * não é gravado como resposta de uma pergunta que não se aplica. O que já
   * estava salvo no servidor só é descartado no encerramento.
   */
  naoAplicaveis?: (respostas: R) => Iterable<string>;
  /** Reage ao corpo devolvido pelo PATCH (a avaliação relê `parte1Completa`). */
  aoSalvar?: (corpo: Record<string, unknown>) => void;
}

export function useFormularioRespostas<C extends string, R extends Record<string, unknown>>({
  status,
  respostasIniciais,
  podeEditar,
  urlPatch,
  urlEncerrar,
  naoAplicaveis,
  aoSalvar,
}: OpcoesFormularioRespostas<R>) {
  const router = useRouter();

  const [respostas, setRespostas] = useState<R>(respostasIniciais);
  // Só as chaves tocadas desde o último "Salvar rascunho": é o que faz o
  // PATCH enviar apenas o bloco alterado, não o questionário inteiro.
  const [alterados, setAlterados] = useState<Set<C>>(new Set());
  const [erro, setErro] = useState<string | null>(null);
  const [pendentes, setPendentes] = useState<string[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [encerrando, setEncerrando] = useState(false);
  const [statusAtual, setStatusAtual] = useState<StatusFormulario>(status);

  const somenteLeitura = !podeEditar || statusAtual === "ENCERRADO";
  const desabilitado = somenteLeitura || salvando || encerrando;

  function setCampo(chave: C, valor: unknown) {
    setRespostas((atual) => ({ ...atual, [chave]: valor }));
    setAlterados((atual) => new Set(atual).add(chave));
  }

  /**
   * Espelha, na tela, a regra que `multiplaComExclusiva` aplica no servidor:
   * marcar a opção excludente limpa as demais, e marcar qualquer outra
   * desmarca a excludente. Sem `exclusiva` declarada, o filtro não casa com
   * nada e o comportamento é o de uma lista comum.
   */
  function toggleCheckbox(campo: CampoDef<C, R>, opcao: string, marcado: boolean) {
    const atuais = (respostas[campo.chave] as string[] | undefined) ?? [];

    let novos: string[];
    if (!marcado) {
      novos = atuais.filter((item) => item !== opcao);
    } else if (campo.exclusiva !== undefined && opcao === campo.exclusiva) {
      novos = [opcao];
    } else {
      novos = [...atuais.filter((item) => item !== campo.exclusiva), opcao];
    }

    setCampo(campo.chave, novos);
  }

  async function salvarRascunho() {
    setErro(null);
    setSalvando(true);
    try {
      const excluidas = new Set<string>(naoAplicaveis?.(respostas) ?? []);
      const corpo = Object.fromEntries(
        [...alterados]
          .filter((chave) => !excluidas.has(chave))
          .map((chave) => [chave, respostas[chave]]),
      );

      const res = await fetch(urlPatch, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...headerCSRF() },
        body: JSON.stringify(corpo),
      });
      const resposta = await res.json();

      if (!res.ok) {
        setErro(resposta.erro ?? "Não foi possível salvar");
        return;
      }

      aoSalvar?.(resposta);
      setAlterados(new Set());
      router.refresh();
    } finally {
      setSalvando(false);
    }
  }

  async function encerrar() {
    setErro(null);
    setPendentes([]);
    setEncerrando(true);
    try {
      const res = await fetch(urlEncerrar, { method: "POST", headers: { ...headerCSRF() } });
      const resposta = await res.json();

      if (!res.ok) {
        setErro(resposta.erro ?? "Não foi possível encerrar");
        setPendentes(resposta.pendentes ?? []);
        return;
      }

      setStatusAtual("ENCERRADO");
      router.refresh();
    } finally {
      setEncerrando(false);
    }
  }

  return {
    respostas,
    erro,
    pendentes,
    salvando,
    encerrando,
    statusAtual,
    somenteLeitura,
    desabilitado,
    setCampo,
    toggleCheckbox,
    salvarRascunho,
    encerrar,
  };
}
