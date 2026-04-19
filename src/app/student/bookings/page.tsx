"use client";

import { useEffect, useState } from "react";

interface Booking {
  id: string; status: string; bookedAt: string; cancelledAt: string | null;
  classSession: {
    date: string; status: string;
    classSchedule: { name: string; startTime: string };
  };
}

const STATUS_LABELS: Record<string, string> = {
  RESERVED: "Reservada",
  ATTENDED: "Presente",
  ABSENT: "Ausente",
  CANCELLED_BY_STUDENT: "Cancelada",
  CANCELLED_BY_ADMIN: "Cancelada (admin)",
};
const STATUS_BADGE: Record<string, string> = {
  RESERVED: "badge-green",
  ATTENDED: "badge-blue",
  ABSENT: "badge-red",
  CANCELLED_BY_STUDENT: "badge-gray",
  CANCELLED_BY_ADMIN: "badge-gray",
};

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const load = () => {
    fetch("/api/bookings").then((r) => r.json()).then(setBookings);
  };

  useEffect(load, []);

  const cancel = async (id: string) => {
    if (!confirm("¿Cancelar esta reserva?")) return;
    setLoading(true);
    const res = await fetch(`/api/bookings/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (res.ok) {
      setMessage("Reserva cancelada. El cupo está disponible para esta semana.");
      load();
    } else {
      setMessage(data.error || "No se pudo cancelar");
    }
    setLoading(false);
    setTimeout(() => setMessage(""), 4000);
  };

  const upcoming = bookings.filter((b) => b.status === "RESERVED" && new Date(b.classSession.date) >= new Date());
  const past = bookings.filter((b) => b.status !== "RESERVED" || new Date(b.classSession.date) < new Date());

  return (
    <div className="space-y-6">
      <h1 className="page-title">Mis Reservas</h1>

      {message && (
        <div className={`p-3 rounded-lg text-sm font-medium ${message.includes("Error") || message.includes("No se") || message.includes("podés") ? "bg-red-50 text-red-700 border border-red-200" : "bg-green-50 text-green-700 border border-green-200"}`}>
          {message}
        </div>
      )}

      <div className="card">
        <h2 className="section-title mb-4">Próximas reservas</h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-gray-500">Sin reservas próximas</p>
        ) : (
          <div className="space-y-2">
            {upcoming.map((b) => (
              <div key={b.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 border border-gray-200 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{b.classSession.classSchedule.name}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(b.classSession.date).toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })} · {b.classSession.classSchedule.startTime}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={STATUS_BADGE[b.status]}>{STATUS_LABELS[b.status]}</span>
                  <button
                    onClick={() => cancel(b.id)}
                    disabled={loading}
                    className="btn-danger btn-sm"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h2 className="section-title mb-4">Historial</h2>
        {past.length === 0 ? (
          <p className="text-sm text-gray-500">Sin historial de reservas</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 font-medium text-gray-600">Clase</th>
                  <th className="text-left py-2 font-medium text-gray-600">Fecha</th>
                  <th className="text-left py-2 font-medium text-gray-600">Estado</th>
                </tr>
              </thead>
              <tbody>
                {past.slice(0, 30).map((b) => (
                  <tr key={b.id} className="border-b border-gray-100">
                    <td className="py-2">{b.classSession.classSchedule.name}</td>
                    <td className="py-2 text-gray-500">{new Date(b.classSession.date).toLocaleDateString("es-AR")}</td>
                    <td className="py-2"><span className={STATUS_BADGE[b.status]}>{STATUS_LABELS[b.status]}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
