import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";

const schema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  duration: z.number().int().min(15).optional(),
  maxCapacity: z.number().int().min(1).optional(),
  isActive: z.boolean().optional(),
  validUntil: z.string().optional(),
  planIds: z.array(z.string()).optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const schedule = await prisma.classSchedule.findUnique({
    where: { id },
    include: {
      plans: { include: { plan: true } },
      sessions: { orderBy: { date: "desc" }, take: 10 },
    },
  });
  if (!schedule) return NextResponse.json({ error: "Clase no encontrada" }, { status: 404 });
  return NextResponse.json(schedule);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  const { planIds, ...scheduleData } = parsed.data;
  const before = await prisma.classSchedule.findUnique({ where: { id } });

  const updated = await prisma.classSchedule.update({
    where: { id },
    data: {
      ...scheduleData,
      validUntil: scheduleData.validUntil ? new Date(scheduleData.validUntil) : undefined,
      ...(planIds !== undefined
        ? {
            plans: {
              deleteMany: {},
              create: planIds.map((planId) => ({ planId })),
            },
          }
        : {}),
    },
    include: { plans: { include: { plan: true } } },
  });

  await createAuditLog(session.userId, "UPDATE_CLASS_SCHEDULE", "ClassSchedule", id, before, updated);
  return NextResponse.json(updated);
}
