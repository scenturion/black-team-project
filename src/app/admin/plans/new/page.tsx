"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewPlanPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [unlimited, setUnlimited] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: fd.get("name"),
        description: fd.get("description"),
        monthlyPrice: parseFloat(fd.get("monthlyPrice") as string),
        classesPerWeek: unlimited ? null : parseInt(fd.get("classesPerWeek") as string),
        allowsFreeBooking: fd.get("allowsFreeBooking") === "on",
        allowsReplacement: fd.get("allowsReplacement") === "on",
        allowsFixedGroup: fd.get("allowsFixedGroup") === "on",
        maxActiveBookings: unlimited ? null : parseInt(fd.get("classesPerWeek") as string),
      }),
    });

    if (res.ok) {
      router.push("/admin/plans");
    } else {
      const err = await res.json();
      setError(err.error || "Error al crear el plan");
    }
    setLoading(false);
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/plans" className="text-gray-500 hover:text-gray-700">← Volver</Link>
        <h1 className="page-title">Nuevo plan</h1>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-4">
        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

        <div>
          <label className="label">Nombre *</label>
          <input name="name" required className="input" placeholder="Plan Libre" />
        </div>
        <div>
          <label className="label">Descripción</label>
          <textarea name="description" className="input" rows={2} />
        </div>
        <div>
          <label className="label">Precio mensual (ARS) *</label>
          <input name="monthlyPrice" type="number" required min={0} className="input" />
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <input type="checkbox" checked={unlimited} onChange={(e) => setUnlimited(e.target.checked)} className="rounded" />
            Clases ilimitadas por semana
          </label>
        </div>

        {!unlimited && (
          <div>
            <label className="label">Clases por semana</label>
            <input name="classesPerWeek" type="number" min={1} max={7} defaultValue={2} className="input" />
          </div>
        )}

        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">Permisos del plan</p>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" name="allowsFreeBooking" defaultChecked className="rounded" />
            Permite reserva libre
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" name="allowsReplacement" defaultChecked className="rounded" />
            Permite reemplazos (reprogramación)
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" name="allowsFixedGroup" className="rounded" />
            Permite grupo fijo
          </label>
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <Link href="/admin/plans" className="btn-secondary">Cancelar</Link>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? "Creando..." : "Crear plan"}
          </button>
        </div>
      </form>
    </div>
  );
}
