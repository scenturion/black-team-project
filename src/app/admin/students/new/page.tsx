"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewStudentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const fd = new FormData(e.currentTarget);
    const data = Object.fromEntries(fd.entries());

    const res = await fetch("/api/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...data,
        ...(data.weight ? { weight: parseFloat(data.weight as string) } : {}),
      }),
    });

    if (res.ok) {
      const student = await res.json();
      router.push(`/admin/students/${student.id}`);
    } else {
      const err = await res.json();
      setError(err.error || "Error al crear el alumno");
    }
    setLoading(false);
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/students" className="text-gray-500 hover:text-gray-700">← Volver</Link>
        <h1 className="page-title">Nuevo alumno</h1>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-4">
        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Nombre *</label>
            <input name="firstName" required className="input" placeholder="Juan" />
          </div>
          <div>
            <label className="label">Apellido *</label>
            <input name="lastName" required className="input" placeholder="Pérez" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Email *</label>
            <input name="email" type="email" required className="input" />
          </div>
          <div>
            <label className="label">Contraseña *</label>
            <input name="password" type="password" required minLength={6} className="input" placeholder="Mínimo 6 caracteres" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Fecha de nacimiento *</label>
            <input name="birthDate" type="date" required className="input" />
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

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Teléfono</label>
            <input name="phone" type="tel" className="input" />
          </div>
          <div>
            <label className="label">DNI</label>
            <input name="dni" className="input" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Contacto de emergencia *</label>
            <input name="emergencyContactName" required className="input" placeholder="Nombre" />
          </div>
          <div>
            <label className="label">Teléfono de emergencia *</label>
            <input name="emergencyContactPhone" required className="input" placeholder="Teléfono" />
          </div>
        </div>

        <div>
          <label className="label">Observaciones médicas</label>
          <textarea name="medicalNotes" className="input" rows={2} />
        </div>
        <div>
          <label className="label">Alergias / Lesiones</label>
          <textarea name="allergiesAndInjuries" className="input" rows={2} />
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <Link href="/admin/students" className="btn-secondary">Cancelar</Link>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? "Creando..." : "Crear alumno"}
          </button>
        </div>
      </form>
    </div>
  );
}
