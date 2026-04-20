"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface Session { id: string; date: string; status: string; startTime: string | null }
interface Plan { id: string; name: string }
interface Schedule {
  id: string; name: string; description: string | null; days: string[]; startTime: string;
  duration: number; maxCapacity: number; isActive: boolean; validFrom: string; validUntil: string | null;
  plans: { planId: string; plan: { name: string } }[];
  sessions: Session[];
}

const ALL_DAYS = ["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO", "DOMINGO"];
const DAY_LABELS: Record<string, string> = {
  LUNES: "Lunes", MARTES: "Martes", MIERCOLES: "Miércoles",
  JUEVES: "Jueves", VIERNES: "Viernes", SABADO: "Sábado", DOMINGO: "Domingo",
};
const DAY_SHORT: Record<string, string> = {
  LUNES: "Lun", MARTES: "Mar", MIERCOLES: "Mié",
  JUEVES: "Jue", VIERNES: "Vie", SABADO: "Sáb", DOMINGO: "Dom",
};

export default function ClassDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [allPlans, setAllPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: "", description: "", days: [] as string[], startTime: "",
    duration: 60, maxCapacity: 15, validUntil: "", planIds: [] as string[],
  });

  const load = () => {
    fetch(`/api/classes/schedules/${id}`)
      .then((r) => r.json())
      .then((s: Schedule) => {
        setSchedule(s);
        setForm({
          name: s.name,
          description: s.description ?? "",
          days: s.days,
          startTime: s.startTime,
          duration: s.duration,
          maxCapacity: s.maxCapacity,
          validUntil: s.validUntil ? s.validUntil.split("T")[0] : "",
          planIds: s.plans.map((p) => p.planId),
        });
      });
  };

  useEffect(() => {
    load();
    fetch("/api/plans").then((r) => r.json()).then(setAllPlans);
  }, [id]);

  const toggleActive = async () => {
    if (!schedule) return;
    setLoading(true);
    await fetch(`/api/classes/schedules/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !schedule.isActive }),
    });
    load();
    setLoading(false);
  };

  const saveEdit = async () => {
    if (form.days.length === 0) return;
    setLoading(true);
    const res = await fetch(`/api/classes/schedules/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        description: form.description || undefined,
        days: form.days,
        startTime: form.startTime,
        duration: form.duration,
        maxCapacity: form.maxCapacity,
        validUntil: form.validUntil || undefined,
        planIds: form.planIds,
      }),
    });
    if (res.ok) { setEditing(false); load(); }
    setLoading(false);
  };

  const deleteSchedule = async () => {
    if (!confirm("¿Eliminar esta clase? Se ocultará permanentemente del sistema. Las sesiones y reservas existentes se conservan.")) return;
    setLoading(true);
    const res = await fetch(`/api/classes/schedules/${id}`, { method: "DELETE" });
    if (res.ok) router.push("/admin/classes");
    setLoading(false);
  };

  const cancelSession = async (sessionId: string) => {
    if (!confirm("¿Cancelar esta sesión puntual?")) return;
    const res = await fetch(`/api/classes/sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "CANCELLED", cancelReason: "Cancelado por administración" }),
    });
    if (res.ok) load();
  };

  const toggleFormDay = (day: string) => {
    setForm((prev) => ({
      ...prev,
      days: prev.days.includes(day) ? prev.days.filter((d) => d !== day) : [...prev.days, day],
    }));
  };

  const toggleFormPlan = (planId: string) => {
    setForm((prev) => ({
      ...prev,
      planIds: prev.planIds.includes(planId) ? prev.planIds.filter((p) => p !== planId) : [...prev.planIds, planId],
    }));
  };

  if (!schedule) return <div className="text-center py-10 text-gray-500">Cargando...</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Link href="/admin/classes" className="text-gray-500 hover:text-gray-700">← Volver</Link>
        <h1 className="page-title">{schedule.name}</h1>
        {!schedule.isActive && <span className="badge-gray">Inactiva</span>}
      </div>

      <div className="card space-y-4">
        {!editing ? (
          <>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-blue-600 font-semibold">{schedule.days.map((d) => DAY_LABELS[d]).join(" · ")}</p>
                {schedule.description && <p className="text-sm text-gray-500 mt-1">{schedule.description}</p>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEditing(true)} className="btn-secondary btn-sm">Editar</button>
                <button onClick={toggleActive} disabled={loading} className={schedule.isActive ? "btn-danger btn-sm" : "btn-success btn-sm"}>
                  {schedule.isActive ? "Desactivar" : "Activar"}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div><p className="text-gray-500">Horario</p><p className="font-medium">{schedule.startTime} hs</p></div>
              <div><p className="text-gray-500">Duración</p><p className="font-medium">{schedule.duration} min</p></div>
              <div><p className="text-gray-500">Cupos</p><p className="font-medium">{schedule.maxCapacity}</p></div>
            </div>
            {schedule.plans.length > 0 && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Planes habilitados:</p>
                <div className="flex flex-wrap gap-1">
                  {schedule.plans.map((p) => <span key={p.planId} className="badge-blue">{p.plan.name}</span>)}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="label">Nombre *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" />
            </div>
            <div>
              <label className="label">Descripción</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input" rows={2} />
            </div>
            <div>
              <label className="label">Días *</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {ALL_DAYS.map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleFormDay(day)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                      form.days.includes(day)
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-700 border-gray-300 hover:border-blue-400"
                    }`}
                  >
                    {DAY_SHORT[day]}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="label">Horario *</label>
                <input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} className="input" />
              </div>
              <div>
                <label className="label">Duración (min) *</label>
                <input type="number" min={15} value={form.duration} onChange={(e) => setForm({ ...form, duration: parseInt(e.target.value) })} className="input" />
              </div>
              <div>
                <label className="label">Cupos *</label>
                <input type="number" min={1} value={form.maxCapacity} onChange={(e) => setForm({ ...form, maxCapacity: parseInt(e.target.value) })} className="input" />
              </div>
            </div>
            <div>
              <label className="label">Válida hasta (opcional)</label>
              <input type="date" value={form.validUntil} onChange={(e) => setForm({ ...form, validUntil: e.target.value })} className="input" />
            </div>
            <div>
              <label className="label">Planes habilitados (sin selección = todos)</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {allPlans.map((plan) => (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => toggleFormPlan(plan.id)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                      form.planIds.includes(plan.id)
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
              <button onClick={() => setEditing(false)} className="btn-secondary">Cancelar</button>
              <button onClick={saveEdit} disabled={loading || form.days.length === 0} className="btn-primary">
                {loading ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <h2 className="section-title mb-4">Sesiones recientes</h2>
        {schedule.sessions.length === 0 ? (
          <p className="text-sm text-gray-500">Sin sesiones registradas aún</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 font-medium text-gray-600">Fecha</th>
                <th className="text-left py-2 font-medium text-gray-600">Horario</th>
                <th className="text-left py-2 font-medium text-gray-600">Estado</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {schedule.sessions.map((s) => (
                <tr key={s.id} className="border-b border-gray-100">
                  <td className="py-2">{new Date(s.date).toLocaleDateString("es-AR")}</td>
                  <td className="py-2">{s.startTime || schedule.startTime}</td>
                  <td className="py-2">
                    <span className={s.status === "ACTIVE" ? "badge-green" : s.status === "CANCELLED" ? "badge-red" : "badge-yellow"}>
                      {s.status === "ACTIVE" ? "Activa" : s.status === "CANCELLED" ? "Cancelada" : "Modificada"}
                    </span>
                  </td>
                  <td className="py-2 text-right">
                    {s.status === "ACTIVE" && (
                      <button onClick={() => cancelSession(s.id)} className="btn-danger btn-sm">Cancelar</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card border border-red-200">
        <h2 className="section-title text-red-700 mb-1">Zona de peligro</h2>
        <p className="text-sm text-gray-500 mb-3">
          Eliminar la clase la oculta permanentemente del sistema (baja lógica). Las sesiones y reservas históricas se conservan.
        </p>
        <button onClick={deleteSchedule} disabled={loading} className="btn-danger btn-sm">
          Eliminar clase
        </button>
      </div>
    </div>
  );
}
