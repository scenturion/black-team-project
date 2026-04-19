"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface Session { id: string; date: string; status: string; startTime: string | null; _count?: { bookings: number } }
interface Schedule {
  id: string; name: string; description: string | null; dayOfWeek: string; startTime: string;
  duration: number; maxCapacity: number; isActive: boolean; validFrom: string; validUntil: string | null;
  plans: { planId: string; plan: { name: string } }[];
  sessions: Session[];
}

const DAY_LABELS: Record<string, string> = {
  LUNES: "Lunes", MARTES: "Martes", MIERCOLES: "Miércoles",
  JUEVES: "Jueves", VIERNES: "Viernes", SABADO: "Sábado", DOMINGO: "Domingo",
};

export default function ClassDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [loading, setLoading] = useState(false);

  const load = () => {
    fetch(`/api/classes/schedules/${id}`).then((r) => r.json()).then(setSchedule);
  };

  useEffect(load, [id]);

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

  const cancelSession = async (sessionId: string) => {
    if (!confirm("¿Cancelar esta sesión puntual?")) return;
    const res = await fetch(`/api/classes/sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "CANCELLED", cancelReason: "Cancelado por administración" }),
    });
    if (res.ok) load();
  };

  if (!schedule) return <div className="text-center py-10 text-gray-500">Cargando...</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Link href="/admin/classes" className="text-gray-500 hover:text-gray-700">← Volver</Link>
        <h1 className="page-title">{schedule.name}</h1>
        {!schedule.isActive && <span className="badge-gray">Inactiva</span>}
      </div>

      <div className="card space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-blue-600 font-semibold">{DAY_LABELS[schedule.dayOfWeek]}</p>
            {schedule.description && <p className="text-sm text-gray-500 mt-1">{schedule.description}</p>}
          </div>
          <button onClick={toggleActive} disabled={loading} className={schedule.isActive ? "btn-danger btn-sm" : "btn-success btn-sm"}>
            {schedule.isActive ? "Desactivar" : "Activar"}
          </button>
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
    </div>
  );
}
