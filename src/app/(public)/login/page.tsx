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
// de veracidade, e os links legais abaixo dele. As fotos dos losangos e as
// páginas legais ainda não existem: entram como espaço reservado e texto, até
// chegarem.
//
// Nada de `style=` aqui: a CSP bloqueia atributo style (posições e tamanhos
// vão em classe).
import { connection } from "next/server";
import { Headset, ImageIcon, ShieldCheck, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { LoginForm } from "./LoginForm";


/** Grupo da faixa de parceiros: rótulo ao lado do logo, ou acima entre lg e xl. */
const GRUPO_PARCEIRO =
  "flex shrink-0 items-center gap-4 lg:max-xl:flex-col lg:max-xl:items-start lg:max-xl:gap-1.5";
const DIVISOR_PARCEIRO = "hidden h-14 w-px shrink-0 bg-spma-divider sm:block lg:max-xl:h-11";

/**
 * Um losango da colagem: espaço reservado para a foto. Tamanho, posição e
 * raio em % da colagem (198px, 18px e as posições sobre 560px na
 * referência), para a composição encolher inteira junto com a janela.
 */
function Losango({ className }: { className: string }) {
  return (
    <span
      className={`absolute flex size-[35.36%] rotate-45 items-center justify-center rounded-[9%] ${className}`}
    >
      <ImageIcon aria-hidden="true" strokeWidth={1.5} className="size-9 -rotate-45 text-spma-primary-300" />
    </span>
  );
}

export default async function LoginPage() {
  await connection();

  // A partir de `lg` a tela ocupa exatamente a janela (h-dvh), sem rolagem: as
  // medidas verticais são `clamp(piso, N svh, valor da referência)`, então
  // numa janela de ~950px úteis (1920x1080) tudo fica como na print e numa
  // de ~640px (notebook 1366x768) encolhe até caber (docs/design-system.md,
  // "Caber na tela"). No celular a tela rola normalmente.
  return (
    <div className="relative isolate flex min-h-dvh flex-col overflow-hidden bg-spma-background lg:grid lg:h-dvh lg:min-h-0 lg:grid-cols-[minmax(0,53fr)_minmax(0,47fr)] lg:grid-rows-[minmax(0,1fr)_auto]">
      {/* Círculo decorativo atrás do topo do cartão. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-[90px] left-[40%] -z-10 hidden size-[300px] rounded-full bg-spma-divider lg:block"
      />

      {/* Marca e apresentação */}
      <section className="relative px-6 pt-10 pb-8 sm:px-10 lg:col-start-1 lg:row-start-1 lg:min-h-0 lg:px-[60px] lg:pt-[clamp(20px,6.5svh,70px)] lg:pb-0">
        <p className="text-[56px] leading-none font-bold tracking-[-1px] text-spma-primary-700 sm:text-spma-brand-xl lg:text-[clamp(44px,7.6svh,72px)]">
          SPMA
        </p>
        {/* Quebras da referência a partir de lg; abaixo disso o texto corre. */}
        <p className="mt-4 max-w-[640px] text-spma-heading-md text-spma-ink-900 sm:text-spma-heading-xl lg:mt-[clamp(8px,1.7svh,16px)] lg:text-[clamp(21px,3.4svh,32px)] lg:leading-[1.25]">
          Sistema Nacional de Planejamento, <br className="max-lg:hidden" />
          Monitoramento e Avaliação <br className="max-lg:hidden" />
          da Qualificação Profissional no Turismo
        </p>
        <p className="mt-9 text-[18px] leading-6 text-spma-ink-600 lg:mt-[clamp(12px,3.8svh,36px)] lg:text-[clamp(15px,1.9svh,18px)] lg:leading-[1.35]">
          De acordo com a
        </p>
        <p className="mt-1 max-w-[400px] font-heading text-[22px] leading-[29px] font-semibold text-spma-primary-700 lg:text-[clamp(17px,2.3svh,22px)] lg:leading-[1.3]">
          Política Nacional de Qualificação no Turismo (PNQT)
        </p>
        <span
          aria-hidden="true"
          className="mt-6 block h-[3px] w-[70px] rounded-full bg-spma-primary-700 lg:mt-[clamp(10px,2.5svh,24px)]"
        />
        <p className="mt-8 max-w-[270px] text-spma-body-md text-spma-ink-900 lg:mt-[clamp(12px,3.4svh,32px)]">
          Uma plataforma integrada para planejar, monitorar e avaliar ações de qualificação
          profissional no turismo em todo o Brasil.
        </p>

        {/* Pontilhado decorativo à esquerda da colagem. */}
        <span
          aria-hidden="true"
          className="spma-pontilhado absolute top-[72%] left-0 hidden h-[clamp(96px,17svh,160px)] w-[136px] lg:block"
        />

        {/* Colagem de fotos em losango (espaço reservado): 560px na
            referência. Numa janela baixa ou estreita ela encolhe para nunca
            cobrir o texto, ficando com o maior destes dois espaços:
            - ao lado da PNQT, abaixo do título: até 57svh de altura e a
              largura da coluna (53vw) menos os 480px do texto da PNQT;
            - abaixo do traço: até 40svh.
            E nunca passa da largura que sobra ao lado da descrição (350px). */}
        <div
          aria-hidden="true"
          className="absolute right-0 bottom-0 -z-10 hidden size-[min(560px,53vw_-_350px,max(min(57svh,53vw_-_480px),40svh))] overflow-hidden lg:block"
        >
          <Losango className="top-[9.1%] left-[34.1%] bg-spma-primary-100" />
          <Losango className="top-[35.9%] left-[8.75%] bg-spma-primary-50" />
          <Losango className="top-[36.8%] left-[60.2%] bg-spma-primary-50" />
          <Losango className="top-[60.9%] left-[35.5%] bg-spma-primary-100" />
        </div>
      </section>

      {/* Acesso. `overflow-y-auto` só como rede: numa janela abaixo de ~600px
          úteis, rola o cartão, não a página. */}
      <main className="flex flex-col items-center px-4 pb-10 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:min-h-0 lg:items-start lg:overflow-y-auto lg:pt-[clamp(12px,3.6svh,55px)] lg:max-xl:pt-4 lg:pr-[clamp(16px,3.6vw,56px)] lg:pb-[clamp(10px,2.4svh,32px)] lg:max-xl:pb-2">
        <Card className="w-full max-w-[670px] shrink-0 gap-0 border border-spma-divider py-0 shadow-spma-card ring-0">
          <CardContent className="px-6 py-10 sm:px-14 sm:pt-[84px] sm:pb-11 lg:px-[clamp(24px,3.6vw,56px)] lg:pt-[clamp(18px,5.6svh,84px)] lg:pb-[clamp(16px,3.6svh,44px)]">
            <div className="mb-12 flex items-center gap-5 lg:mb-[clamp(12px,3.2svh,48px)]">
              <span className="inline-flex size-[68px] shrink-0 items-center justify-center rounded-full border-2 border-spma-primary-700 text-spma-primary-700 lg:size-[clamp(48px,7svh,68px)]">
                <User aria-hidden="true" strokeWidth={1.5} className="size-[38px] lg:size-[clamp(26px,3.9svh,38px)]" />
              </span>
              <div>
                <h1 className="text-spma-heading-lg text-spma-ink-900 lg:text-[clamp(21px,3svh,26px)] lg:leading-[1.25]">
                  Acesso ao sistema
                </h1>
                <p className="mt-1 text-[15px] leading-[22px] text-spma-ink-600">
                  Informe suas credenciais para acessar o SPMA
                </p>
              </div>
            </div>

            <LoginForm />

            <aside className="mt-10 flex gap-6 rounded-lg bg-spma-primary-100 p-6 lg:mt-[clamp(10px,2.6svh,40px)] lg:gap-[clamp(12px,1.6vw,24px)] lg:px-[clamp(14px,1.6vw,24px)] lg:py-[clamp(10px,2.2svh,24px)]">
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
        <div className="mt-10 flex w-full max-w-[670px] shrink-0 flex-wrap items-center justify-around gap-4 text-spma-body-md text-spma-ink-600 lg:mt-[clamp(8px,2.6svh,40px)]">
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
      {/* Uma linha só. A partir de xl os espaços e o selo do Apoio encolhem
          com a largura; entre lg e xl a coluna é estreita demais e os rótulos
          sobem para cima dos logos, como no "Desenvolvido por". */}
      <footer className="order-last flex flex-wrap items-center gap-x-6 gap-y-4 bg-spma-surface px-6 py-8 sm:px-[52px] lg:order-none lg:col-start-1 lg:row-start-2 lg:h-[clamp(84px,14svh,144px)] lg:flex-nowrap lg:gap-x-[clamp(12px,1.2vw,24px)] lg:px-[clamp(20px,2.6vw,52px)] lg:py-0">
        <div className={GRUPO_PARCEIRO}>
          <span className="text-spma-caption text-spma-ink-900">Realização:</span>
          <span className="flex items-center gap-2">
            {/* <img> simples: o next/image grava style= e a CSP bloqueia. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/unb-simbolo.png" alt="" width={65} height={32} />
            <span className="font-heading text-[24px] leading-none font-bold text-spma-unb-blue">UnB</span>
          </span>
        </div>
        <span aria-hidden="true" className={DIVISOR_PARCEIRO} />
        <div className={GRUPO_PARCEIRO}>
          <span className="text-spma-caption text-spma-ink-900">Apoio:</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/mtur-governo-federal.png"
            alt="Ministério do Turismo e Governo do Brasil"
            width={760}
            height={180}
            className="h-auto w-[236px] lg:w-[clamp(170px,14vw,236px)]"
          />
        </div>
        <span aria-hidden="true" className={DIVISOR_PARCEIRO} />
        <div className="flex shrink-0 flex-col gap-1.5">
          <span className="text-spma-caption text-spma-ink-900">Desenvolvido por:</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/sprint-dados.png"
            alt="Sprint Dados"
            width={560}
            height={63}
            className="h-auto w-[170px] lg:w-[clamp(120px,11vw,170px)]"
          />
        </div>
      </footer>
    </div>
  );
}
