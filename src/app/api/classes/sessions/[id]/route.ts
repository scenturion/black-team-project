import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { notifyClassCancelled, notifyClassModified } from "@/lib/notifications";

const schema = z.object({
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  duration: z.number().int().optional(),
  maxCapacity: z.number().int().optional(),
  status: z.enum(["ACTIVE", "CANCELLED", "MODIFIED"]).optional(),
  cancelReason: z.string().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await prisma.classSession.findUnique({
    where: { id },
    include: {
      classSchedule: true,
      bookings: {
        include: { student: { select: { firstName: true, lastName: true } } },
        where: { status: { in: ["RESERVED", "ATTENDED"] } },
      },
      attendances: {
        include: { student: { select: { firstName: true, lastName: true } } },
      },
    },
  });
  if (!session) return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });
  return NextResponse.json(session);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authSession = await getSession();
  if (!authSession || authSession.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  const before = await prisma.classSession.findUnique({ where: { id }, include: { classSchedule: true } });
  if (!before) return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });

  const updated = await prisma.classSession.update({
    where: { id },
    data: {
      ...parsed.data,
      modifiedById: authSession.userId,
      modifiedAt: new Date(),
      status: parsed.data.status ?? (parsed.data.startTime || parsed.data.duration ? "MODIFIED" : before.status),
    },
  });

  await createAuditLog(authSession.userId, "UPDATE_SESSION", "ClassSession", id, before, updated);

  const bookings = await prisma.booking.findMany({
    where: { classSessionId: id, status: "RESERVED" },
    select: { student: { select: { userId: true } } },
  });
  const userIds = bookings.map((b) => b.student.userId);
  const dateStr = before.date.toLocaleDateString("es-AR", { timeZone: "UTC" });

  if (updated.status === "CANCELLED") {
    await notifyClassCancelled(userIds, before.classSchedule.name, dateStr);
  } else if (updated.status === "MODIFIED") {
    const changes = [];
    if (parsed.data.startTime) changes.push(`Nuevo horario: ${parsed.data.startTime}`);
    if (parsed.data.duration) changes.push(`Nueva duración: ${parsed.data.duration} min`);
    if (changes.length > 0) {
      await notifyClassModified(userIds, before.classSchedule.name, dateStr, changes.join(". "));
    }
  }

  return NextResponse.json(updated);
}
