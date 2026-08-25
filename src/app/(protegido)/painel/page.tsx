// Placeholder mínimo - conteúdo real chega em T28
// (`feat(auth): add profile-routed painel page`).
//
// Necessário já em T25 só para que a rota exista: o App Router do Next.js
// não invoca o layout de um segmento sem uma folha (page.tsx) correspondente
// casando com a URL pedida, e o guard chain de `(protegido)/layout.tsx`
// precisa de pelo menos uma rota real para ser testável via e2e (ver
// SPEC_DEVIATION em layout.tsx).
export default function PainelPage() {
  return null;
}
