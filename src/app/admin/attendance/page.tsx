"use client";

import { useEffect, useState } from "react";
import { format, addDays, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";

interface Session {
  id: string; date: string; status: string;
  effectiveStartTime: string;
  classSchedule: { name: string };
  _count: { bookings: number };
}

interface BookingRecord {
  id: string; status: string;
  student: { id: string; firstName: string; lastName: string };
}

interface AttendanceRecord {
  studentId: string; present: boolean;
}

export default function AttendancePage() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const weekStr = format(weekStart, "yyyy-MM-dd");
    fetch(`/api/classes/sessions?week=${weekStr}`).then((r) => r.json()).then(setSessions);
    setSelectedSession(null);
  }, [weekStart]);

  const loadSession = async (session: Session) => {
    setSelectedSession(session);
    const [bookingsRes, attendanceRes] = await Promise.all([
      fetch(`/api/classes/sessions/${session.id}`).then((r) => r.json()),
      fetch(`/api/attendance?classSessionId=${session.id}`).then((r) => r.json()),
    ]);
    setBookings(bookingsRes.bookings || []);
    const existing: Record<string, boolean> = {};
    for (const a of (attendanceRes as AttendanceRecord[])) {
      existing[a.studentId] = a.present;
    }
    setAttendance(existing);
  };

  const saveAttendance = async () => {
    if (!selectedSession) return;
    setSaving(true);
    const records = bookings.map((b) => ({
      studentId: b.student.id,
      present: attendance[b.student.id] ?? false,
    }));
    await fetch("/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classSessionId: selectedSession.id, records }),
    });
    setSaving(false);
    alert("Asistencia guardada");
  };

  return (
    <div className="space-y-6">
      <h1 className="page-title">Asistencia</h1>

      <div className="flex items-center gap-4">
        <button onClick={() => setWeekStart(addDays(weekStart, -7))} className="btn-secondary btn-sm">← Semana anterior</button>
        <span className="text-sm font-medium text-gray-700">
          {format(weekStart, "d MMM", { locale: es })} – {format(addDays(weekStart, 6), "d MMM yyyy", { locale: es })}
        </span>
        <button onClick={() => setWeekStart(addDays(weekStart, 7))} className="btn-secondary btn-sm">Siguiente semana →</button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="card">
          <h2 className="section-title mb-3">Clases de la semana</h2>
          {sessions.length === 0 ? (
            <p className="text-sm text-gray-500">Sin clases esta semana</p>
          ) : (
            <div className="space-y-2">
              {sessions.filter((s) => s.status === "ACTIVE").map((s) => (
                <button
                  key={s.id}
                  onClick={() => loadSession(s)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedSession?.id === s.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <p className="text-sm font-medium text-gray-900">{s.classSchedule.name}</p>
                  <p className="text-xs text-gray-500">{new Date(s.date).toLocaleDateString("es-AR", { timeZone: "UTC" })} · {s.effectiveStartTime}</p>
                  <p className="text-xs text-gray-400">{s._count.bookings} reserva(s)</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedSession && (
          <div className="md:col-span-2 card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="section-title">{selectedSession.classSchedule.name}</h2>
                <p className="text-sm text-gray-500">{new Date(selectedSession.date).toLocaleDateString("es-AR", { timeZone: "UTC" })} · {selectedSession.effectiveStartTime}</p>
              </div>
              <button onClick={saveAttendance} disabled={saving} className="btn-primary">
                {saving ? "Guardando..." : "Guardar asistencia"}
              </button>
            </div>

            {bookings.length === 0 ? (
              <p className="text-sm text-gray-500">Sin reservas para esta clase</p>
            ) : (
              <div className="space-y-2">
                {bookings.map((b) => (
                  <div key={b.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <span className="text-sm font-medium text-gray-900">{b.student.firstName} {b.student.lastName}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setAttendance((prev) => ({ ...prev, [b.student.id]: true }))}
                        className={`btn-sm ${attendance[b.student.id] === true ? "btn-success" : "btn-secondary"}`}
                      >
                        Presente
                      </button>
                      <button
                        onClick={() => setAttendance((prev) => ({ ...prev, [b.student.id]: false }))}
                        className={`btn-sm ${attendance[b.student.id] === false ? "btn-danger" : "btn-secondary"}`}
                      >
                        Ausente
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
