import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const payment = await prisma.payment.findUnique({
    where: { id },
    include: {
      student: { select: { firstName: true, lastName: true, userId: true } },
      reviewedBy: { select: { email: true } },
    },
  });

  if (!payment) return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 });

  if (session.role === "STUDENT" && payment.student.userId !== session.userId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  return NextResponse.json(payment);
}
