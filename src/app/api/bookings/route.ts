import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getWeekStart, countWeeklyBookings, getSessionCapacity } from "@/lib/classes";

const schema = z.object({ classSessionId: z.string().min(1) });

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const studentIdParam = searchParams.get("studentId");

  let studentId: string;

  if (session.role === "ADMIN" && studentIdParam) {
    studentId = studentIdParam;
  } else {
    const student = await prisma.student.findUnique({ where: { userId: session.userId } });
    if (!student) return NextResponse.json({ error: "Alumno no encontrado" }, { status: 404 });
    studentId = student.id;
  }

  const bookings = await prisma.booking.findMany({
    where: { studentId },
    include: {
      classSession: {
        include: { classSchedule: { select: { name: true, startTime: true, days: true } } },
      },
    },
    orderBy: { classSession: { date: "desc" } },
  });

  return NextResponse.json(bookings);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  const student = await prisma.student.findUnique({
    where: { userId: session.userId },
    include: { plans: { where: { isActive: true }, include: { plan: true } } },
  });

  if (!student) return NextResponse.json({ error: "Alumno no encontrado" }, { status: 404 });
  if (student.status !== "ACTIVE") return NextResponse.json({ error: "Tu cuenta no está activa" }, { status: 403 });

  const activePlan = student.plans[0];
  if (!activePlan) return NextResponse.json({ error: "No tenés un plan activo" }, { status: 403 });

  const classSession = await prisma.classSession.findUnique({
    where: { id: parsed.data.classSessionId },
    include: { classSchedule: { include: { plans: true } } },
  });

  if (!classSession) return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });
  if (classSession.status !== "ACTIVE") return NextResponse.json({ error: "Esta clase no está disponible" }, { status: 400 });

  const planAllowed = classSession.classSchedule.plans.some((p) => p.planId === activePlan.planId);
  if (!planAllowed && classSession.classSchedule.plans.length > 0) {
    return NextResponse.json({ error: "Tu plan no incluye esta clase" }, { status: 403 });
  }

  const { max, booked } = await getSessionCapacity(parsed.data.classSessionId);
  if (booked >= max) return NextResponse.json({ error: "La clase no tiene cupos disponibles" }, { status: 400 });

  const existing = await prisma.booking.findUnique({
    where: { studentId_classSessionId: { studentId: student.id, classSessionId: parsed.data.classSessionId } },
  });
  if (existing && existing.status === "RESERVED") {
    return NextResponse.json({ error: "Ya tenés una reserva para esta clase" }, { status: 400 });
  }

  const weekStart = getWeekStart(classSession.date);

  if (activePlan.plan.classesPerWeek !== null) {
    const weeklyCount = await countWeeklyBookings(student.id, weekStart);
    if (weeklyCount >= activePlan.plan.classesPerWeek) {
      return NextResponse.json({ error: `Ya usaste tus ${activePlan.plan.classesPerWeek} clases de esta semana` }, { status: 400 });
    }
  }

  const booking = await prisma.booking.upsert({
    where: { studentId_classSessionId: { studentId: student.id, classSessionId: parsed.data.classSessionId } },
    update: { status: "RESERVED", cancelledAt: null, cancelledBy: null, weekStart },
    create: {
      studentId: student.id,
      classSessionId: parsed.data.classSessionId,
      weekStart,
      status: "RESERVED",
    },
  });

  return NextResponse.json(booking, { status: 201 });
}
