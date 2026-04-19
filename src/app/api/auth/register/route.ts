import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { signToken, createAuthCookie } from "@/lib/auth";
import { isMinor } from "@/lib/utils";

const schema = z.object({
  token: z.string(),
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
  guardian: z
    .object({
      firstName: z.string().min(1),
      lastName: z.string().min(1),
      phone: z.string().min(1),
      email: z.string().email().optional(),
      relationship: z.string().min(1),
    })
    .optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const { token, email, password, guardian, ...studentData } = parsed.data;

  const invitation = await prisma.invitation.findUnique({ where: { token } });
  if (!invitation || invitation.used) {
    return NextResponse.json({ error: "Invitación inválida o ya utilizada" }, { status: 400 });
  }
  if (invitation.expiresAt && invitation.expiresAt < new Date()) {
    return NextResponse.json({ error: "La invitación ha expirado" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "El email ya está registrado" }, { status: 409 });
  }

  const birthDate = new Date(studentData.birthDate);
  const minor = isMinor(birthDate);

  if (minor && !guardian) {
    return NextResponse.json({ error: "Los menores de edad requieren datos del responsable legal" }, { status: 400 });
  }

  const hashed = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      email,
      password: hashed,
      role: "STUDENT",
      student: {
        create: {
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
          isMinor: minor,
          guardian: guardian
            ? {
                create: {
                  firstName: guardian.firstName,
                  lastName: guardian.lastName,
                  phone: guardian.phone,
                  email: guardian.email,
                  relationship: guardian.relationship,
                },
              }
            : undefined,
        },
      },
    },
  });

  await prisma.invitation.update({
    where: { id: invitation.id },
    data: { used: true, usedAt: new Date() },
  });

  const authToken = signToken({ userId: user.id, role: user.role, email: user.email });
  const cookie = createAuthCookie(authToken);

  const response = NextResponse.json({ userId: user.id, role: user.role }, { status: 201 });
  response.cookies.set(cookie);
  return response;
}
