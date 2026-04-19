import { prisma } from "@/lib/db";
import Link from "next/link";
import { beltLabel } from "@/lib/utils";
import InviteButton from "./InviteButton";

const STATUS_LABELS: Record<string, string> = {
  PENDING_APPROVAL: "Pendiente",
  ACTIVE: "Activo",
  INACTIVE: "Inactivo",
};

const STATUS_BADGE: Record<string, string> = {
  PENDING_APPROVAL: "badge-yellow",
  ACTIVE: "badge-green",
  INACTIVE: "badge-gray",
};

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string }>;
}) {
  const { status, search } = await searchParams;

  const students = await prisma.student.findMany({
    where: {
      ...(status ? { status: status as "PENDING_APPROVAL" | "ACTIVE" | "INACTIVE" } : {}),
      ...(search
        ? {
            OR: [
              { firstName: { contains: search, mode: "insensitive" } },
              { lastName: { contains: search, mode: "insensitive" } },
              { user: { email: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    include: {
      user: { select: { email: true } },
      plans: { where: { isActive: true }, include: { plan: { select: { name: true } } }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="page-title">Alumnos</h1>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-start">
          <InviteButton />
          <Link href="/admin/students/new" className="btn-primary">
            + Nuevo alumno
          </Link>
        </div>
      </div>

      <div className="card">
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <form className="flex gap-2 flex-1">
            <input
              name="search"
              defaultValue={search}
              placeholder="Buscar por nombre, apellido o email..."
              className="input flex-1"
            />
            <button type="submit" className="btn-primary">Buscar</button>
          </form>
          <div className="flex gap-2">
            {["", "PENDING_APPROVAL", "ACTIVE", "INACTIVE"].map((s) => (
              <Link
                key={s}
                href={s ? `/admin/students?status=${s}` : "/admin/students"}
                className={`btn-sm ${status === s || (!status && !s) ? "btn-primary" : "btn-secondary"}`}
              >
                {s ? STATUS_LABELS[s] : "Todos"}
              </Link>
            ))}
          </div>
        </div>

        {students.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No se encontraron alumnos</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Nombre</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600 hidden md:table-cell">Email</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600 hidden sm:table-cell">Cinturón</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Plan</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Estado</th>
                  <th className="py-3 px-2"></th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id} className="border-b border-gray-100 table-row-hover">
                    <td className="py-3 px-2 font-medium text-gray-900">
                      {s.firstName} {s.lastName}
                    </td>
                    <td className="py-3 px-2 text-gray-600 hidden md:table-cell">{s.user.email}</td>
                    <td className="py-3 px-2 hidden sm:table-cell">
                      <span className="text-gray-600">{beltLabel(s.belt)}{s.beltGrade > 0 ? ` G${s.beltGrade}` : ""}</span>
                    </td>
                    <td className="py-3 px-2">
                      {s.plans[0] ? (
                        <span className="badge-blue">{s.plans[0].plan.name}</span>
                      ) : (
                        <span className="text-gray-400 text-xs">Sin plan</span>
                      )}
                    </td>
                    <td className="py-3 px-2">
                      <span className={STATUS_BADGE[s.status]}>{STATUS_LABELS[s.status]}</span>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <Link href={`/admin/students/${s.id}`} className="btn-secondary btn-sm">
                        Ver
                      </Link>
                    </td>
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
