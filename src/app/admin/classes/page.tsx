import { prisma } from "@/lib/db";
import Link from "next/link";

const DAY_LABELS: Record<string, string> = {
  LUNES: "Lunes", MARTES: "Martes", MIERCOLES: "Miércoles",
  JUEVES: "Jueves", VIERNES: "Viernes", SABADO: "Sábado", DOMINGO: "Domingo",
};
const DAY_ORDER = ["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO", "DOMINGO"];

export default async function ClassesPage() {
  const schedules = await prisma.classSchedule.findMany({
    include: { plans: { include: { plan: { select: { name: true } } } } },
    orderBy: { startTime: "asc" },
  });

  const sorted = [...schedules].sort((a, b) => DAY_ORDER.indexOf(a.dayOfWeek) - DAY_ORDER.indexOf(b.dayOfWeek));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Clases</h1>
        <Link href="/admin/classes/new" className="btn-primary">+ Nueva clase</Link>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sorted.map((s) => (
          <div key={s.id} className={`card ${!s.isActive ? "opacity-60" : ""}`}>
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">{DAY_LABELS[s.dayOfWeek]}</p>
                <h3 className="font-semibold text-gray-900">{s.name}</h3>
              </div>
              {!s.isActive && <span className="badge-gray text-xs">Inactiva</span>}
            </div>
            <div className="text-sm text-gray-600 space-y-1">
              <p>{s.startTime} hs · {s.duration} min</p>
              <p>Cupos: {s.maxCapacity}</p>
              {s.plans.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {s.plans.map((p) => (
                    <span key={p.planId} className="badge-blue">{p.plan.name}</span>
                  ))}
                </div>
              )}
            </div>
            <div className="mt-4">
              <Link href={`/admin/classes/${s.id}`} className="btn-secondary btn-sm w-full text-center">
                Ver / Editar
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
