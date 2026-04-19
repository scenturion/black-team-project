import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { notifyStudentApproved } from "@/lib/notifications";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;

  const student = await prisma.student.findUnique({
    where: { id },
    include: { user: { select: { email: true, id: true } } },
  });
  if (!student) return NextResponse.json({ error: "Alumno no encontrado" }, { status: 404 });

  if (student.status === "ACTIVE") {
    return NextResponse.json({ error: "El alumno ya está activo" }, { status: 400 });
  }

  const updated = await prisma.student.update({
    where: { id },
    data: {
      status: "ACTIVE",
      approvedById: session.userId,
      approvedAt: new Date(),
    },
  });

  await createAuditLog(session.userId, "APPROVE_STUDENT", "Student", id, { status: student.status }, { status: "ACTIVE" });
  await notifyStudentApproved(student.user.id, student.user.email);

  return NextResponse.json(updated);
}
