// /login (REQ-AU-01, REQ-AU-03, REQ-AU-04).
//
// `connection()` obriga a renderização dinâmica desta rota. Sem ela o Next
// prerenderiza /login no build e o CSP por nonce (REQ-SEC-16, emitido em
// `src/proxy.ts`) quebra em produção: o nonce é gerado por requisição, mas o
// HTML estático foi gerado quando não existia requisição nenhuma, então os
// scripts do Next saem sem o atributo e o navegador os bloqueia. É a regra
// que a doc do Next enuncia em
// node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md:
// "To use a nonce, your page must be dynamically rendered."
//
// Em `next dev` toda rota já é dinâmica - por isso a falha só aparecia no
// ambiente publicado.
//
// Layout da tela de referência do design system SPMA (docs/design-system.md):
// à esquerda a marca, o nome do sistema, a PNQT, a descrição, a colagem em
// losangos e a faixa de parceiros; à direita o cartão de acesso, com o aviso
// de veracidade, e os links legais abaixo dele. As fotos dos losangos, os
// logotipos do Ministério do Turismo, do Governo Federal e da empresa
// desenvolvedora e as páginas legais ainda não existem: entram como espaço
// reservado e texto, até chegarem.
//
// Nada de `style=` aqui: a CSP bloqueia atributo style (posições e tamanhos
// vão em classe).
import { connection } from "next/server";
import { Headset, ImageIcon, ShieldCheck, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { LoginForm } from "./LoginForm";

/** Espaço reservado tracejado para um logotipo que ainda não chegou. */
function SeloReservado({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-sm border border-dashed border-spma-border px-3 text-center text-[10px] leading-[14px] font-bold tracking-[1.2px] text-spma-ink-600 uppercase ${className ?? ""}`}
    >
      {children}
    </span>
  );
}

/** Um losango da colagem: espaço reservado para a foto. */
function Losango({ className }: { className: string }) {
  return (
    <span
      className={`absolute flex size-[198px] rotate-45 items-center justify-center rounded-[18px] ${className}`}
    >
      <ImageIcon aria-hidden="true" strokeWidth={1.5} className="size-9 -rotate-45 text-spma-primary-300" />
    </span>
  );
}

export default async function LoginPage() {
  await connection();

  return (
    <div className="relative isolate flex min-h-screen flex-col overflow-hidden bg-spma-background lg:grid lg:grid-cols-[minmax(0,53fr)_minmax(0,47fr)] lg:grid-rows-[1fr_auto]">
      {/* Círculo decorativo atrás do topo do cartão. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-[90px] left-[40%] -z-10 hidden size-[300px] rounded-full bg-spma-divider lg:block"
      />

      {/* Marca e apresentação */}
      <section className="relative px-6 pt-10 pb-8 sm:px-10 lg:col-start-1 lg:row-start-1 lg:min-h-[880px] lg:px-[60px] lg:pt-[70px] lg:pb-0">
        <p className="text-[56px] leading-none font-bold tracking-[-1px] text-spma-primary-700 sm:text-spma-brand-xl">
          SPMA
        </p>
        {/* Quebras da referência a partir de lg; abaixo disso o texto corre. */}
        <p className="mt-4 max-w-[640px] text-spma-heading-md text-spma-ink-900 sm:text-spma-heading-xl">
          Sistema Nacional de Planejamento, <br className="max-lg:hidden" />
          Monitoramento e Avaliação <br className="max-lg:hidden" />
          da Qualificação Profissional no Turismo
        </p>
        <p className="mt-9 text-[18px] leading-6 text-spma-ink-600">De acordo com a</p>
        <p className="mt-1 max-w-[400px] font-heading text-[22px] leading-[29px] font-semibold text-spma-primary-700">
          Política Nacional de Qualificação no Turismo (PNQT)
        </p>
        <span aria-hidden="true" className="mt-6 block h-[3px] w-[70px] rounded-full bg-spma-primary-700" />
        <p className="mt-8 max-w-[270px] text-spma-body-md text-spma-ink-900">
          Uma plataforma integrada para planejar, monitorar e avaliar ações de qualificação
          profissional no turismo em todo o Brasil.
        </p>

        {/* Pontilhado decorativo à esquerda da colagem. */}
        <span aria-hidden="true" className="spma-pontilhado absolute top-[600px] left-0 hidden h-40 w-[136px] lg:block" />

        {/* Colagem de fotos em losango (espaço reservado). */}
        <div aria-hidden="true" className="absolute right-0 bottom-0 hidden h-[560px] w-[560px] overflow-hidden lg:block">
          <Losango className="top-[51px] left-[191px] bg-spma-primary-100" />
          <Losango className="top-[201px] left-[49px] bg-spma-primary-50" />
          <Losango className="top-[206px] left-[337px] bg-spma-primary-50" />
          <Losango className="top-[341px] left-[199px] bg-spma-primary-100" />
        </div>
      </section>

      {/* Acesso */}
      <main className="flex flex-col items-center px-4 pb-10 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:items-start lg:pt-[55px] lg:pr-14 lg:pb-8">
        <Card className="w-full max-w-[670px] gap-0 border border-spma-divider py-0 shadow-spma-card ring-0">
          <CardContent className="px-6 py-10 sm:px-14 sm:pt-[84px] sm:pb-11">
            <div className="mb-12 flex items-center gap-5">
              <span className="inline-flex size-[68px] shrink-0 items-center justify-center rounded-full border-2 border-spma-primary-700 text-spma-primary-700">
                <User aria-hidden="true" strokeWidth={1.5} className="size-[38px]" />
              </span>
              <div>
                <h1 className="text-spma-heading-lg text-spma-ink-900">Acesso ao sistema</h1>
                <p className="mt-1 text-[15px] leading-[22px] text-spma-ink-600">
                  Informe suas credenciais para acessar o SPMA
                </p>
              </div>
            </div>

            <LoginForm />

            <aside className="mt-10 flex gap-6 rounded-lg bg-spma-primary-100 p-6">
              <ShieldCheck aria-hidden="true" strokeWidth={1.5} className="size-9 shrink-0 text-spma-primary-700" />
              <div>
                <p className="text-[15px] leading-5 font-bold text-spma-ink-900">
                  Compromisso com a veracidade das informações
                </p>
                <p className="mt-1 text-spma-body-md text-spma-ink-900">
                  Ao utilizar este sistema, você declara que as informações fornecidas são
                  verdadeiras e de sua responsabilidade.
                </p>
              </div>
            </aside>
          </CardContent>
        </Card>

        {/* Links legais: as páginas ainda não existem, então são texto. */}
        <div className="mt-10 flex w-full max-w-[670px] flex-wrap items-center justify-around gap-4 text-spma-body-md text-spma-ink-600">
          <span>Política de Privacidade</span>
          <span aria-hidden="true" className="h-5 w-px bg-spma-border max-sm:hidden" />
          <span>Termos de Uso</span>
          <span aria-hidden="true" className="h-5 w-px bg-spma-border max-sm:hidden" />
          <span className="inline-flex items-center gap-2">
            <Headset aria-hidden="true" strokeWidth={1.75} className="size-5" />
            Suporte
          </span>
        </div>
      </main>

      {/* Parceiros */}
      <footer className="order-last flex flex-wrap items-center gap-x-6 gap-y-4 bg-spma-surface px-6 py-8 sm:px-[52px] lg:order-none lg:col-start-1 lg:row-start-2 lg:h-36 lg:flex-nowrap lg:py-0">
        <div className="flex items-center gap-4">
          <span className="text-spma-caption text-spma-ink-900">Realização:</span>
          <span className="flex items-center gap-2">
            {/* <img> simples: o next/image grava style= e a CSP bloqueia. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/unb-simbolo.png" alt="" width={65} height={32} />
            <span className="font-heading text-[24px] leading-none font-bold text-spma-unb-blue">UnB</span>
          </span>
        </div>
        <span aria-hidden="true" className="hidden h-14 w-px bg-spma-divider sm:block" />
        <div className="flex items-center gap-4">
          <span className="text-spma-caption text-spma-ink-900">Apoio:</span>
          <SeloReservado className="h-14 w-[250px]">
            Ministério do Turismo
            <br />+ Logo Governo Federal
          </SeloReservado>
        </div>
        <span aria-hidden="true" className="hidden h-14 w-px bg-spma-divider sm:block" />
        <div className="flex flex-col gap-1.5">
          <span className="text-spma-caption text-spma-ink-900">Desenvolvido por:</span>
          <SeloReservado className="h-9 w-[112px]">
            Nome da
            <br />
            Empresa
          </SeloReservado>
        </div>
      </footer>
    </div>
  );
}
