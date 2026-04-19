import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canCancelBooking } from "@/lib/utils";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      classSession: { include: { classSchedule: true } },
      student: { select: { userId: true } },
    },
  });

  if (!booking) return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 });

  if (session.role === "STUDENT" && booking.student.userId !== session.userId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  if (booking.status !== "RESERVED") {
    return NextResponse.json({ error: "Esta reserva no puede cancelarse" }, { status: 400 });
  }

  if (session.role === "STUDENT") {
    const config = await prisma.systemConfig.findUnique({ where: { key: "cancellation_hours" } });
    const hours = config ? parseInt(config.value) : 4;
    const time = booking.classSession.startTime ?? booking.classSession.classSchedule.startTime;

    if (!canCancelBooking(booking.classSession.date, time, hours)) {
      return NextResponse.json({
        error: `No podés cancelar con menos de ${hours} horas de anticipación`,
      }, { status: 400 });
    }
  }

  const updated = await prisma.booking.update({
    where: { id },
    data: {
      status: session.role === "ADMIN" ? "CANCELLED_BY_ADMIN" : "CANCELLED_BY_STUDENT",
      cancelledAt: new Date(),
      cancelledBy: session.userId,
    },
  });

  return NextResponse.json(updated);
}
