import { headers } from "next/headers";
import { Webhook } from "svix";
import { prisma } from "@/lib/prisma";

type ClerkUserEvent = {
  type: "user.created" | "user.updated" | "user.deleted";
  data: {
    id: string;
    first_name?: string | null;
    last_name?: string | null;
    email_addresses?: Array<{ email_address: string; id: string }>;
    primary_email_address_id?: string | null;
  };
};

function getEmail(data: ClerkUserEvent["data"]) {
  const primary = data.email_addresses?.find((item) => item.id === data.primary_email_address_id);
  return primary?.email_address || data.email_addresses?.[0]?.email_address || `${data.id}@clerk.local`;
}

export async function POST(req: Request) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    return new Response("CLERK_WEBHOOK_SECRET ausente", { status: 500 });
  }

  const headerPayload = await headers();
  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response("Headers ausentes", { status: 400 });
  }

  const payload = await req.text();
  const wh = new Webhook(secret);
  let event: ClerkUserEvent;

  try {
    event = wh.verify(payload, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature
    }) as ClerkUserEvent;
  } catch {
    return new Response("Assinatura inválida", { status: 400 });
  }

  if (event.type === "user.deleted") {
    await prisma.userProfile.deleteMany({ where: { clerkId: event.data.id } });
    return Response.json({ ok: true });
  }

  const email = getEmail(event.data).toLowerCase();
  const name = [event.data.first_name, event.data.last_name].filter(Boolean).join(" ") || email;

  await prisma.userProfile.upsert({
    where: { clerkId: event.data.id },
    create: {
      clerkId: event.data.id,
      email,
      name,
      status: "PENDING"
    },
    update: {
      email,
      name
    }
  });

  return Response.json({ ok: true });
}
