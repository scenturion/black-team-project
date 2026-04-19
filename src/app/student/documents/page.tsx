"use client";

import { useEffect, useState } from "react";
import { docTypeLabel } from "@/lib/utils";

interface Document { id: string; type: string; filename: string; status: string; uploadedAt: string; expiresAt: string | null; notes: string | null }

const DOC_STATUS: Record<string, string> = { PENDING: "badge-yellow", APPROVED: "badge-green", EXPIRED: "badge-red" };
const DOC_STATUS_LABELS: Record<string, string> = { PENDING: "Pendiente de revisión", APPROVED: "Aprobado", EXPIRED: "Vencido" };

export default function StudentDocumentsPage() {
  const [docs, setDocs] = useState<Document[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const load = () => {
    fetch("/api/documents").then((r) => r.json()).then(setDocs);
  };

  useEffect(load, []);

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/documents", { method: "POST", body: fd });
    const data = await res.json();
    if (res.ok) {
      setMessage("Documento subido correctamente.");
      setShowForm(false);
      load();
    } else {
      setMessage(data.error || "Error al subir el documento");
    }
    setLoading(false);
    setTimeout(() => setMessage(""), 4000);
  };

  const deleteDoc = async (id: string) => {
    if (!confirm("¿Eliminar este documento?")) return;
    await fetch(`/api/documents/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Mis Documentos</h1>
        <button onClick={() => setShowForm(true)} className="btn-primary">+ Subir documento</button>
      </div>

      {message && (
        <div className={`p-3 rounded-lg text-sm font-medium ${message.includes("Error") ? "bg-red-50 text-red-700 border border-red-200" : "bg-green-50 text-green-700 border border-green-200"}`}>
          {message}
        </div>
      )}

      <div className="card">
        <p className="text-sm text-gray-500 mb-4">
          Documentos requeridos: Apto físico (vence al año), deslinde de responsabilidad, y autorización de tutor si sos menor de edad.
        </p>
        {docs.length === 0 ? (
          <p className="text-sm text-gray-500">Sin documentos cargados</p>
        ) : (
          <div className="space-y-3">
            {docs.map((d) => (
              <div key={d.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 border border-gray-200 rounded-lg">
                <div>
                  <p className="font-medium text-sm text-gray-900">{docTypeLabel(d.type)}</p>
                  <p className="text-xs text-gray-500">{d.filename} · {new Date(d.uploadedAt).toLocaleDateString("es-AR")}</p>
                  {d.expiresAt && (
                    <p className="text-xs text-gray-400">Vence: {new Date(d.expiresAt).toLocaleDateString("es-AR")}</p>
                  )}
                  {d.notes && <p className="text-xs text-gray-500 italic mt-0.5">{d.notes}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={DOC_STATUS[d.status]}>{DOC_STATUS_LABELS[d.status]}</span>
                  <button onClick={() => deleteDoc(d.id)} className="text-gray-400 hover:text-red-500 text-xs">Eliminar</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md space-y-4">
            <h3 className="section-title">Subir documento</h3>
            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="label">Tipo de documento *</label>
                <select name="type" required className="input">
                  <option value="APTO_FISICO">Apto Físico</option>
                  <option value="DESLINDE_CONSENTIMIENTO">Deslinde / Consentimiento</option>
                  <option value="AUTORIZACION_TUTOR">Autorización de Tutor</option>
                  <option value="OTRO">Otro</option>
                </select>
              </div>
              <div>
                <label className="label">Archivo *</label>
                <input name="file" type="file" required accept="image/*,.pdf" className="input" />
              </div>
              <div>
                <label className="label">Notas (opcional)</label>
                <input name="notes" className="input" placeholder="Observaciones adicionales" />
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
                <button type="submit" disabled={loading} className="btn-primary">{loading ? "Subiendo..." : "Subir"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
