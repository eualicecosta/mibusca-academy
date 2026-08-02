"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Check, ChevronDown } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function ScrollHeroVisual() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 80]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, reduce ? 1 : 0.35]);

  return (
    <div ref={ref} className="relative mx-auto mt-10 w-full max-w-lg lg:mt-0">
      <motion.div style={{ y, opacity }} className="relative">
        <div className="absolute -inset-6 rounded-[2rem] bg-[radial-gradient(circle_at_30%_20%,rgba(138,29,238,.45),transparent_55%)] blur-2xl" />
        <div className="relative overflow-hidden rounded-2xl border border-white/12 bg-[#12091c]/90 p-4 shadow-2xl shadow-[#53009F]/25 backdrop-blur">
          <p className="text-xs font-bold uppercase tracking-wide text-[#B76CFF]">Rotina de gestão</p>
          <div className="mt-4 grid gap-3">
            {[
              { label: "Cardápio", w: "92%" },
              { label: "Precificação", w: "78%" },
              { label: "Campanha", w: "64%" },
              { label: "Conversão", w: "86%" },
              { label: "Acompanhamento", w: "70%" }
            ].map((row, i) => (
              <motion.div
                key={row.label}
                initial={reduce ? false : { opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.12 * i, duration: 0.45 }}
                className="rounded-xl border border-white/10 bg-black/30 p-3"
              >
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-semibold text-white/90">{row.label}</span>
                  <span className="text-xs text-white/45">etapa {i + 1}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-[#53009F] to-[#8A1DEE]"
                    initial={reduce ? false : { width: 0 }}
                    animate={{ width: row.w }}
                    transition={{ delay: 0.2 + i * 0.1, duration: 0.7 }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
          <div className="mt-4 rounded-xl border border-[#8A1DEE]/30 bg-[#8A1DEE]/10 p-3 text-xs leading-5 text-white/70">
            Funil conceitual: organize a decisão antes de mexer em preço, anúncio ou desconto.
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export function BeforeAfterCompare() {
  const [mode, setMode] = useState<"antes" | "depois">("antes");
  const reduce = useReducedMotion();

  const antes = [
    "Preço definido com porcentagem genérica",
    "Campanha ativada sem olhar margem",
    "Cardápio só por tipo de produto",
    "Desconto sem objetivo claro",
    "Análise só pela quantidade de pedidos",
    "Decisões no improviso"
  ];
  const depois = [
    "Preço com taxa e margem consideradas",
    "Campanha escolhida conforme objetivo",
    "Cardápio estruturado para facilitar a compra",
    "Combos com lógica de ticket e margem",
    "Leitura de funil, conversão, ticket e ROI",
    "Rotina de análise e aplicação"
  ];

  const items = mode === "antes" ? antes : depois;

  return (
    <div className="rounded-2xl border border-white/10 bg-[#151019] p-5 sm:p-8">
      <div className="flex flex-wrap gap-2">
        {(["antes", "depois"] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setMode(key)}
            className={cn(
              "min-h-11 rounded-full px-4 text-sm font-bold transition",
              mode === key ? "bg-[#8A1DEE] text-white" : "border border-white/12 bg-black/25 text-white/70 hover:bg-white/8"
            )}
          >
            {key === "antes" ? "Antes" : "Depois"}
          </button>
        ))}
      </div>
      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {items.map((text, i) => (
          <motion.li
            key={`${mode}-${text}`}
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04, duration: 0.3 }}
            className="flex gap-3 rounded-xl border border-white/10 bg-black/25 p-4 text-sm leading-6 text-white/75"
          >
            <Check className={cn("mt-0.5 h-4 w-4 shrink-0", mode === "depois" ? "text-[#8A1DEE]" : "text-white/40")} />
            {text}
          </motion.li>
        ))}
      </ul>
    </div>
  );
}

export function SalesFaq() {
  const [open, setOpen] = useState<number | null>(0);
  const items = [
    {
      q: "Para quem é o treinamento?",
      a: "Para donos de restaurante, gestores de delivery e operadores de iFood que querem organizar cardápio, preço, campanha e rotina de análise."
    },
    {
      q: "Preciso já vender no iFood?",
      a: "Ajuda se você já opera ou está prestes a operar. O conteúdo parte de decisões reais de gestão de loja no iFood."
    },
    {
      q: "O conteúdo serve para quem gerencia mais de uma loja?",
      a: "Sim. A trilha foca método de análise e rotina que se aplica a uma ou mais unidades."
    },
    {
      q: "Como funciona o acesso?",
      a: "Você solicita o cadastro, a equipe libera o acesso e o conteúdo aparece na área de membros com progresso salvo."
    },
    {
      q: "O treinamento ensina precificação e campanhas?",
      a: "Sim. Há módulos práticos de precificação, ofertas, campanhas, funil, conversão e leitura de resultado."
    },
    {
      q: "Posso acompanhar meu progresso?",
      a: "Sim. A plataforma registra progresso por aula e checklists de aplicação."
    },
    {
      q: "Como funciona o suporte?",
      a: "Há canal humanizado de suporte (WhatsApp) configurado pela equipe MiBusca para dúvidas de acesso e acompanhamento."
    },
    {
      q: "O pagamento é único?",
      a: "A oferta exibida nesta página é de pagamento único no valor promocional indicado. Condições comerciais específicas podem ser confirmadas com a especialista."
    }
  ];

  return (
    <div className="space-y-2">
      {items.map((item, index) => {
        const isOpen = open === index;
        return (
          <div key={item.q} className="overflow-hidden rounded-xl border border-white/10 bg-[#151019]">
            <button
              type="button"
              className="flex min-h-12 w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-bold text-white sm:text-base"
              aria-expanded={isOpen}
              onClick={() => setOpen(isOpen ? null : index)}
            >
              <span>{item.q}</span>
              <ChevronDown className={cn("h-4 w-4 shrink-0 text-white/55 transition", isOpen && "rotate-180")} />
            </button>
            {isOpen ? <p className="border-t border-white/8 px-4 py-3 text-sm leading-7 text-white/65">{item.a}</p> : null}
          </div>
        );
      })}
    </div>
  );
}

export function FadeIn({ children, className }: { children: React.ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.45 }}
    >
      {children}
    </motion.div>
  );
}

