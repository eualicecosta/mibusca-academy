import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-inter",
  display: "swap"
});

export const metadata: Metadata = {
  title: "Conhecimento iFood - MiBusca Brasil",
  description: "Plataforma de ensino fechada com aprovação manual para alunos da MiBusca Brasil."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/dashboard"
      afterSignOutUrl="/"
    >
      <html lang="pt-BR">
        <body className={inter.variable}>{children}</body>
      </html>
    </ClerkProvider>
  );
}
