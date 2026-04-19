import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";

const schema = z.object({
  present: z.boolean(),
  notes: z.string().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  const before = await prisma.attendance.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Registro no encontrado" }, { status: 404 });

  const updated = await prisma.attendance.update({
    where: { id },
    data: {
      present: parsed.data.present,
      notes: parsed.data.notes,
      correctedById: session.userId,
      correctedAt: new Date(),
    },
  });

  await prisma.booking.updateMany({
    where: { studentId: before.studentId, classSessionId: before.classSessionId },
    data: { status: parsed.data.present ? "ATTENDED" : "ABSENT" },
  });

  await createAuditLog(session.userId, "CORRECT_ATTENDANCE", "Attendance", id, before, updated);

  return NextResponse.json(updated);
}
