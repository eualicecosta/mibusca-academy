"use client";

import { ArrowRight, PauseCircle, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { updateMemberProfile, updateUserApproval } from "@/lib/actions";

type Member = {
  id: string;
  name: string;
  email: string;
  whatsapp: string | null;
  clerkId: string;
};

export function MemberOptions({ member }: { member: Member }) {
  const pauseMember = updateUserApproval.bind(null, member.id, "REFUSED");

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="grid w-full min-w-0 items-center gap-4 border-b border-white/10 px-5 py-4 text-left transition last:border-b-0 hover:bg-white/[0.04] md:grid-cols-[minmax(0,1.4fr)_minmax(0,1.6fr)_180px_120px_24px]">
          <span className="min-w-0">
            <strong className="block break-words text-white">{member.name}</strong>
            <span className="mt-1 block break-all text-xs text-white/38">ID: {member.clerkId}</span>
          </span>
          <span className="min-w-0 break-all text-sm text-white/62">{member.email}</span>
          <span className="min-w-0 break-words text-sm text-white/62">{member.whatsapp || "-"}</span>
          <span className="w-fit rounded-full bg-emerald-500/14 px-3 py-1 text-xs font-bold text-emerald-300">Ativo</span>
          <ArrowRight className="hidden h-5 w-5 justify-self-end text-white/45 md:block" />
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl">
        <DialogTitle>Opcoes do membro</DialogTitle>
        <div className="min-w-0 rounded-lg border border-white/10 bg-white/[0.03] p-4">
          <p className="break-words text-lg font-bold">{member.name}</p>
          <p className="mt-1 break-all text-sm text-white/58">{member.email}</p>
          <p className="mt-1 break-all text-xs text-white/38">Clerk ID: {member.clerkId}</p>
        </div>

        <form action={updateMemberProfile} className="grid min-w-0 gap-3">
          <input type="hidden" name="id" value={member.id} />
          <label className="grid gap-2 text-sm text-white/65">
            Nome
            <input
              name="name"
              defaultValue={member.name}
              className="min-w-0 rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-white"
            />
          </label>
          <label className="grid gap-2 text-sm text-white/65">
            E-mail
            <input
              name="email"
              type="email"
              defaultValue={member.email}
              className="min-w-0 rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-white"
            />
          </label>
          <label className="grid gap-2 text-sm text-white/65">
            WhatsApp
            <input
              name="whatsapp"
              defaultValue={member.whatsapp || ""}
              className="min-w-0 rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-white"
            />
          </label>
          <div className="flex flex-wrap justify-end gap-3 pt-2">
            <Button type="submit">
              <Save className="h-4 w-4" />
              Salvar
            </Button>
          </div>
        </form>

        <div className="rounded-lg border border-red-500/25 bg-red-500/8 p-4">
          <form action={pauseMember}>
            <Button type="submit" variant="destructive" className="w-full">
              <PauseCircle className="h-4 w-4" />
              Pausar acesso
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
