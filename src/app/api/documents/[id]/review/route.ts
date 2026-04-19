import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";

const schema = z.object({
  status: z.enum(["APPROVED", "EXPIRED"]),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  const before = await prisma.document.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });

  const updated = await prisma.document.update({
    where: { id },
    data: {
      status: parsed.data.status,
      notes: parsed.data.notes,
      reviewedById: session.userId,
      reviewedAt: new Date(),
    },
  });

  await createAuditLog(session.userId, `DOCUMENT_${parsed.data.status}`, "Document", id, before, updated);
  return NextResponse.json(updated);
}
