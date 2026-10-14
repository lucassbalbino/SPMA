// Gestão de usuários (cliente): o formulário de criação acima da lista
// escopada e paginada (GU-03, GU-07..GU-15).
//
// A página 1 chega pronta do servidor (`page.tsx` chama a mesma
// `consultarUsuarios` da API), sem "piscar" vazia. Daí em diante, chips,
// busca e paginação pedem a página por `POST /api/usuarios/consulta`, com
// tudo no corpo: a busca pode ser um CPF, então nada vai para a URL
// (GU-48/GU-49), e recarregar a página volta à página 1 sem filtro.
//
// O escopo e o `editavel` de cada linha vêm do servidor; esta tela só exibe.
"use client";

import { useEffect, useRef, useState, type ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { headerCSRF } from "@/lib/security/csrf-client";
import { NOME_TIPO_USUARIO } from "@/lib/ui/tipos-usuario";
import type { PaginaUsuarios } from "@/lib/usuarios/consulta";
import type { TipoUsuario } from "@/generated/prisma/enums";
import { COLUNAS_USUARIO, LinhaUsuario } from "./LinhaUsuario";
import { NovoUsuarioForm } from "./NovoUsuarioForm";

type Filtro = { pagina: number; tipo?: TipoUsuario; busca: string };

// A busca espera o usuário parar de digitar antes de ir ao servidor.
const ESPERA_BUSCA_MS = 300;

export function GestaoUsuarios({
  formulario,
  paginaInicial,
  tipos,
}: {
  formulario: Omit<ComponentProps<typeof NovoUsuarioForm>, "aoCriar">;
  /** `null` para VT, VO e AL: sem lista (GU-06). */
  paginaInicial: PaginaUsuarios | null;
  /** Os chips além de "Todos" (GU-09), já filtrados pelo perfil. */
  tipos: TipoUsuario[];
}) {
  const [filtro, setFiltro] = useState<Filtro>({ pagina: 1, busca: "" });
  const [textoBusca, setTextoBusca] = useState("");
  const [resultado, setResultado] = useState(paginaInicial);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  // Uma linha aberta para edição por vez.
  const [editando, setEditando] = useState<string | null>(null);
  // Só a resposta do pedido mais recente vale: uma resposta lenta de um
  // filtro antigo não pode sobrescrever a de um filtro mais novo.
  const ultimoPedido = useRef(0);

  async function consultar(novo: Filtro) {
    setFiltro(novo);
    const pedido = ++ultimoPedido.current;
    setCarregando(true);
    setErro(null);

    try {
      const res = await fetch("/api/usuarios/consulta", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headerCSRF() },
        body: JSON.stringify({
          pagina: novo.pagina,
          tipo: novo.tipo,
          busca: novo.busca || undefined,
        }),
      });

      if (pedido !== ultimoPedido.current) return;

      if (!res.ok) {
        // A lista anterior continua visível (design.md, tratamento de erro).
        setErro("Não foi possível carregar os usuários");
        return;
      }

      setResultado(await res.json());
    } catch {
      if (pedido === ultimoPedido.current) {
        setErro("Não foi possível carregar os usuários");
      }
    } finally {
      if (pedido === ultimoPedido.current) {
        setCarregando(false);
      }
    }
  }

  /** Recarrega a página atual com os filtros atuais (GU-08). */
  function recarregar() {
    void consultar(filtro);
  }

  // GU-11/GU-15: a busca volta à página 1, depois de uma pausa na digitação.
  useEffect(() => {
    const busca = textoBusca.trim();
    if (busca === filtro.busca) return;

    const espera = setTimeout(() => {
      void consultar({ ...filtro, pagina: 1, busca });
    }, ESPERA_BUSCA_MS);

    return () => clearTimeout(espera);
    // `filtro` fica de fora de propósito: só a digitação dispara a busca.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [textoBusca]);

  return (
    <div className="flex w-full flex-col gap-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Novo usuário</CardTitle>
        </CardHeader>
        <CardContent>
          <NovoUsuarioForm
            {...formulario}
            aoCriar={resultado ? recarregar : undefined}
          />
        </CardContent>
      </Card>

      {resultado && (
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Usuários</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div
              role="group"
              aria-label="Filtrar por tipo"
              className="flex flex-wrap gap-2"
            >
              {[undefined, ...tipos].map((tipo) => {
                const selecionado = filtro.tipo === tipo;
                return (
                  <Button
                    key={tipo ?? "TODOS"}
                    type="button"
                    size="sm"
                    variant={selecionado ? "default" : "outline"}
                    aria-pressed={selecionado}
                    // GU-10/GU-15: trocar o chip volta à página 1.
                    onClick={() =>
                      void consultar({ ...filtro, pagina: 1, tipo })
                    }
                  >
                    {tipo ? NOME_TIPO_USUARIO[tipo] : "Todos"}
                  </Button>
                );
              })}
            </div>

            <Input
              type="search"
              aria-label="Buscar usuários"
              placeholder="Nome ou documento"
              maxLength={100}
              value={textoBusca}
              onChange={(event) => setTextoBusca(event.target.value)}
            />

            {erro && <p className="text-sm text-destructive">{erro}</p>}

            {resultado.usuarios.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum usuário encontrado.
              </p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-border text-sm">
                {/* Cabeçalho só visual: em tela estreita some, e cada célula
                    traz o próprio rótulo (lido pelo leitor de tela). */}
                <div
                  aria-hidden="true"
                  className={`hidden gap-3 border-b border-border bg-muted px-3 py-2 text-xs font-medium text-muted-foreground sm:grid ${COLUNAS_USUARIO}`}
                >
                  <span>Nome</span>
                  <span>Documento</span>
                  <span>Tipo</span>
                  <span>E-mail</span>
                  <span />
                </div>
                <ul
                  data-testid="lista-usuarios"
                  aria-busy={carregando}
                  className="divide-y divide-border"
                >
                  {resultado.usuarios.map((usuario) => (
                    <LinhaUsuario
                      key={usuario.documento}
                      usuario={usuario}
                      editando={editando === usuario.documento}
                      aoEditar={() => setEditando(usuario.documento)}
                      aoFechar={() => setEditando(null)}
                      aoSalvar={() => {
                        setEditando(null);
                        recarregar();
                      }}
                    />
                  ))}
                </ul>
              </div>
            )}

            {/* GU-14: "Anterior" desabilita na página 1 e "Próxima" na última. */}
            <div className="flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={carregando || resultado.pagina <= 1}
                onClick={() =>
                  void consultar({ ...filtro, pagina: resultado.pagina - 1 })
                }
              >
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground">
                Página {resultado.pagina} de {resultado.totalPaginas}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={
                  carregando || resultado.pagina >= resultado.totalPaginas
                }
                onClick={() =>
                  void consultar({ ...filtro, pagina: resultado.pagina + 1 })
                }
              >
                Próxima
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
