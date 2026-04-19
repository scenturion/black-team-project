"use client";

import { useEffect, useState } from "react";
import { beltLabel } from "@/lib/utils";

interface Student {
  id: string; firstName: string; lastName: string; phone: string | null; dni: string | null;
  belt: string; beltGrade: number; weight: number | null; medicalNotes: string | null;
  allergiesAndInjuries: string | null; emergencyContactName: string; emergencyContactPhone: string;
  termsAcceptedAt: string | null; isMinor: boolean;
  user: { email: string };
}

interface Config { key: string; value: string }

export default function StudentProfilePage() {
  const [student, setStudent] = useState<Student | null>(null);
  const [termsText, setTermsText] = useState("");
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((data) => {
      if (data.student) setStudent(data.student as Student & { user: { email: string } });
    });
    fetch("/api/config").then((r) => r.json()).then((configs: Config[]) => {
      const terms = configs.find((c) => c.key === "terms_and_conditions");
      if (terms) setTermsText(terms.value);
    });
  }, []);

  const acceptTerms = async () => {
    if (!student) return;
    setLoading(true);
    await fetch(`/api/students/${student.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ termsAcceptedAt: new Date().toISOString() } as Record<string, string>),
    });
    setMessage("Términos aceptados");
    setLoading(false);
    setTimeout(() => setMessage(""), 3000);
  };

  const handleEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!student) return;
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const res = await fetch(`/api/students/${student.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: fd.get("phone"),
        emergencyContactName: fd.get("emergencyContactName"),
        emergencyContactPhone: fd.get("emergencyContactPhone"),
        medicalNotes: fd.get("medicalNotes"),
        allergiesAndInjuries: fd.get("allergiesAndInjuries"),
        weight: fd.get("weight") ? parseFloat(fd.get("weight") as string) : undefined,
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      setStudent((prev) => prev ? { ...prev, ...updated } : prev);
      setEditing(false);
      setMessage("Perfil actualizado");
    }
    setLoading(false);
    setTimeout(() => setMessage(""), 3000);
  };

  if (!student) return <div className="text-center py-10 text-gray-500">Cargando...</div>;

  return (
    <div className="space-y-6">
      <h1 className="page-title">Mi Perfil</h1>

      {message && (
        <div className="p-3 rounded-lg text-sm font-medium bg-green-50 text-green-700 border border-green-200">{message}</div>
      )}

      <div className="card">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="section-title">{student.firstName} {student.lastName}</h2>
            <p className="text-sm text-gray-500">{student.user?.email}</p>
          </div>
          <div className="text-right">
            <p className="font-semibold text-blue-700">{beltLabel(student.belt)}</p>
            {student.beltGrade > 0 && <p className="text-sm text-gray-500">Grado {student.beltGrade}</p>}
          </div>
        </div>

        {!editing ? (
          <div className="space-y-2 text-sm">
            {student.phone && <div className="flex gap-2"><span className="text-gray-500 w-40">Teléfono:</span><span>{student.phone}</span></div>}
            {student.dni && <div className="flex gap-2"><span className="text-gray-500 w-40">DNI:</span><span>{student.dni}</span></div>}
            {student.weight && <div className="flex gap-2"><span className="text-gray-500 w-40">Peso:</span><span>{student.weight} kg</span></div>}
            <div className="flex gap-2"><span className="text-gray-500 w-40">Emergencias:</span><span>{student.emergencyContactName} ({student.emergencyContactPhone})</span></div>
            {student.medicalNotes && <div className="flex gap-2"><span className="text-gray-500 w-40">Obs. médicas:</span><span>{student.medicalNotes}</span></div>}
            {student.allergiesAndInjuries && <div className="flex gap-2"><span className="text-gray-500 w-40">Alergias:</span><span>{student.allergiesAndInjuries}</span></div>}
            <div className="pt-2">
              <button onClick={() => setEditing(true)} className="btn-secondary btn-sm">Editar datos</button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleEdit} className="space-y-3">
            <div><label className="label">Teléfono</label><input name="phone" defaultValue={student.phone || ""} className="input" /></div>
            <div><label className="label">Peso (kg)</label><input name="weight" type="number" defaultValue={student.weight || ""} className="input" /></div>
            <div><label className="label">Contacto de emergencia</label><input name="emergencyContactName" required defaultValue={student.emergencyContactName} className="input" /></div>
            <div><label className="label">Teléfono de emergencia</label><input name="emergencyContactPhone" required defaultValue={student.emergencyContactPhone} className="input" /></div>
            <div><label className="label">Observaciones médicas</label><textarea name="medicalNotes" defaultValue={student.medicalNotes || ""} className="input" rows={2} /></div>
            <div><label className="label">Alergias / Lesiones</label><textarea name="allergiesAndInjuries" defaultValue={student.allergiesAndInjuries || ""} className="input" rows={2} /></div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setEditing(false)} className="btn-secondary">Cancelar</button>
              <button type="submit" disabled={loading} className="btn-primary">{loading ? "Guardando..." : "Guardar"}</button>
            </div>
          </form>
        )}
      </div>

      {!student.termsAcceptedAt && (
        <div className="card border-blue-200">
          <h2 className="section-title mb-3">Términos y condiciones</h2>
          <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 max-h-48 overflow-y-auto mb-4 whitespace-pre-wrap">
            {termsText || "Por favor leé los términos y condiciones de la academia."}
          </div>
          <button onClick={acceptTerms} disabled={loading} className="btn-primary">
            Acepto los términos y condiciones
          </button>
        </div>
      )}

      {student.termsAcceptedAt && (
        <div className="card bg-green-50 border-green-200">
          <p className="text-sm text-green-700">
            Términos y condiciones aceptados el {new Date(student.termsAcceptedAt).toLocaleDateString("es-AR")}.
          </p>
        </div>
      )}
    </div>
  );
}
