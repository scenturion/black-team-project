"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface Plan {
  id: string;
  name: string;
  description: string | null;
  monthlyPrice: number;
  classesPerWeek: number | null;
  allowsFreeBooking: boolean;
  allowsReplacement: boolean;
  allowsFixedGroup: boolean;
  isActive: boolean;
}

export default function EditPlanPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [unlimited, setUnlimited] = useState(false);

  useEffect(() => {
    fetch(`/api/plans/${id}`).then((r) => r.json()).then((p) => {
      setPlan(p);
      setUnlimited(p.classesPerWeek === null);
    });
  }, [id]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const fd = new FormData(e.currentTarget);
    const res = await fetch(`/api/plans/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: fd.get("name"),
        description: fd.get("description"),
        monthlyPrice: parseFloat(fd.get("monthlyPrice") as string),
        classesPerWeek: unlimited ? null : parseInt(fd.get("classesPerWeek") as string),
        allowsFreeBooking: fd.get("allowsFreeBooking") === "on",
        allowsReplacement: fd.get("allowsReplacement") === "on",
        allowsFixedGroup: fd.get("allowsFixedGroup") === "on",
      }),
    });

    if (res.ok) router.push("/admin/plans");
    else {
      const err = await res.json();
      setError(err.error || "Error al guardar");
    }
    setLoading(false);
  };

  if (!plan) return <div className="text-center py-10 text-gray-500">Cargando...</div>;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/plans" className="text-gray-500 hover:text-gray-700">← Volver</Link>
        <h1 className="page-title">Editar plan</h1>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-4">
        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

        <div>
          <label className="label">Nombre *</label>
          <input name="name" required defaultValue={plan.name} className="input" />
        </div>
        <div>
          <label className="label">Descripción</label>
          <textarea name="description" defaultValue={plan.description || ""} className="input" rows={2} />
        </div>
        <div>
          <label className="label">Precio mensual (ARS) *</label>
          <input name="monthlyPrice" type="number" required defaultValue={plan.monthlyPrice} className="input" />
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
            <input name="classesPerWeek" type="number" min={1} max={7} defaultValue={plan.classesPerWeek || 2} className="input" />
          </div>
        )}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" name="allowsFreeBooking" defaultChecked={plan.allowsFreeBooking} className="rounded" />
            Permite reserva libre
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" name="allowsReplacement" defaultChecked={plan.allowsReplacement} className="rounded" />
            Permite reemplazos
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" name="allowsFixedGroup" defaultChecked={plan.allowsFixedGroup} className="rounded" />
            Permite grupo fijo
          </label>
        </div>
        <div className="flex gap-2 justify-end pt-2">
          <Link href="/admin/plans" className="btn-secondary">Cancelar</Link>
          <button type="submit" disabled={loading} className="btn-primary">{loading ? "Guardando..." : "Guardar cambios"}</button>
        </div>
      </form>
    </div>
  );
}
