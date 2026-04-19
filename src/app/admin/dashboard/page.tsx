import { prisma } from "@/lib/db";
import Link from "next/link";

export default async function AdminDashboard() {
  const [totalStudents, pendingApproval, pendingPayments, pendingDocuments, todaysSessions] =
    await Promise.all([
      prisma.student.count({ where: { status: "ACTIVE" } }),
      prisma.student.count({ where: { status: "PENDING_APPROVAL" } }),
      prisma.payment.count({ where: { status: "PENDING" } }),
      prisma.document.count({ where: { status: "PENDING" } }),
      prisma.classSession.count({
        where: {
          date: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lte: new Date(new Date().setHours(23, 59, 59, 999)),
          },
          status: "ACTIVE",
        },
      }),
    ]);

  const recentStudents = await prisma.student.findMany({
    where: { status: "PENDING_APPROVAL" },
    include: { user: { select: { email: true } } },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const recentPayments = await prisma.payment.findMany({
    where: { status: "PENDING" },
    include: { student: { select: { firstName: true, lastName: true } } },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  return (
    <div className="space-y-6">
      <h1 className="page-title">Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Alumnos activos" value={totalStudents} color="blue" href="/admin/students?status=ACTIVE" />
        <StatCard label="Pendientes de aprobación" value={pendingApproval} color="yellow" href="/admin/students?status=PENDING_APPROVAL" />
        <StatCard label="Pagos a revisar" value={pendingPayments} color="orange" href="/admin/payments?status=PENDING" />
        <StatCard label="Clases hoy" value={todaysSessions} color="green" href="/admin/classes" />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">Alumnos pendientes</h2>
            <Link href="/admin/students?status=PENDING_APPROVAL" className="text-sm text-blue-600 hover:underline">
              Ver todos
            </Link>
          </div>
          {recentStudents.length === 0 ? (
            <p className="text-sm text-gray-500">Sin alumnos pendientes</p>
          ) : (
            <div className="space-y-3">
              {recentStudents.map((s) => (
                <div key={s.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{s.firstName} {s.lastName}</p>
                    <p className="text-xs text-gray-500">{s.user.email}</p>
                  </div>
                  <Link href={`/admin/students/${s.id}`} className="btn-primary btn-sm">
                    Revisar
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">Pagos pendientes</h2>
            <Link href="/admin/payments?status=PENDING" className="text-sm text-blue-600 hover:underline">
              Ver todos
            </Link>
          </div>
          {recentPayments.length === 0 ? (
            <p className="text-sm text-gray-500">Sin pagos pendientes</p>
          ) : (
            <div className="space-y-3">
              {recentPayments.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{p.student.firstName} {p.student.lastName}</p>
                    <p className="text-xs text-gray-500">Período: {p.period}</p>
                  </div>
                  <Link href={`/admin/payments`} className="btn-primary btn-sm">
                    Revisar
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {pendingDocuments > 0 && (
        <div className="card border-yellow-200 bg-yellow-50">
          <p className="text-sm text-yellow-800">
            Hay <strong>{pendingDocuments}</strong> documento(s) pendiente(s) de revisión.{" "}
            <Link href="/admin/documents" className="underline font-medium">
              Ver documentos
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color, href }: { label: string; value: number; color: string; href: string }) {
  const colors: Record<string, string> = {
    blue: "text-blue-600 bg-blue-50",
    yellow: "text-yellow-600 bg-yellow-50",
    orange: "text-orange-600 bg-orange-50",
    green: "text-green-600 bg-green-50",
  };

  return (
    <Link href={href} className="card hover:shadow-md transition-shadow">
      <p className={`text-3xl font-bold ${colors[color]?.split(" ")[0]}`}>{value}</p>
      <p className="text-sm text-gray-600 mt-1">{label}</p>
    </Link>
  );
}
