"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: fd.get("email"), password: fd.get("password") }),
    });

    if (res.ok) {
      const data = await res.json();
      router.push(data.role === "ADMIN" ? "/admin/dashboard" : "/student/dashboard");
      router.refresh();
    } else {
      const err = await res.json();
      setError(err.error || "Error al iniciar sesión");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left — background image, desktop only */}
      <div className="hidden lg:block lg:w-1/2 relative">
        <Image src="/login-bg.jpg" alt="" fill className="object-cover" priority />
        <div className="absolute inset-0 bg-black/40" />
      </div>

      {/* Right — form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-white px-8 py-12">
        <div className="w-full max-w-md space-y-8">
          <div className="flex flex-col items-center gap-4">
            <img src="/logo-horizontal-claro.svg" alt="BJJ Administrator" width={220} height={44} />
            <p className="text-gray-500">Ingresá a tu cuenta</p>
          </div>

          <div className="card">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
              )}
              <div>
                <label className="label">Email</label>
                <input name="email" type="email" required autoComplete="email" className="input" placeholder="tu@email.com" />
              </div>
              <div>
                <label className="label">Contraseña</label>
                <input name="password" type="password" required autoComplete="current-password" className="input" placeholder="••••••••" />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? "Ingresando..." : "Ingresar"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
