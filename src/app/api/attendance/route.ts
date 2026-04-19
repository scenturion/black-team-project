import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

const schema = z.object({
  classSessionId: z.string().min(1),
  records: z.array(
    z.object({
      studentId: z.string(),
      present: z.boolean(),
      notes: z.string().optional(),
    })
  ),
});

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const classSessionId = searchParams.get("classSessionId");
  const studentId = searchParams.get("studentId");

  if (session.role === "STUDENT") {
    const student = await prisma.student.findUnique({ where: { userId: session.userId } });
    if (!student) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    const records = await prisma.attendance.findMany({
      where: { studentId: student.id },
      include: {
        classSession: {
          include: { classSchedule: { select: { name: true, startTime: true } } },
        },
      },
      orderBy: { classSession: { date: "desc" } },
    });
    return NextResponse.json(records);
  }

  if (!classSessionId && !studentId) {
    return NextResponse.json({ error: "Requerido: classSessionId o studentId" }, { status: 400 });
  }

  const records = await prisma.attendance.findMany({
    where: {
      ...(classSessionId ? { classSessionId } : {}),
      ...(studentId ? { studentId } : {}),
    },
    include: {
      student: { select: { firstName: true, lastName: true } },
      classSession: {
        include: { classSchedule: { select: { name: true } } },
      },
    },
    orderBy: { classSession: { date: "desc" } },
  });

  return NextResponse.json(records);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  const { classSessionId, records } = parsed.data;

  const results = await Promise.all(
    records.map(async (r) => {
      const attendance = await prisma.attendance.upsert({
        where: { studentId_classSessionId: { studentId: r.studentId, classSessionId } },
        update: { present: r.present, notes: r.notes },
        create: { studentId: r.studentId, classSessionId, present: r.present, notes: r.notes },
      });

      await prisma.booking.updateMany({
        where: {
          studentId: r.studentId,
          classSessionId,
          status: "RESERVED",
        },
        data: { status: r.present ? "ATTENDED" : "ABSENT" },
      });

      return attendance;
    })
  );

  return NextResponse.json(results);
}
