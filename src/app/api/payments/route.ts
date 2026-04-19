import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { saveFile } from "@/lib/storage";
import { getCurrentPeriod } from "@/lib/utils";
import { notifyPaymentPendingReview } from "@/lib/notifications";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  if (session.role === "STUDENT") {
    const student = await prisma.student.findUnique({ where: { userId: session.userId } });
    if (!student) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    const payments = await prisma.payment.findMany({
      where: { studentId: student.id },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(payments);
  }

  const payments = await prisma.payment.findMany({
    where: status ? { status: status as "PENDING" | "APPROVED" | "REJECTED" } : {},
    include: {
      student: { select: { firstName: true, lastName: true, user: { select: { email: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(payments);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "STUDENT") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const student = await prisma.student.findUnique({ where: { userId: session.userId } });
  if (!student) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  if (student.status !== "ACTIVE") return NextResponse.json({ error: "Tu cuenta no está activa" }, { status: 403 });

  const formData = await req.formData();
  const period = (formData.get("period") as string) || getCurrentPeriod();
  const amount = formData.get("amount") ? parseFloat(formData.get("amount") as string) : undefined;
  const notes = formData.get("notes") as string | undefined;
  const voucherFile = formData.get("voucher") as File | null;

  let voucherPath: string | undefined;
  if (voucherFile) {
    voucherPath = await saveFile(voucherFile, "vouchers");
  }

  const payment = await prisma.payment.create({
    data: {
      studentId: student.id,
      period,
      amount,
      notes,
      voucherPath,
      status: "PENDING",
    },
  });

  const admins = await prisma.user.findMany({ where: { role: "ADMIN" } });
  for (const admin of admins) {
    await notifyPaymentPendingReview(admin.id, `${student.firstName} ${student.lastName}`);
  }

  return NextResponse.json(payment, { status: 201 });
}
