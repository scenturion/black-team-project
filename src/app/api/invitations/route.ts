import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const invitation = await prisma.invitation.create({
    data: {
      createdById: session.userId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
  const url = `${baseUrl}/register?token=${invitation.token}`;

  return NextResponse.json({ url, token: invitation.token, expiresAt: invitation.expiresAt }, { status: 201 });
}

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const invitations = await prisma.invitation.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { createdBy: { select: { email: true } } },
  });

  return NextResponse.json(invitations);
}
