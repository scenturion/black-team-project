import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const configs = await prisma.systemConfig.findMany({ orderBy: { key: "asc" } });
  return NextResponse.json(configs);
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json() as Record<string, string>;

  const updates = await Promise.all(
    Object.entries(body).map(([key, value]) =>
      prisma.systemConfig.upsert({
        where: { key },
        update: { value, updatedById: session.userId },
        create: { key, value, updatedById: session.userId },
      })
    )
  );

  return NextResponse.json(updates);
}
