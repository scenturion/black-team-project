import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { saveFile } from "@/lib/storage";
import { addYears } from "date-fns";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const studentIdParam = searchParams.get("studentId");

  let studentId: string;

  if (session.role === "STUDENT") {
    const student = await prisma.student.findUnique({ where: { userId: session.userId } });
    if (!student) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    studentId = student.id;
  } else {
    if (!studentIdParam) return NextResponse.json({ error: "studentId requerido" }, { status: 400 });
    studentId = studentIdParam;
  }

  const docs = await prisma.document.findMany({
    where: { studentId },
    orderBy: { uploadedAt: "desc" },
  });

  return NextResponse.json(docs);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  let studentId: string;

  if (session.role === "STUDENT") {
    const student = await prisma.student.findUnique({ where: { userId: session.userId } });
    if (!student) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    if (student.status !== "ACTIVE") return NextResponse.json({ error: "Cuenta no activa" }, { status: 403 });
    studentId = student.id;
  } else {
    const formData = await req.formData();
    studentId = formData.get("studentId") as string;
    if (!studentId) return NextResponse.json({ error: "studentId requerido" }, { status: 400 });
  }

  const formData = await req.formData();
  const type = formData.get("type") as string;
  const file = formData.get("file") as File | null;
  const notes = formData.get("notes") as string | undefined;

  if (!type || !file) {
    return NextResponse.json({ error: "Tipo y archivo son requeridos" }, { status: 400 });
  }

  const path = await saveFile(file, "documents");

  let expiresAt: Date | undefined;
  if (type === "APTO_FISICO") {
    expiresAt = addYears(new Date(), 1);
  }

  const doc = await prisma.document.create({
    data: {
      studentId,
      type: type as "APTO_FISICO" | "DESLINDE_CONSENTIMIENTO" | "AUTORIZACION_TUTOR" | "OTRO",
      filename: file.name,
      path,
      notes,
      expiresAt,
      status: "PENDING",
    },
  });

  return NextResponse.json(doc, { status: 201 });
}
