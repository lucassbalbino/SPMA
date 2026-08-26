"use client";

// Fronteira de erro do React para exceções de renderização não capturadas em
// Server Components (REQ-SEC-11, lado de páginas). Exibe mensagem genérica +
// `error.digest` - id de correlação que o próprio Next já gera e já loga no
// servidor. Nunca `error.message`/stack aqui (vazaria detalhe interno ao
// cliente).
export default function ErroPagina({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div>
      <h2>Ocorreu um erro inesperado.</h2>
      {error.digest && <p>Código: {error.digest}</p>}
      <button onClick={() => reset()}>Tentar novamente</button>
    </div>
  );
}
