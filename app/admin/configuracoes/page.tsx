import { SupportSettingsForm } from "@/components/admin/support-settings-form";
import { getSupportSettings } from "@/lib/support";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const settings = await getSupportSettings();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <p className="text-sm font-bold uppercase tracking-wide text-[#8A1DEE]">Administração</p>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Configurações</h1>
        <p className="mt-3 text-white/62">
          Configure o canal de suporte exibido para alunos, vendedores e visitantes.
        </p>
      </header>

      <section className="rounded-xl border border-white/10 bg-[#151019] p-5 sm:p-6">
        <h2 className="text-xl font-bold">Canal de suporte</h2>
        <p className="mt-1 text-sm text-white/55">
          O número e a mensagem padrão alimentam os botões “Falar com o suporte” em todo o sistema.
        </p>
        {!settings.supportWhatsApp?.trim() ? (
          <p className="mt-4 rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
            Aviso: o WhatsApp ainda não foi configurado. Os botões de suporte ficarão ocultos até você salvar um número
            válido.
          </p>
        ) : null}
        <div className="mt-5">
          <SupportSettingsForm settings={settings} />
        </div>
      </section>
    </div>
  );
}
