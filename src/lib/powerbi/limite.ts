// Limite de pedidos ao endpoint do Power BI por sessão (dashboard-powerbi,
// PBI-20): 20 a cada 60 s, em memória.
//
// Sem tabela: produção roda um processo só (AD-047), e o uso normal é uma
// abertura da página mais uma renovação por hora. Reiniciar o serviço zera
// os contadores, o que é aceitável para um limite de abuso.
export function criarLimitador(
  opcoes: { maximo?: number; janelaMs?: number; agora?: () => number } = {},
) {
  const maximo = opcoes.maximo ?? 20;
  const janelaMs = opcoes.janelaMs ?? 60_000;
  const agora = opcoes.agora ?? Date.now;
  const janelas = new Map<string, { inicio: number; pedidos: number }>();

  return {
    permitir(chave: string): boolean {
      const t = agora();

      // Descarta as janelas vencidas: a memória fica no tamanho das sessões ativas.
      for (const [k, janela] of janelas) {
        if (t - janela.inicio >= janelaMs) {
          janelas.delete(k);
        }
      }

      const janela = janelas.get(chave);
      if (!janela) {
        janelas.set(chave, { inicio: t, pedidos: 1 });
        return true;
      }

      if (janela.pedidos >= maximo) {
        return false;
      }

      janela.pedidos++;
      return true;
    },

    tamanho(): number {
      return janelas.size;
    },
  };
}
