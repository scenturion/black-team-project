import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      role: true,
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          dni: true,
          belt: true,
          beltGrade: true,
          beltLockedByAdmin: true,
          weight: true,
          medicalNotes: true,
          allergiesAndInjuries: true,
          emergencyContactName: true,
          emergencyContactPhone: true,
          termsAcceptedAt: true,
          isMinor: true,
          status: true,
          user: { select: { email: true } },
        },
      },
    },
  });

  if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  return NextResponse.json(user);
}
