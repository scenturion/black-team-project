"use client";

import { useEffect, useState } from "react";
import { getCurrentPeriod, formatPeriod } from "@/lib/utils";

interface Payment { id: string; period: string; amount: number | null; status: string; notes: string | null; submittedAt: string }

const STATUS_LABELS: Record<string, string> = { PENDING: "Pendiente", APPROVED: "Aprobado", REJECTED: "Rechazado" };
const STATUS_BADGE: Record<string, string> = { PENDING: "badge-yellow", APPROVED: "badge-green", REJECTED: "badge-red" };

export default function StudentPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const load = () => {
    fetch("/api/payments").then((r) => r.json()).then(setPayments);
  };

  useEffect(load, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);

    const res = await fetch("/api/payments", { method: "POST", body: fd });
    const data = await res.json();
    if (res.ok) {
      setMessage("Pago informado correctamente. El administrador lo revisará en breve.");
      setShowForm(false);
      load();
    } else {
      setMessage(data.error || "Error al informar el pago");
    }
    setLoading(false);
    setTimeout(() => setMessage(""), 5000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Mis Pagos</h1>
        <button onClick={() => setShowForm(true)} className="btn-primary">Informar pago</button>
      </div>

      {message && (
        <div className={`p-3 rounded-lg text-sm font-medium ${message.includes("Error") ? "bg-red-50 text-red-700 border border-red-200" : "bg-green-50 text-green-700 border border-green-200"}`}>
          {message}
        </div>
      )}

      <div className="card">
        {payments.length === 0 ? (
          <p className="text-center text-gray-500 py-8">Sin pagos registrados aún</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 font-medium text-gray-600">Período</th>
                <th className="text-left py-3 font-medium text-gray-600 hidden sm:table-cell">Monto</th>
                <th className="text-left py-3 font-medium text-gray-600">Estado</th>
                <th className="text-left py-3 font-medium text-gray-600 hidden md:table-cell">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b border-gray-100">
                  <td className="py-3 font-medium">{formatPeriod(p.period)}</td>
                  <td className="py-3 hidden sm:table-cell">{p.amount ? `$${p.amount.toLocaleString("es-AR")}` : "-"}</td>
                  <td className="py-3"><span className={STATUS_BADGE[p.status]}>{STATUS_LABELS[p.status]}</span></td>
                  <td className="py-3 text-gray-500 hidden md:table-cell">{new Date(p.submittedAt).toLocaleDateString("es-AR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md space-y-4">
            <h3 className="section-title">Informar pago</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Período *</label>
                <input name="period" type="month" required defaultValue={getCurrentPeriod()} className="input" />
              </div>
              <div>
                <label className="label">Monto (opcional)</label>
                <input name="amount" type="number" min={0} className="input" placeholder="Ej: 6500" />
              </div>
              <div>
                <label className="label">Comprobante (opcional)</label>
                <input name="voucher" type="file" accept="image/*,.pdf" className="input" />
              </div>
              <div>
                <label className="label">Notas / Comentario</label>
                <textarea name="notes" className="input" rows={2} placeholder="Ej: Transferencia enviada el día 5..." />
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
                <button type="submit" disabled={loading} className="btn-primary">{loading ? "Enviando..." : "Informar pago"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
