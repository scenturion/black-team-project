"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Plan { id: string; name: string }

const ALL_DAYS = ["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO", "DOMINGO"] as const;
const DAY_LABELS: Record<string, string> = {
  LUNES: "Lun", MARTES: "Mar", MIERCOLES: "Mié",
  JUEVES: "Jue", VIERNES: "Vie", SABADO: "Sáb", DOMINGO: "Dom",
};

export default function NewClassPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlans, setSelectedPlans] = useState<string[]>([]);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/plans").then((r) => r.json()).then(setPlans);
  }, []);

  const togglePlan = (id: string) => {
    setSelectedPlans((prev) => prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]);
  };

  const toggleDay = (day: string) => {
    setSelectedDays((prev) => prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (selectedDays.length === 0) { setError("Seleccioná al menos un día"); return; }
    setLoading(true);
    setError("");

    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/classes/schedules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: fd.get("name"),
        description: fd.get("description"),
        days: selectedDays,
        startTime: fd.get("startTime"),
        duration: parseInt(fd.get("duration") as string),
        maxCapacity: parseInt(fd.get("maxCapacity") as string),
        validFrom: fd.get("validFrom"),
        validUntil: fd.get("validUntil") || undefined,
        planIds: selectedPlans,
      }),
    });

    if (res.ok) router.push("/admin/classes");
    else {
      const err = await res.json();
      setError(err.error || "Error al crear la clase");
    }
    setLoading(false);
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/classes" className="text-gray-500 hover:text-gray-700">← Volver</Link>
        <h1 className="page-title">Nueva clase</h1>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-4">
        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

        <div>
          <label className="label">Nombre *</label>
          <input name="name" required className="input" placeholder="BJJ General" />
        </div>
        <div>
          <label className="label">Descripción</label>
          <textarea name="description" className="input" rows={2} />
        </div>
        <div>
          <label className="label">Días de la semana *</label>
          <div className="flex flex-wrap gap-2 mt-1">
            {ALL_DAYS.map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  selectedDays.includes(day)
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 border-gray-300 hover:border-blue-400"
                }`}
              >
                {DAY_LABELS[day]}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Horario *</label>
            <input name="startTime" type="time" required className="input" />
          </div>
          <div>
            <label className="label">Duración (minutos) *</label>
            <input name="duration" type="number" required min={15} defaultValue={60} className="input" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Cupos máximos *</label>
            <input name="maxCapacity" type="number" required min={1} defaultValue={15} className="input" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Válida desde *</label>
            <input name="validFrom" type="date" required className="input" defaultValue={new Date().toISOString().split("T")[0]} />
          </div>
          <div>
            <label className="label">Válida hasta (opcional)</label>
            <input name="validUntil" type="date" className="input" />
          </div>
        </div>
        <div>
          <label className="label">Planes habilitados (sin selección = todos)</label>
          <div className="flex flex-wrap gap-2 mt-1">
            {plans.filter((p) => p).map((plan) => (
              <button
                key={plan.id}
                type="button"
                onClick={() => togglePlan(plan.id)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  selectedPlans.includes(plan.id)
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 border-gray-300 hover:border-blue-400"
                }`}
              >
                {plan.name}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2 justify-end pt-2">
          <Link href="/admin/classes" className="btn-secondary">Cancelar</Link>
          <button type="submit" disabled={loading} className="btn-primary">{loading ? "Creando..." : "Crear clase"}</button>
        </div>
      </form>
    </div>
  );
}