export function CtaRow({
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
  secondaryExternal
}: {
  primaryHref: string;
  primaryLabel: string;
  secondaryHref?: string | null;
  secondaryLabel?: string;
  secondaryExternal?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
      <Link
        href={primaryHref}
        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#53009F] px-6 text-sm font-bold shadow-lg shadow-[#53009F]/30 transition hover:bg-[#8A1DEE]"
      >
        {primaryLabel}
        <ArrowRight className="h-4 w-4" />
      </Link>
      {secondaryHref && secondaryLabel ? (
        secondaryExternal ? (
          <a
            href={secondaryHref}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-12 items-center justify-center rounded-lg border border-white/14 bg-black/25 px-6 text-sm font-bold text-white/85 transition hover:bg-white/10"
          >
            {secondaryLabel}
          </a>
        ) : (
          <Link
            href={secondaryHref}
            className="inline-flex min-h-12 items-center justify-center rounded-lg border border-white/14 bg-black/25 px-6 text-sm font-bold text-white/85 transition hover:bg-white/10"
          >
            {secondaryLabel}
          </Link>
        )
      ) : null}
    </div>
  );
}

export function AnimatedCount({ value }: { value: number }) {
  const [n, setN] = useState(0);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (reduce) {
      setN(value);
      return;
    }
    let frame = 0;
    const total = 24;
    const id = window.setInterval(() => {
      frame += 1;
      setN(Math.round((value * frame) / total));
      if (frame >= total) window.clearInterval(id);
    }, 24);
    return () => window.clearInterval(id);
  }, [value, reduce]);
  return <span>{n}</span>;
}
