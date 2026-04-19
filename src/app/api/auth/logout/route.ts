import { NextResponse } from "next/server";
import { clearAuthCookie } from "@/lib/auth";

export async function POST() {
  const cookie = clearAuthCookie();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(cookie);
  return response;
}
