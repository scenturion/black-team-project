import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const plans = await prisma.plan.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json(plans);
}

const schema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  monthlyPrice: z.number().min(0),
  classesPerWeek: z.number().int().min(1).nullable().optional(),
  allowsFreeBooking: z.boolean().optional(),
  allowsReplacement: z.boolean().optional(),
  allowsFixedGroup: z.boolean().optional(),
  maxActiveBookings: z.number().int().nullable().optional(),
  isActive: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  const plan = await prisma.plan.create({ data: parsed.data });
  return NextResponse.json(plan, { status: 201 });
}
