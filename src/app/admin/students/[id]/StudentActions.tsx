"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Guardian {
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  relationship: string;
}

interface Student {
  id: string;
  status: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  sex: string;
  phone: string | null;
  dni: string | null;
  belt: string;
  beltGrade: number;
  weight: number | null;
  medicalNotes: string | null;
  allergiesAndInjuries: string | null;
  emergencyContactName: string;
  emergencyContactPhone: string;
  isMinor: boolean;
  user: { email: string };
  guardian: Guardian | null;
}

interface Plan { id: string; name: string }

export default function StudentActions({
  student,
  allPlans,
  beltOptions,
}: {
  student: Student;
  allPlans: Plan[];
  beltOptions: string[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [editError, setEditError] = useState("");

  const birthDateValue = student.birthDate
    ? new Date(student.birthDate).toISOString().split("T")[0]
    : "";

  const approve = async () => {
    setLoading(true);
    const res = await fetch(`/api/students/${student.id}/approve`, { method: "POST" });
    if (res.ok) router.refresh();
    else alert("Error al aprobar el alumno");
    setLoading(false);
  };

  const setInactive = async () => {
    if (!confirm("¿Marcar este alumno como inactivo?")) return;
    setLoading(true);
    const res = await fetch(`/api/students/${student.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "INACTIVE" }),
    });
    if (res.ok) router.refresh();
    setLoading(false);
  };

  const assignPlan = async () => {
    if (!selectedPlan) return;
    setLoading(true);
    const res = await fetch(`/api/students/${student.id}/plan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId: selectedPlan, startDate }),
    });
    if (res.ok) {
      setShowPlanModal(false);
      router.refresh();
    } else {
      alert("Error al asignar el plan");
    }
    setLoading(false);
  };

  const handleEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setEditError("");

    const fd = new FormData(e.currentTarget);
    const payload: Record<string, unknown> = {};

    const textFields = [
      "email", "firstName", "lastName", "birthDate", "sex",
      "phone", "dni", "belt", "medicalNotes", "allergiesAndInjuries",
      "emergencyContactName", "emergencyContactPhone", "status",
    ];
    for (const f of textFields) {
      const v = fd.get(f) as string;
      if (v !== undefined && v !== null) payload[f] = v || null;
    }

    const beltGrade = fd.get("beltGrade");
    if (beltGrade) payload.beltGrade = parseInt(beltGrade as string, 10);

    const weight = fd.get("weight");
    payload.weight = weight ? parseFloat(weight as string) : null;

    const password = fd.get("password") as string;
    if (password) payload.password = password;

    const hasGuardian = fd.get("hasGuardian") === "1";
    if (hasGuardian) {
      payload.guardian = {
        firstName: fd.get("guardianFirstName"),
        lastName: fd.get("guardianLastName"),
        phone: fd.get("guardianPhone"),
        email: fd.get("guardianEmail") || null,
        relationship: fd.get("guardianRelationship"),
      };
    } else if (student.guardian) {
      payload.guardian = null;
    }

    const res = await fetch(`/api/students/${student.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      setShowEditModal(false);
      router.refresh();
    } else {
      const err = await res.json();
      setEditError(err.error || "Error al guardar los cambios");
    }
    setLoading(false);
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {student.status === "PENDING_APPROVAL" && (
          <button onClick={approve} disabled={loading} className="btn-success">
            Aprobar alumno
          </button>
        )}
        {student.status === "ACTIVE" && (
          <button onClick={setInactive} disabled={loading} className="btn-danger">
            Desactivar
          </button>
        )}
        <button onClick={() => setShowPlanModal(true)} className="btn-primary">
          Asignar plan
        </button>
        <button onClick={() => setShowEditModal(true)} className="btn-secondary">
          Editar datos
        </button>
      </div>

      {/* Plan modal */}
      {showPlanModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md space-y-4">
            <h3 className="section-title">Asignar plan</h3>
            <div>
              <label className="label">Plan</label>
              <select className="input" value={selectedPlan} onChange={(e) => setSelectedPlan(e.target.value)}>
                <option value="">Seleccioná un plan</option>
                {allPlans.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Fecha de inicio</label>
              <input type="date" className="input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowPlanModal(false)} className="btn-secondary">Cancelar</button>
              <button onClick={assignPlan} disabled={loading || !selectedPlan} className="btn-primary">Asignar</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl my-4 space-y-6">
            <h3 className="section-title">Editar alumno</h3>
            {editError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{editError}</div>
            )}
            <form onSubmit={handleEdit} className="space-y-6">
              {/* Acceso */}
              <fieldset className="space-y-3">
                <legend className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Acceso</legend>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Email</label>
                    <input name="email" type="email" defaultValue={student.user.email} className="input" />
                  </div>
                  <div>
                    <label className="label">Nueva contraseña</label>
                    <input name="password" type="password" minLength={6} placeholder="Dejar vacío para no cambiar" className="input" />
                  </div>
                </div>
              </fieldset>

              {/* Datos personales */}
              <fieldset className="space-y-3">
                <legend className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Datos personales</legend>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="label">Nombre</label><input name="firstName" defaultValue={student.firstName} required className="input" /></div>
                  <div><label className="label">Apellido</label><input name="lastName" defaultValue={student.lastName} required className="input" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Fecha de nacimiento</label>
                    <input name="birthDate" type="date" defaultValue={birthDateValue} className="input" />
                  </div>
                  <div>
                    <label className="label">Sexo</label>
                    <select name="sex" defaultValue={student.sex} className="input">
                      <option value="MASCULINO">Masculino</option>
                      <option value="FEMENINO">Femenino</option>
                      <option value="OTRO">Otro</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="label">Teléfono</label><input name="phone" defaultValue={student.phone ?? ""} className="input" /></div>
                  <div><label className="label">DNI</label><input name="dni" defaultValue={student.dni ?? ""} className="input" /></div>
                </div>
                <div>
                  <label className="label">Peso (kg)</label>
                  <input name="weight" type="number" step="0.1" defaultValue={student.weight ?? ""} className="input" />
                </div>
              </fieldset>

              {/* Cinturón y estado */}
              <fieldset className="space-y-3">
                <legend className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Cinturón y estado</legend>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="label">Cinturón</label>
                    <select name="belt" defaultValue={student.belt} className="input">
                      {beltOptions.map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Grado</label>
                    <input name="beltGrade" type="number" min={0} max={10} defaultValue={student.beltGrade} className="input" />
                  </div>
                </div>
                <div>
                  <label className="label">Estado</label>
                  <select name="status" defaultValue={student.status} className="input">
                    <option value="PENDING_APPROVAL">Pendiente de aprobación</option>
                    <option value="ACTIVE">Activo</option>
                    <option value="INACTIVE">Inactivo</option>
                  </select>
                </div>
              </fieldset>

              {/* Salud y emergencias */}
              <fieldset className="space-y-3">
                <legend className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Salud y emergencias</legend>
                <div><label className="label">Observaciones médicas</label><textarea name="medicalNotes" defaultValue={student.medicalNotes ?? ""} className="input" rows={2} /></div>
                <div><label className="label">Alergias / Lesiones</label><textarea name="allergiesAndInjuries" defaultValue={student.allergiesAndInjuries ?? ""} className="input" rows={2} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="label">Contacto emergencia</label><input name="emergencyContactName" defaultValue={student.emergencyContactName} required className="input" /></div>
                  <div><label className="label">Teléfono emergencia</label><input name="emergencyContactPhone" defaultValue={student.emergencyContactPhone} required className="input" /></div>
                </div>
              </fieldset>

              {/* Responsable legal */}
              <fieldset className="space-y-3">
                <legend className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Responsable legal</legend>
                <input type="hidden" name="hasGuardian" value={student.guardian ? "1" : "0"} id="hasGuardianInput" />
                {student.guardian ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="label">Nombre</label><input name="guardianFirstName" defaultValue={student.guardian.firstName} className="input" /></div>
                      <div><label className="label">Apellido</label><input name="guardianLastName" defaultValue={student.guardian.lastName} className="input" /></div>
                    </div>
                    <div><label className="label">Relación</label><input name="guardianRelationship" defaultValue={student.guardian.relationship} className="input" /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="label">Teléfono</label><input name="guardianPhone" defaultValue={student.guardian.phone} className="input" /></div>
                      <div><label className="label">Email</label><input name="guardianEmail" defaultValue={student.guardian.email ?? ""} className="input" /></div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Sin responsable legal</p>
                )}
              </fieldset>

              <div className="flex gap-2 justify-end pt-2 border-t border-gray-100">
                <button type="button" onClick={() => { setShowEditModal(false); setEditError(""); }} className="btn-secondary">Cancelar</button>
                <button type="submit" disabled={loading} className="btn-primary">
                  {loading ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
