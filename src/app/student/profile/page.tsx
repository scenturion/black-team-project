"use client";

import { useEffect, useState } from "react";
import { beltLabel } from "@/lib/utils";

interface Student {
  id: string; firstName: string; lastName: string; phone: string | null; dni: string | null;
  belt: string; beltGrade: number; beltLockedByAdmin: boolean;
  weight: number | null; medicalNotes: string | null;
  allergiesAndInjuries: string | null; emergencyContactName: string; emergencyContactPhone: string;
  termsAcceptedAt: string | null; isMinor: boolean;
  user: { email: string };
}

interface Config { key: string; value: string }

export default function StudentProfilePage() {
  const [student, setStudent] = useState<Student | null>(null);
  const [termsText, setTermsText] = useState("");
  const [beltOptions, setBeltOptions] = useState<string[]>(["BLANCO", "AZUL", "VIOLETA", "MARRON", "NEGRO"]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((data) => {
      if (data.student) setStudent(data.student as Student);
    });
    fetch("/api/config").then((r) => r.json()).then((configs: Config[]) => {
      const terms = configs.find((c) => c.key === "terms_and_conditions");
      if (terms) setTermsText(terms.value);
      const belts = configs.find((c) => c.key === "belt_options");
      if (belts) {
        try { setBeltOptions(JSON.parse(belts.value)); } catch { /* keep default */ }
      }
    });
  }, []);

  const acceptTerms = async () => {
    if (!student) return;
    setLoading(true);
    const res = await fetch(`/api/students/${student.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ termsAcceptedAt: new Date().toISOString() }),
    });
    if (res.ok) {
      setStudent((prev) => prev ? { ...prev, termsAcceptedAt: new Date().toISOString() } : prev);
      setMessage("Términos aceptados");
      setTimeout(() => setMessage(""), 3000);
    }
    setLoading(false);
  };

  const handleEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!student) return;
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);

    const payload: Record<string, unknown> = {
      phone: fd.get("phone") || null,
      emergencyContactName: fd.get("emergencyContactName"),
      emergencyContactPhone: fd.get("emergencyContactPhone"),
      medicalNotes: fd.get("medicalNotes") || null,
      allergiesAndInjuries: fd.get("allergiesAndInjuries") || null,
      weight: fd.get("weight") ? parseFloat(fd.get("weight") as string) : null,
    };

    if (!student.beltLockedByAdmin) {
      payload.belt = fd.get("belt");
      payload.beltGrade = parseInt(fd.get("beltGrade") as string, 10);
    }

    const res = await fetch(`/api/students/${student.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const updated = await res.json();
      setStudent((prev) => prev ? { ...prev, ...updated } : prev);
      setEditing(false);
      setMessage("Perfil actualizado");
      setTimeout(() => setMessage(""), 3000);
    } else {
      const err = await res.json();
      setError(err.error || "Error al guardar");
    }
    setLoading(false);
  };

  if (!student) return <div className="text-center py-10 text-gray-500">Cargando...</div>;

  return (
    <div className="space-y-6">
      <h1 className="page-title">Mi Perfil</h1>

      {message && (
        <div className="p-3 rounded-lg text-sm font-medium bg-green-50 text-green-700 border border-green-200">{message}</div>
      )}
      {error && (
        <div className="p-3 rounded-lg text-sm font-medium bg-red-50 text-red-700 border border-red-200">{error}</div>
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
            {student.beltLockedByAdmin && <p className="text-xs text-gray-400 mt-1">Definido por el admin</p>}
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
            {!student.beltLockedByAdmin && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Cinturón</label>
                  <select name="belt" defaultValue={student.belt} className="input">
                    {beltOptions.map((b) => (
                      <option key={b} value={b}>{beltLabel(b)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Grado</label>
                  <select name="beltGrade" defaultValue={student.beltGrade} className="input">
                    {Array.from({ length: 11 }, (_, i) => (
                      <option key={i} value={i}>{i === 0 ? "Sin grado" : `Grado ${i}`}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
            <div><label className="label">Teléfono</label><input name="phone" defaultValue={student.phone || ""} className="input" /></div>
            <div><label className="label">Peso (kg)</label><input name="weight" type="number" step="0.1" defaultValue={student.weight || ""} className="input" /></div>
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
