import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";

const schema = z.object({
  planId: z.string().min(1),
  startDate: z.string(),
  endDate: z.string().optional(),
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

  const student = await prisma.student.findUnique({ where: { id } });
  if (!student) return NextResponse.json({ error: "Alumno no encontrado" }, { status: 404 });

  const plan = await prisma.plan.findUnique({ where: { id: parsed.data.planId } });
  if (!plan) return NextResponse.json({ error: "Plan no encontrado" }, { status: 404 });

  await prisma.studentPlan.updateMany({
    where: { studentId: id, isActive: true },
    data: { isActive: false, endDate: new Date() },
  });

  const studentPlan = await prisma.studentPlan.create({
    data: {
      studentId: id,
      planId: parsed.data.planId,
      startDate: new Date(parsed.data.startDate),
      endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : undefined,
      assignedById: session.userId,
      isActive: true,
    },
    include: { plan: true },
  });

  await createAuditLog(session.userId, "ASSIGN_PLAN", "StudentPlan", studentPlan.id, null, { planId: plan.id, planName: plan.name });

  return NextResponse.json(studentPlan, { status: 201 });
}
