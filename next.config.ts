import type { NextConfig } from "next";

// Cabeçalhos de segurança estáticos (REQ-SEC-16), aplicados a toda resposta
// de documento. Content-Security-Policy fica de fora daqui de propósito: é
// dinâmico, por nonce, emitido em `src/proxy.ts` (ver Tech Decisions em
// design.md - um CSP estático exigiria 'unsafe-inline' e não bloquearia XSS
// de verdade).
const nextConfig: NextConfig = {
  // Build autocontido em `.next/standalone` (server.js + só o node_modules
  // rastreado): é o que o CI empacota e manda para a VPS, que não tem RAM
  // para rodar `next build` nem `npm ci` (ver docs/DEPLOY_PRODUCAO.md).
  output: "standalone",
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
