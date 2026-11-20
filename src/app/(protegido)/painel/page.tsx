// /painel (REQ-AU-10) - a home do SPMA depois do login.
//
// Landing pós-login/pós-gates no design system SPMA (docs/design-system.md):
// saudação com o perfil por extenso (RU-34), os módulos que o perfil está
// apto a realizar e o compromisso com a veracidade das informações. Os
// módulos saem de `MODULOS_POR_PERFIL` (fonte única, AD-039) - sem lista
// própria e sem lógica de negócio aqui. Esconder um módulo é só UI: os guards
// do backend seguem valendo.
//
// Os textos de `painel-perfil`, `painel-apto` e de cada item de
// `painel-modulos` são lidos literalmente por e2e/painel.spec.ts: o cartão do
// módulo não leva nenhum outro texto além do rótulo.
import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { requireSession } from "@/lib/auth/guards";
import { MODULOS_POR_PERFIL } from "@/lib/ui/navegacao";
import { NOME_TIPO_USUARIO } from "@/lib/ui/tipos-usuario";
import { destinoDoModulo, iconeDoModulo } from "@/components/layout/icones-navegacao";

const DATA_POR_EXTENSO = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "full",
  timeZone: "America/Sao_Paulo",
});

export default async function PainelPage() {
  const { usuario } = await requireSession();
  const modulos = MODULOS_POR_PERFIL[usuario.tipo];
  const hoje = DATA_POR_EXTENSO.format(new Date());

  return (
    <div className="flex flex-col gap-8">
      {/* Boas-vindas */}
      <section
        aria-labelledby="painel-saudacao"
        className="relative isolate overflow-hidden rounded-xl bg-spma-primary-700 px-6 py-8 sm:px-10 sm:py-10"
      >
        {/* Losangos: o recorte das fotos da tela de login, motivo da marca. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 -z-10 hidden w-80 md:block">
          <span className="absolute -top-10 right-24 size-36 rotate-45 rounded-lg bg-spma-primary-800" />
          <span className="absolute top-16 right-4 size-24 rotate-45 rounded-lg bg-spma-primary-600" />
          <span className="absolute -bottom-12 right-40 size-28 rotate-45 rounded-lg bg-spma-primary-900" />
          <span className="absolute bottom-8 right-28 size-8 rotate-45 rounded-sm bg-spma-primary-100" />
        </div>

        <p className="text-spma-overline uppercase text-spma-primary-100">Painel geral · {hoje}</p>
        <h1 id="painel-saudacao" className="mt-3 text-spma-heading-xl text-spma-ink-0">
          Olá, {usuario.nome}
        </h1>
        {/* RU-34 (doc 1): o perfil por extenso, não a sigla. */}
        <p className="mt-2 text-spma-body-lg text-spma-primary-100" data-testid="painel-perfil">
          Você está no perfil de{" "}
          <strong className="font-bold text-spma-ink-0">{NOME_TIPO_USUARIO[usuario.tipo]}</strong>
        </p>
      </section>

      {/* Módulos do perfil */}
      <section aria-labelledby="painel-apto" className="flex flex-col gap-4">
        <h2 id="painel-apto" className="text-spma-heading-sm text-spma-ink-900" data-testid="painel-apto">
          Portanto, está apto a realizar:
        </h2>
        <ul data-testid="painel-modulos" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {modulos.map((modulo) => {
            const Icone = iconeDoModulo(modulo);
            const destino = destinoDoModulo(modulo);

            const conteudo = (
              <>
                <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg bg-spma-primary-100 text-spma-primary-700 group-data-[sem-tela=true]/modulo:bg-spma-background group-data-[sem-tela=true]/modulo:text-spma-ink-500">
                  <Icone aria-hidden="true" strokeWidth={1.75} className="size-[22px]" />
                </span>
                <span className="flex-1 text-spma-label text-spma-ink-900 group-data-[sem-tela=true]/modulo:text-spma-ink-600">
                  {modulo.rotulo}
                </span>
                {destino && (
                  <ArrowRight
                    aria-hidden="true"
                    strokeWidth={1.75}
                    className="size-5 shrink-0 text-spma-primary-700 transition-transform group-hover/modulo:translate-x-1"
                  />
                )}
              </>
            );

            return (
              <li key={modulo.rotulo}>
                {destino ? (
                  <Link
                    href={destino.href}
                    className="group/modulo flex h-full items-center gap-4 rounded-lg border border-border bg-spma-surface p-5 transition-colors hover:border-spma-primary-600 hover:bg-spma-primary-50 focus-visible:shadow-spma-focus focus-visible:outline-none"
                  >
                    {conteudo}
                  </Link>
                ) : (
                  // Módulo listado pelo cliente que ainda não tem tela: aparece,
                  // mas não vira link (ver navegacao.ts).
                  <div
                    data-sem-tela="true"
                    title="Disponível em breve"
                    className="group/modulo flex h-full items-center gap-4 rounded-lg border border-dashed border-spma-border bg-spma-surface p-5"
                  >
                    {conteudo}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {/* Compromisso com a veracidade (identidade da tela de login). */}
      <aside className="flex gap-4 rounded-lg bg-spma-primary-100 p-6 sm:gap-6">
        <ShieldCheck aria-hidden="true" strokeWidth={1.5} className="size-9 shrink-0 text-spma-primary-700" />
        <div>
          <p className="text-spma-label-sm text-spma-ink-900">Compromisso com a veracidade das informações</p>
          <p className="mt-1 text-spma-body-md text-spma-ink-900">
            Ao utilizar este sistema, você declara que as informações fornecidas são verdadeiras e de
            sua responsabilidade.
          </p>
        </div>
      </aside>
    </div>
  );
}
