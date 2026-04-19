"use client";

import { useEffect, useState } from "react";
import { docTypeLabel } from "@/lib/utils";

interface Document {
  id: string; type: string; filename: string; status: string; notes: string | null;
  uploadedAt: string; expiresAt: string | null;
  student: { firstName: string; lastName: string };
}

const DOC_STATUS: Record<string, string> = { PENDING: "badge-yellow", APPROVED: "badge-green", EXPIRED: "badge-red" };
const DOC_STATUS_LABELS: Record<string, string> = { PENDING: "Pendiente", APPROVED: "Aprobado", EXPIRED: "Vencido" };

export default function DocumentsPage() {
  const [docs, setDocs] = useState<Document[]>([]);
  const [filter, setFilter] = useState("PENDING");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const res = await fetch(`/api/documents?studentId=all&status=${filter}`);
    const data = await res.json();
    setDocs(Array.isArray(data) ? data : []);
  };

  useEffect(() => { load(); }, [filter]);

  const review = async (id: string, status: "APPROVED" | "EXPIRED") => {
    setLoading(true);
    await fetch(`/api/documents/${id}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <h1 className="page-title">Documentos</h1>

      <div className="flex gap-2">
        {["PENDING", "APPROVED", "EXPIRED"].map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={filter === s ? "btn-primary btn-sm" : "btn-secondary btn-sm"}>
            {DOC_STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      <div className="card">
        {docs.length === 0 ? (
          <p className="text-center text-gray-500 py-8">Sin documentos con ese estado</p>
        ) : (
          <div className="space-y-3">
            {docs.map((d) => (
              <div key={d.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 border border-gray-200 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">{d.student.firstName} {d.student.lastName}</p>
                  <p className="text-xs text-gray-500">{docTypeLabel(d.type)} · {d.filename}</p>
                  {d.expiresAt && (
                    <p className="text-xs text-gray-400">Vence: {new Date(d.expiresAt).toLocaleDateString("es-AR")}</p>
                  )}
                  {d.notes && <p className="text-xs text-gray-500 italic">{d.notes}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={DOC_STATUS[d.status]}>{DOC_STATUS_LABELS[d.status]}</span>
                  {d.status === "PENDING" && (
                    <>
                      <button onClick={() => review(d.id, "APPROVED")} disabled={loading} className="btn-success btn-sm">Aprobar</button>
                      <button onClick={() => review(d.id, "EXPIRED")} disabled={loading} className="btn-danger btn-sm">Rechazar</button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
