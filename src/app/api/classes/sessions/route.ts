import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { ensureSessionsForWeek, getWeekStart } from "@/lib/classes";
import { addDays } from "date-fns";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const weekParam = searchParams.get("week");

  const weekStart = weekParam ? new Date(weekParam) : getWeekStart(new Date());
  const weekEnd = addDays(weekStart, 6);

  await ensureSessionsForWeek(weekStart);

  let studentId: string | null = null;
  if (session.role === "STUDENT") {
    const student = await prisma.student.findUnique({ where: { userId: session.userId } });
    studentId = student?.id ?? null;
  }

  const sessions = await prisma.classSession.findMany({
    where: {
      date: { gte: weekStart, lte: weekEnd },
      classSchedule: { isActive: true, deletedAt: null },
    },
    include: {
      classSchedule: {
        include: { plans: { include: { plan: { select: { id: true, name: true } } } } },
      },
      _count: { select: { bookings: { where: { status: { in: ["RESERVED", "ATTENDED"] } } } } },
      ...(studentId
        ? {
            bookings: {
              where: { studentId },
              select: { id: true, status: true },
            },
          }
        : {}),
    },
    orderBy: [{ date: "asc" }, { classSchedule: { startTime: "asc" } }],
  });

  const result = sessions.map((s) => ({
    ...s,
    effectiveStartTime: s.startTime ?? s.classSchedule.startTime,
    effectiveDuration: s.duration ?? s.classSchedule.duration,
    effectiveMaxCapacity: s.maxCapacity ?? s.classSchedule.maxCapacity,
    userBooking: studentId && "bookings" in s ? (s as { bookings?: { id: string; status: string }[] }).bookings?.[0] ?? null : null,
  }));

  return NextResponse.json(result);
}
