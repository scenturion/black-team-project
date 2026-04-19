import { prisma } from "./db";
import { DayOfWeek } from "@prisma/client";
import { startOfWeek, addDays, format } from "date-fns";

const DAY_MAP: Record<DayOfWeek, number> = {
  LUNES: 1,
  MARTES: 2,
  MIERCOLES: 3,
  JUEVES: 4,
  VIERNES: 5,
  SABADO: 6,
  DOMINGO: 0,
};

export function getWeekStart(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 1 });
}

export function getWeekDates(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

export async function ensureSessionsForWeek(weekStart: Date): Promise<void> {
  const weekEnd = addDays(weekStart, 6);

  const activeSchedules = await prisma.classSchedule.findMany({
    where: {
      isActive: true,
      validFrom: { lte: weekEnd },
      OR: [{ validUntil: null }, { validUntil: { gte: weekStart } }],
    },
  });

  for (const schedule of activeSchedules) {
    const targetDayIndex = DAY_MAP[schedule.dayOfWeek];
    const weekDates = getWeekDates(weekStart);
    const sessionDate = weekDates.find((d) => d.getDay() === targetDayIndex);
    if (!sessionDate) continue;

    await prisma.classSession.upsert({
      where: {
        classScheduleId_date: {
          classScheduleId: schedule.id,
          date: sessionDate,
        },
      },
      update: {},
      create: {
        classScheduleId: schedule.id,
        date: sessionDate,
        status: "ACTIVE",
      },
    });
  }
}

export async function countWeeklyBookings(studentId: string, weekStart: Date): Promise<number> {
  return prisma.booking.count({
    where: {
      studentId,
      weekStart,
      status: { in: ["RESERVED", "ATTENDED"] },
    },
  });
}

export async function getSessionCapacity(sessionId: string): Promise<{ max: number; booked: number }> {
  const session = await prisma.classSession.findUnique({
    where: { id: sessionId },
    include: { classSchedule: true },
  });
  if (!session) return { max: 0, booked: 0 };

  const max = session.maxCapacity ?? session.classSchedule.maxCapacity;
  const booked = await prisma.booking.count({
    where: {
      classSessionId: sessionId,
      status: { in: ["RESERVED", "ATTENDED"] },
    },
  });
  return { max, booked };
}

export function formatSessionDate(date: Date): string {
  return format(date, "dd/MM/yyyy");
}
