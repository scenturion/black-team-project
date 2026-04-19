import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  if (session.role === "STUDENT") {
    const student = await prisma.student.findUnique({ where: { userId: session.userId } });
    if (!student || student.id !== id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
  }

  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      user: { select: { email: true, id: true } },
      guardian: true,
      plans: {
        include: { plan: true, assignedBy: { select: { email: true } } },
        orderBy: { createdAt: "desc" },
      },
      payments: { orderBy: { createdAt: "desc" }, take: 10 },
      documents: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!student) return NextResponse.json({ error: "Alumno no encontrado" }, { status: 404 });
  return NextResponse.json(student);
}

const adminUpdateSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  birthDate: z.string().optional(),
  sex: z.enum(["MASCULINO", "FEMENINO", "OTRO"]).optional(),
  phone: z.string().nullable().optional(),
  dni: z.string().nullable().optional(),
  belt: z.string().optional(),
  beltGrade: z.number().min(0).max(10).optional(),
  weight: z.number().nullable().optional(),
  medicalNotes: z.string().nullable().optional(),
  allergiesAndInjuries: z.string().nullable().optional(),
  emergencyContactName: z.string().min(1).optional(),
  emergencyContactPhone: z.string().min(1).optional(),
  status: z.enum(["PENDING_APPROVAL", "ACTIVE", "INACTIVE"]).optional(),
  guardian: z
    .object({
      firstName: z.string().min(1),
      lastName: z.string().min(1),
      phone: z.string().min(1),
      email: z.string().email().nullable().optional(),
      relationship: z.string().min(1),
    })
    .nullable()
    .optional(),
});

const studentUpdateSchema = z.object({
  phone: z.string().nullable().optional(),
  weight: z.number().nullable().optional(),
  medicalNotes: z.string().nullable().optional(),
  allergiesAndInjuries: z.string().nullable().optional(),
  emergencyContactName: z.string().min(1).optional(),
  emergencyContactPhone: z.string().min(1).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  if (session.role === "STUDENT") {
    const ownStudent = await prisma.student.findUnique({ where: { userId: session.userId } });
    if (!ownStudent || ownStudent.id !== id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
    const body = await req.json();
    const parsed = studentUpdateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    const updated = await prisma.student.update({ where: { id }, data: parsed.data });
    return NextResponse.json(updated);
  }

  const body = await req.json();
  const parsed = adminUpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });

  const { email, password, guardian, birthDate, ...studentFields } = parsed.data;

  const before = await prisma.student.findUnique({ where: { id }, include: { user: true, guardian: true } });
  if (!before) return NextResponse.json({ error: "Alumno no encontrado" }, { status: 404 });

  const studentData: Record<string, unknown> = { ...studentFields };
  if (birthDate) studentData.birthDate = new Date(birthDate);

  const updated = await prisma.student.update({ where: { id }, data: studentData });

  if (email || password) {
    const userUpdate: Record<string, string> = {};
    if (email) userUpdate.email = email;
    if (password) userUpdate.password = await bcrypt.hash(password, 12);
    await prisma.user.update({ where: { id: before.userId }, data: userUpdate });
  }

  if (guardian !== undefined) {
    if (guardian === null) {
      await prisma.guardian.deleteMany({ where: { studentId: id } });
    } else {
      await prisma.guardian.upsert({
        where: { studentId: id },
        create: { ...guardian, studentId: id },
        update: guardian,
      });
    }
  }

  await createAuditLog(session.userId, "UPDATE_STUDENT", "Student", id, before, updated);

  return NextResponse.json(updated);
}
