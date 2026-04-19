"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterForm({ token }: { token?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isMinor, setIsMinor] = useState(false);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<Record<string, string>>({});

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md text-center space-y-4">
          <img src="/illustration-invitation-only.svg" alt="Acceso restringido" width={80} height={80} className="mx-auto" />
          <h1 className="text-2xl font-bold text-gray-900">Acceso solo por invitación</h1>
          <p className="text-gray-500">
            Para registrarte necesitás un link de invitación. Contactá al administrador de la academia.
          </p>
          <Link href="/login" className="btn-secondary inline-block mt-4">
            Ir al login
          </Link>
        </div>
      </div>
    );
  }

  const checkMinor = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    const age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    setIsMinor(age < 18 || (age === 18 && m < 0) || (age === 18 && m === 0 && today.getDate() < birth.getDate()));
  };

  const handleStep1 = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data: Record<string, string> = {};
    fd.forEach((v, k) => { data[k] = v as string; });
    setFormData(data);
    checkMinor(data.birthDate);
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const fd = new FormData(e.currentTarget);
    const step2Data: Record<string, string> = {};
    fd.forEach((v, k) => { step2Data[k] = v as string; });

    const payload: Record<string, unknown> = { ...formData, ...step2Data, token };

    if (isMinor) {
      payload.guardian = {
        firstName: step2Data.guardianFirstName,
        lastName: step2Data.guardianLastName,
        phone: step2Data.guardianPhone,
        email: step2Data.guardianEmail || undefined,
        relationship: step2Data.guardianRelationship,
      };
    }

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      router.push("/student/dashboard");
      router.refresh();
    } else {
      const err = await res.json();
      setError(err.error || "Error en el registro");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-3">
          <img src="/logo-horizontal-claro.svg" alt="BJJ Administrator" width={200} height={40} />
          <p className="text-gray-500 text-sm">Paso {step} de 2</p>
        </div>

        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

        {step === 1 && (
          <form onSubmit={handleStep1} className="card space-y-4">
            <h2 className="section-title">Datos personales</h2>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Nombre *</label><input name="firstName" required className="input" /></div>
              <div><label className="label">Apellido *</label><input name="lastName" required className="input" /></div>
            </div>
            <div><label className="label">Email *</label><input name="email" type="email" required className="input" /></div>
            <div><label className="label">Contraseña *</label><input name="password" type="password" required minLength={6} className="input" placeholder="Mínimo 6 caracteres" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Fecha de nacimiento *</label>
                <input name="birthDate" type="date" required className="input" onChange={(e) => checkMinor(e.target.value)} />
              </div>
              <div>
                <label className="label">Sexo *</label>
                <select name="sex" required className="input">
                  <option value="MASCULINO">Masculino</option>
                  <option value="FEMENINO">Femenino</option>
                  <option value="OTRO">Otro</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Teléfono</label><input name="phone" type="tel" className="input" /></div>
              <div><label className="label">DNI</label><input name="dni" className="input" /></div>
            </div>
            {isMinor && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
                Por ser menor de edad, deberás ingresar los datos de tu responsable legal en el siguiente paso.
              </div>
            )}
            <button type="submit" className="btn-primary w-full">Siguiente →</button>
            <p className="text-center text-sm text-gray-500">
              ¿Ya tenés cuenta? <Link href="/login" className="text-blue-600 hover:underline">Ingresar</Link>
            </p>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleSubmit} className="card space-y-4">
            <h2 className="section-title">Contacto y salud</h2>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Contacto de emergencia *</label><input name="emergencyContactName" required className="input" placeholder="Nombre" /></div>
              <div><label className="label">Teléfono *</label><input name="emergencyContactPhone" required className="input" placeholder="Teléfono" /></div>
            </div>
            <div><label className="label">Observaciones médicas</label><textarea name="medicalNotes" className="input" rows={2} placeholder="Condiciones médicas relevantes" /></div>
            <div><label className="label">Alergias / Lesiones</label><textarea name="allergiesAndInjuries" className="input" rows={2} /></div>

            {isMinor && (
              <>
                <hr className="border-gray-200" />
                <h2 className="section-title">Responsable legal</h2>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="label">Nombre *</label><input name="guardianFirstName" required className="input" /></div>
                  <div><label className="label">Apellido *</label><input name="guardianLastName" required className="input" /></div>
                </div>
                <div><label className="label">Relación *</label><input name="guardianRelationship" required className="input" placeholder="Madre, padre, tutor..." /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="label">Teléfono *</label><input name="guardianPhone" required className="input" /></div>
                  <div><label className="label">Email</label><input name="guardianEmail" type="email" className="input" /></div>
                </div>
              </>
            )}

            <div className="flex gap-2">
              <button type="button" onClick={() => setStep(1)} className="btn-secondary flex-1">← Anterior</button>
              <button type="submit" disabled={loading} className="btn-primary flex-1">
                {loading ? "Registrando..." : "Completar registro"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
