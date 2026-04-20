import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const schedules = await prisma.classSchedule.findMany({
    where: { deletedAt: null },
    include: {
      plans: { include: { plan: { select: { id: true, name: true } } } },
    },
    orderBy: [{ startTime: "asc" }],
  });
  return NextResponse.json(schedules);
}

const schema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  days: z.array(z.enum(["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO", "DOMINGO"])).min(1),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  duration: z.number().int().min(15),
  maxCapacity: z.number().int().min(1),
  validFrom: z.string(),
  validUntil: z.string().optional(),
  isActive: z.boolean().optional(),
  planIds: z.array(z.string()).optional(),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });

  const { planIds, ...scheduleData } = parsed.data;

  const schedule = await prisma.classSchedule.create({
    data: {
      ...scheduleData,
      validFrom: new Date(scheduleData.validFrom),
      validUntil: scheduleData.validUntil ? new Date(scheduleData.validUntil) : undefined,
      plans: planIds
        ? { create: planIds.map((planId) => ({ planId })) }
        : undefined,
    },
    include: { plans: { include: { plan: true } } },
  });

  return NextResponse.json(schedule, { status: 201 });
}
