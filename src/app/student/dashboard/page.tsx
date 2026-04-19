import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { getWeekStart } from "@/lib/classes";
import { beltLabel, formatPeriod } from "@/lib/utils";

export default async function StudentDashboard() {
  const session = await getSession();
  if (!session) redirect("/login");

  const student = await prisma.student.findUnique({
    where: { userId: session.userId },
    include: {
      plans: { where: { isActive: true }, include: { plan: true } },
      payments: { where: { status: "APPROVED" }, orderBy: { submittedAt: "desc" }, take: 1 },
      documents: { where: { type: "APTO_FISICO" }, orderBy: { uploadedAt: "desc" }, take: 1 },
    },
  });

  if (!student) redirect("/login");

  if (student.status === "PENDING_APPROVAL") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="card max-w-md text-center">
          <img src="/illustration-pending-approval.svg" alt="Cuenta en revisión" width={120} height={120} className="mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Tu cuenta está siendo revisada</h1>
          <p className="text-gray-500">El administrador aprobará tu cuenta en breve. Recibirás una notificación cuando esté lista.</p>
        </div>
      </div>
    );
  }

  const activePlan = student.plans[0];
  const weekStart = getWeekStart(new Date());

  const weeklyBookings = activePlan
    ? await prisma.booking.count({
        where: {
          studentId: student.id,
          weekStart,
          status: { in: ["RESERVED", "ATTENDED"] },
        },
      })
    : 0;

  const upcomingBookings = await prisma.booking.findMany({
    where: {
      studentId: student.id,
      status: "RESERVED",
      classSession: { date: { gte: new Date() } },
    },
    include: {
      classSession: { include: { classSchedule: { select: { name: true, startTime: true } } } },
    },
    orderBy: { classSession: { date: "asc" } },
    take: 5,
  });

  const pendingPayment = await prisma.payment.findFirst({
    where: { studentId: student.id, status: "PENDING" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Hola, {student.firstName}!</h1>
        <p className="text-gray-500 mt-1">{beltLabel(student.belt)}{student.beltGrade > 0 ? ` · Grado ${student.beltGrade}` : ""}</p>
      </div>

      {pendingPayment && (
        <div className="card border-yellow-200 bg-yellow-50">
          <p className="text-sm text-yellow-800">
            Tenés un pago pendiente de aprobación ({formatPeriod(pendingPayment.period)}).{" "}
            <Link href="/student/payments" className="underline font-medium">Ver pagos</Link>
          </p>
        </div>
      )}

      {!student.termsAcceptedAt && (
        <div className="card border-blue-200 bg-blue-50">
          <p className="text-sm text-blue-800">
            Por favor aceptá los términos y condiciones desde tu perfil.{" "}
            <Link href="/student/profile" className="underline font-medium">Ir al perfil</Link>
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="card text-center">
          <p className="text-3xl font-bold text-blue-600">
            {activePlan
              ? activePlan.plan.classesPerWeek === null
                ? "∞"
                : `${weeklyBookings}/${activePlan.plan.classesPerWeek}`
              : "-"}
          </p>
          <p className="text-sm text-gray-600 mt-1">Clases esta semana</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-blue-600">{upcomingBookings.length}</p>
          <p className="text-sm text-gray-600 mt-1">Próximas reservas</p>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title">Plan activo</h2>
          {!activePlan && <Link href="/student/payments" className="text-sm text-blue-600">Informar pago</Link>}
        </div>
        {activePlan ? (
          <div>
            <p className="font-semibold text-gray-900">{activePlan.plan.name}</p>
            <p className="text-sm text-gray-500 mt-1">{activePlan.plan.description}</p>
            <p className="text-sm text-gray-500">Desde: {activePlan.startDate.toLocaleDateString("es-AR")}</p>
          </div>
        ) : (
          <p className="text-sm text-gray-500">Sin plan activo. Contactá con la academia.</p>
        )}
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title">Próximas clases</h2>
          <Link href="/student/classes" className="text-sm text-blue-600 hover:underline">Reservar clases</Link>
        </div>
        {upcomingBookings.length === 0 ? (
          <p className="text-sm text-gray-500">Sin reservas próximas. <Link href="/student/classes" className="text-blue-600 hover:underline">Reservar una clase</Link></p>
        ) : (
          <div className="space-y-2">
            {upcomingBookings.map((b) => (
              <div key={b.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-900">{b.classSession.classSchedule.name}</p>
                  <p className="text-xs text-gray-500">
                    {b.classSession.date.toLocaleDateString("es-AR")} · {b.classSession.classSchedule.startTime}
                  </p>
                </div>
                <span className="badge-green text-xs">Reservada</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
