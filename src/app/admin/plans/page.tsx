import { prisma } from "@/lib/db";
import Link from "next/link";
import PlanToggle from "./PlanToggle";

export default async function PlansPage() {
  const plans = await prisma.plan.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Planes</h1>
        <Link href="/admin/plans/new" className="btn-primary">+ Nuevo plan</Link>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {plans.map((plan) => (
          <div key={plan.id} className={`card ${!plan.isActive ? "opacity-60" : ""}`}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-gray-900">{plan.name}</h3>
                {!plan.isActive && <span className="badge-gray text-xs">Inactivo</span>}
              </div>
              <PlanToggle planId={plan.id} isActive={plan.isActive} />
            </div>
            {plan.description && <p className="text-sm text-gray-500 mb-3">{plan.description}</p>}
            <div className="space-y-1 text-sm">
              <p className="text-gray-700">
                <span className="font-medium">Precio:</span> ${plan.monthlyPrice.toLocaleString("es-AR")}/mes
              </p>
              <p className="text-gray-700">
                <span className="font-medium">Clases/semana:</span>{" "}
                {plan.classesPerWeek === null ? "Ilimitado" : plan.classesPerWeek}
              </p>
              <div className="flex flex-wrap gap-1 pt-1">
                {plan.allowsFreeBooking && <span className="badge-blue">Reserva libre</span>}
                {plan.allowsReplacement && <span className="badge-blue">Reemplazos</span>}
                {plan.allowsFixedGroup && <span className="badge-blue">Grupo fijo</span>}
              </div>
            </div>
            <div className="mt-4">
              <Link href={`/admin/plans/${plan.id}`} className="btn-secondary btn-sm w-full text-center">
                Editar
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
