import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { beltLabel, docTypeLabel, formatPeriod } from "@/lib/utils";
import StudentActions from "./StudentActions";

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      user: { select: { email: true } },
      guardian: true,
      plans: {
        include: { plan: true, assignedBy: { select: { email: true } } },
        orderBy: { createdAt: "desc" },
      },
      payments: { orderBy: { submittedAt: "desc" }, take: 10 },
      documents: { orderBy: { uploadedAt: "desc" } },
      attendances: {
        include: { classSession: { include: { classSchedule: { select: { name: true } } } } },
        orderBy: { classSession: { date: "desc" } },
        take: 20,
      },
    },
  });

  if (!student) notFound();

  const allPlans = await prisma.plan.findMany({ where: { isActive: true } });

  const beltConfig = await prisma.systemConfig.findUnique({ where: { key: "belt_options" } });
  const beltOptions: string[] = beltConfig ? JSON.parse(beltConfig.value) : ["BLANCO", "AZUL", "VIOLETA", "MARRON", "NEGRO"];

  const STATUS_MAP: Record<string, string> = { PENDING_APPROVAL: "Pendiente", ACTIVE: "Activo", INACTIVE: "Inactivo" };
  const BADGE_MAP: Record<string, string> = { PENDING_APPROVAL: "badge-yellow", ACTIVE: "badge-green", INACTIVE: "badge-gray" };
  const DOC_STATUS: Record<string, string> = { PENDING: "badge-yellow", APPROVED: "badge-green", EXPIRED: "badge-red" };
  const PAYMENT_STATUS: Record<string, string> = { PENDING: "badge-yellow", APPROVED: "badge-green", REJECTED: "badge-red" };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/students" className="text-gray-500 hover:text-gray-700">← Volver</Link>
        <h1 className="page-title">{student.firstName} {student.lastName}</h1>
        <span className={BADGE_MAP[student.status]}>{STATUS_MAP[student.status]}</span>
      </div>

      <StudentActions
        student={{ ...student, birthDate: student.birthDate.toISOString() }}
        allPlans={allPlans}
        beltOptions={beltOptions}
      />

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="section-title mb-4">Datos personales</h2>
          <dl className="space-y-2 text-sm">
            <DataRow label="Email" value={student.user.email} />
            <DataRow label="Nacimiento" value={student.birthDate.toLocaleDateString("es-AR")} />
            <DataRow label="Sexo" value={student.sex} />
            <DataRow label="DNI" value={student.dni} />
            <DataRow label="Teléfono" value={student.phone} />
            <DataRow label="Peso" value={student.weight ? `${student.weight} kg` : undefined} />
            <DataRow label="Cinturón" value={`${beltLabel(student.belt)}${student.beltGrade > 0 ? ` G${student.beltGrade}` : ""}`} />
            {student.medicalNotes && <DataRow label="Observaciones médicas" value={student.medicalNotes} />}
            {student.allergiesAndInjuries && <DataRow label="Alergias/Lesiones" value={student.allergiesAndInjuries} />}
            <DataRow label="Contacto emergencia" value={`${student.emergencyContactName} (${student.emergencyContactPhone})`} />
          </dl>
        </div>

        {student.guardian && (
          <div className="card">
            <h2 className="section-title mb-4">Responsable legal</h2>
            <dl className="space-y-2 text-sm">
              <DataRow label="Nombre" value={`${student.guardian.firstName} ${student.guardian.lastName}`} />
              <DataRow label="Relación" value={student.guardian.relationship} />
              <DataRow label="Teléfono" value={student.guardian.phone} />
              <DataRow label="Email" value={student.guardian.email} />
            </dl>
          </div>
        )}

        <div className="card">
          <h2 className="section-title mb-4">Plan actual</h2>
          {student.plans.filter((p) => p.isActive).length > 0 ? (
            student.plans.filter((p) => p.isActive).map((sp) => (
              <div key={sp.id} className="text-sm space-y-1">
                <p className="font-medium text-gray-900">{sp.plan.name}</p>
                <p className="text-gray-500">Desde: {sp.startDate.toLocaleDateString("es-AR")}</p>
                {sp.endDate && <p className="text-gray-500">Hasta: {sp.endDate.toLocaleDateString("es-AR")}</p>}
                <p className="text-gray-500">Asignado por: {sp.assignedBy.email}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500">Sin plan activo</p>
          )}
        </div>

        <div className="card">
          <h2 className="section-title mb-3">Documentos</h2>
          {student.documents.length === 0 ? (
            <p className="text-sm text-gray-500">Sin documentos</p>
          ) : (
            <div className="space-y-2">
              {student.documents.map((d) => (
                <div key={d.id} className="flex items-center justify-between text-sm py-1">
                  <div>
                    <span className="font-medium">{docTypeLabel(d.type)}</span>
                    {d.expiresAt && (
                      <span className="text-gray-500 ml-2 text-xs">Vence: {d.expiresAt.toLocaleDateString("es-AR")}</span>
                    )}
                  </div>
                  <span className={DOC_STATUS[d.status]}>{d.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <h2 className="section-title mb-4">Historial de pagos</h2>
        {student.payments.length === 0 ? (
          <p className="text-sm text-gray-500">Sin pagos registrados</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 font-medium text-gray-600">Período</th>
                <th className="text-left py-2 font-medium text-gray-600">Monto</th>
                <th className="text-left py-2 font-medium text-gray-600">Estado</th>
                <th className="text-left py-2 font-medium text-gray-600">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {student.payments.map((p) => (
                <tr key={p.id} className="border-b border-gray-100">
                  <td className="py-2">{formatPeriod(p.period)}</td>
                  <td className="py-2">{p.amount ? `$${p.amount.toLocaleString("es-AR")}` : "-"}</td>
                  <td className="py-2"><span className={PAYMENT_STATUS[p.status]}>{p.status}</span></td>
                  <td className="py-2 text-gray-500">{p.submittedAt.toLocaleDateString("es-AR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h2 className="section-title mb-4">Historial de asistencia</h2>
        {student.attendances.length === 0 ? (
          <p className="text-sm text-gray-500">Sin registros de asistencia</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 font-medium text-gray-600">Clase</th>
                <th className="text-left py-2 font-medium text-gray-600">Fecha</th>
                <th className="text-left py-2 font-medium text-gray-600">Asistencia</th>
              </tr>
            </thead>
            <tbody>
              {student.attendances.map((a) => (
                <tr key={a.id} className="border-b border-gray-100">
                  <td className="py-2">{a.classSession.classSchedule.name}</td>
                  <td className="py-2 text-gray-500">{a.classSession.date.toLocaleDateString("es-AR")}</td>
                  <td className="py-2">
                    <span className={a.present ? "badge-green" : "badge-red"}>
                      {a.present ? "Presente" : "Ausente"}
                    </span>
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

function DataRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex gap-2">
      <dt className="text-gray-500 w-36 shrink-0">{label}:</dt>
      <dd className="text-gray-900 font-medium">{value}</dd>
    </div>
  );
}
