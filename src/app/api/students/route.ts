import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { isMinor } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const search = searchParams.get("search");

  const students = await prisma.student.findMany({
    where: {
      ...(status ? { status: status as "PENDING_APPROVAL" | "ACTIVE" | "INACTIVE" } : {}),
      ...(search
        ? {
            OR: [
              { firstName: { contains: search, mode: "insensitive" } },
              { lastName: { contains: search, mode: "insensitive" } },
              { user: { email: { contains: search, mode: "insensitive" } } },
              { dni: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      user: { select: { email: true } },
      plans: {
        where: { isActive: true },
        include: { plan: { select: { name: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(students);
}

const createSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  birthDate: z.string(),
  sex: z.enum(["MASCULINO", "FEMENINO", "OTRO"]),
  phone: z.string().optional(),
  dni: z.string().optional(),
  emergencyContactName: z.string().min(1),
  emergencyContactPhone: z.string().min(1),
  medicalNotes: z.string().optional(),
  allergiesAndInjuries: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const { email, password, ...studentData } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "El email ya está registrado" }, { status: 409 });
  }

  const birthDate = new Date(studentData.birthDate);
  const hashed = await bcrypt.hash(password, 12);

  const newUser = await prisma.user.create({
    data: { email, password: hashed, role: Role.STUDENT },
  });

  const student = await prisma.student.create({
    data: {
      userId: newUser.id,
      firstName: studentData.firstName,
      lastName: studentData.lastName,
      birthDate,
      sex: studentData.sex,
      phone: studentData.phone,
      dni: studentData.dni,
      emergencyContactName: studentData.emergencyContactName,
      emergencyContactPhone: studentData.emergencyContactPhone,
      medicalNotes: studentData.medicalNotes,
      allergiesAndInjuries: studentData.allergiesAndInjuries,
      isMinor: isMinor(birthDate),
      status: "ACTIVE",
      approvedById: session.userId,
      approvedAt: new Date(),
    },
    include: { user: { select: { email: true } } },
  });

  return NextResponse.json(student, { status: 201 });
}
