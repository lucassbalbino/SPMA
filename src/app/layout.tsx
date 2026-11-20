import type { Metadata } from "next";
import { Geist_Mono, Lexend, Nunito_Sans } from "next/font/google";
import "./globals.css";

// Fontes do design system SPMA (docs/design-system.md).
const lexend = Lexend({
  variable: "--font-lexend",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const nunitoSans = Nunito_Sans({
  variable: "--font-nunito-sans",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SPMA",
  description:
    "Sistema de Planejamento, Monitoramento e Avaliação de Cursos de Turismo",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${lexend.variable} ${nunitoSans.variable} ${geistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
