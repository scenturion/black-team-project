import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { notifyPaymentApproved, notifyPaymentRejected } from "@/lib/notifications";
import { formatPeriod } from "@/lib/utils";

const schema = z.object({
  action: z.enum(["APPROVED", "REJECTED"]),
  rejectionReason: z.string().optional(),
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

  const payment = await prisma.payment.findUnique({
    where: { id },
    include: { student: { include: { user: { select: { id: true, email: true } } } } },
  });

  if (!payment) return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 });
  if (payment.status !== "PENDING") {
    return NextResponse.json({ error: "Este pago ya fue procesado" }, { status: 400 });
  }

  const updated = await prisma.payment.update({
    where: { id },
    data: {
      status: parsed.data.action,
      reviewedById: session.userId,
      reviewedAt: new Date(),
      rejectionReason: parsed.data.rejectionReason,
    },
  });

  await createAuditLog(session.userId, `PAYMENT_${parsed.data.action}`, "Payment", id, { status: "PENDING" }, { status: parsed.data.action });

  const period = formatPeriod(payment.period);
  if (parsed.data.action === "APPROVED") {
    await notifyPaymentApproved(payment.student.user.id, payment.student.user.email, period);
  } else {
    await notifyPaymentRejected(payment.student.user.id, payment.student.user.email, period, parsed.data.rejectionReason);
  }

  return NextResponse.json(updated);
}
