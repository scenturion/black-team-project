"use client";

import { useEffect, useState } from "react";
import { formatPeriod } from "@/lib/utils";

interface Payment {
  id: string; period: string; amount: number | null; status: string; notes: string | null;
  submittedAt: string; voucherPath: string | null;
  student: { firstName: string; lastName: string; user: { email: string } };
}

const STATUS_LABELS: Record<string, string> = { PENDING: "Pendiente", APPROVED: "Aprobado", REJECTED: "Rechazado" };
const STATUS_BADGE: Record<string, string> = { PENDING: "badge-yellow", APPROVED: "badge-green", REJECTED: "badge-red" };

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [filter, setFilter] = useState("PENDING");
  const [selected, setSelected] = useState<Payment | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [loading, setLoading] = useState(false);

  const load = () => {
    fetch(`/api/payments?status=${filter}`).then((r) => r.json()).then(setPayments);
  };

  useEffect(load, [filter]);

  const review = async (action: "APPROVED" | "REJECTED") => {
    if (!selected) return;
    if (action === "REJECTED" && !rejectionReason.trim()) {
      alert("Ingresá el motivo de rechazo");
      return;
    }
    setLoading(true);
    const res = await fetch(`/api/payments/${selected.id}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, rejectionReason: rejectionReason || undefined }),
    });
    if (res.ok) {
      setSelected(null);
      setRejectionReason("");
      load();
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <h1 className="page-title">Pagos</h1>

      <div className="flex gap-2">
        {["PENDING", "APPROVED", "REJECTED"].map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={filter === s ? "btn-primary btn-sm" : "btn-secondary btn-sm"}>
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      <div className="card">
        {payments.length === 0 ? (
          <p className="text-center text-gray-500 py-8">Sin pagos con estado &quot;{STATUS_LABELS[filter]}&quot;</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 font-medium text-gray-600">Alumno</th>
                <th className="text-left py-3 font-medium text-gray-600">Período</th>
                <th className="text-left py-3 font-medium text-gray-600 hidden sm:table-cell">Monto</th>
                <th className="text-left py-3 font-medium text-gray-600">Estado</th>
                <th className="text-left py-3 font-medium text-gray-600 hidden md:table-cell">Fecha</th>
                <th className="py-3"></th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b border-gray-100 table-row-hover">
                  <td className="py-3">
                    <p className="font-medium">{p.student.firstName} {p.student.lastName}</p>
                    <p className="text-xs text-gray-500">{p.student.user.email}</p>
                  </td>
                  <td className="py-3">{formatPeriod(p.period)}</td>
                  <td className="py-3 hidden sm:table-cell">{p.amount ? `$${p.amount.toLocaleString("es-AR")}` : "-"}</td>
                  <td className="py-3"><span className={STATUS_BADGE[p.status]}>{STATUS_LABELS[p.status]}</span></td>
                  <td className="py-3 text-gray-500 hidden md:table-cell">{new Date(p.submittedAt).toLocaleDateString("es-AR")}</td>
                  <td className="py-3 text-right">
                    <button onClick={() => setSelected(p)} className="btn-secondary btn-sm">Ver</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg space-y-4">
            <h3 className="section-title">Revisar pago</h3>
            <div className="text-sm space-y-1">
              <p><span className="text-gray-500">Alumno:</span> <strong>{selected.student.firstName} {selected.student.lastName}</strong></p>
              <p><span className="text-gray-500">Período:</span> {formatPeriod(selected.period)}</p>
              {selected.amount && <p><span className="text-gray-500">Monto:</span> ${selected.amount.toLocaleString("es-AR")}</p>}
              {selected.notes && <p><span className="text-gray-500">Notas:</span> {selected.notes}</p>}
            </div>
            {selected.voucherPath && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Comprobante:</p>
                <a href={selected.voucherPath} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-sm underline">
                  Ver comprobante
                </a>
              </div>
            )}
            {selected.status === "PENDING" && (
              <div>
                <label className="label">Motivo de rechazo (requerido si rechazás)</label>
                <textarea
                  className="input"
                  rows={2}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Ej: Comprobante ilegible"
                />
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <button onClick={() => setSelected(null)} className="btn-secondary">Cerrar</button>
              {selected.status === "PENDING" && (
                <>
                  <button onClick={() => review("REJECTED")} disabled={loading} className="btn-danger">{loading ? "..." : "Rechazar"}</button>
                  <button onClick={() => review("APPROVED")} disabled={loading} className="btn-success">{loading ? "..." : "Aprobar"}</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
