import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { deleteFile } from "@/lib/storage";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  if (session.role === "STUDENT") {
    const student = await prisma.student.findUnique({ where: { userId: session.userId } });
    if (!student || doc.studentId !== student.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
  }

  await deleteFile(doc.path);
  await prisma.document.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
