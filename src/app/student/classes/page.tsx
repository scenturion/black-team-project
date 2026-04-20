"use client";

import { useEffect, useState } from "react";
import { format, addDays, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";

interface Session {
  id: string; date: string; status: string;
  effectiveStartTime: string; effectiveDuration: number; effectiveMaxCapacity: number;
  classSchedule: { name: string; description: string | null; plans: { plan: { name: string } }[] };
  _count: { bookings: number };
  userBooking?: { id: string; status: string } | null;
}

export default function StudentClassesPage() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [bookingLoading, setBookingLoading] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const load = async () => {
    setLoading(true);
    const res = await fetch(`/api/classes/sessions?week=${format(weekStart, "yyyy-MM-dd")}`);
    const data = await res.json();
    setSessions(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [weekStart]);

  const book = async (sessionId: string) => {
    setBookingLoading(sessionId);
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classSessionId: sessionId }),
    });
    const data = await res.json();
    if (res.ok) {
      setMessage("Reserva confirmada");
      load();
    } else {
      setMessage(data.error || "Error al reservar");
    }
    setBookingLoading(null);
    setTimeout(() => setMessage(""), 3000);
  };

  const cancel = async (bookingId: string) => {
    if (!confirm("¿Cancelar esta reserva?")) return;
    setBookingLoading(bookingId);
    const res = await fetch(`/api/bookings/${bookingId}`, { method: "DELETE" });
    const data = await res.json();
    if (res.ok) {
      setMessage("Reserva cancelada. El cupo quedó disponible para esta semana.");
      load();
    } else {
      setMessage(data.error || "No se pudo cancelar");
    }
    setBookingLoading(null);
    setTimeout(() => setMessage(""), 4000);
  };

  const activeSessions = sessions.filter((s) => s.status === "ACTIVE");

  return (
    <div className="space-y-6">
      <h1 className="page-title">Clases disponibles</h1>

      {message && (
        <div className={`p-3 rounded-lg text-sm font-medium ${message.includes("Error") || message.includes("No se") || message.includes("podés") ? "bg-red-50 text-red-700 border border-red-200" : "bg-green-50 text-green-700 border border-green-200"}`}>
          {message}
        </div>
      )}

      <div className="flex items-center gap-4">
        <button onClick={() => setWeekStart(addDays(weekStart, -7))} className="btn-secondary btn-sm">← Anterior</button>
        <span className="text-sm font-medium text-gray-700">
          {format(weekStart, "d MMM", { locale: es })} – {format(addDays(weekStart, 6), "d MMM yyyy", { locale: es })}
        </span>
        <button onClick={() => setWeekStart(addDays(weekStart, 7))} className="btn-secondary btn-sm">Siguiente →</button>
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-500">Cargando clases...</div>
      ) : activeSessions.length === 0 ? (
        <div className="card text-center py-10 text-gray-500">Sin clases disponibles esta semana</div>
      ) : (
        <div className="space-y-3">
          {activeSessions.map((s) => {
            const available = s.effectiveMaxCapacity - s._count.bookings;
            const isBooked = s.userBooking?.status === "RESERVED";
            const isFull = available <= 0 && !isBooked;

            return (
              <div key={s.id} className={`card flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${isFull ? "opacity-60" : ""}`}>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-900">{s.classSchedule.name}</p>
                    {isBooked && <span className="badge-green text-xs">Reservada</span>}
                    {isFull && <span className="badge-gray text-xs">Sin cupos</span>}
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {new Date(s.date).toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })} · {s.effectiveStartTime} hs · {s.effectiveDuration} min
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {available > 0 ? `${available} cupo${available !== 1 ? "s" : ""} disponible${available !== 1 ? "s" : ""}` : "Sin cupos"}
                  </p>
                  {s.classSchedule.plans.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {s.classSchedule.plans.map((p, i) => <span key={i} className="badge-blue text-xs">{p.plan.name}</span>)}
                    </div>
                  )}
                </div>
                <div className="shrink-0">
                  {isBooked ? (
                    <button
                      onClick={() => cancel(s.userBooking!.id)}
                      disabled={bookingLoading === s.userBooking!.id}
                      className="btn-danger btn-sm"
                    >
                      {bookingLoading === s.userBooking!.id ? "..." : "Cancelar"}
                    </button>
                  ) : (
                    <button
                      onClick={() => book(s.id)}
                      disabled={isFull || bookingLoading === s.id}
                      className="btn-primary btn-sm"
                    >
                      {bookingLoading === s.id ? "..." : "Reservar"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
