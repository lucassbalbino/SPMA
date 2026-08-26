"use client";

// Fronteira de erro do React para exceções não capturadas no próprio
// root layout (REQ-SEC-11). Substitui o layout inteiro quando dispara, por
// isso precisa dos próprios `<html>`/`<body>`. Mesma regra de error.tsx:
// mensagem genérica + `error.digest`, nunca `error.message`/stack.
export default function ErroGlobal({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <h2>Ocorreu um erro inesperado.</h2>
        {error.digest && <p>Código: {error.digest}</p>}
        <button onClick={() => reset()}>Tentar novamente</button>
      </body>
    </html>
  );
}
