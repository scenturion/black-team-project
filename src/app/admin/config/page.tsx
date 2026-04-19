"use client";

import { useEffect, useState } from "react";

interface Config { id: string; key: string; value: string; description: string | null }

const KEY_LABELS: Record<string, string> = {
  cancellation_hours: "Horas mínimas para cancelar reserva",
  payment_due_day: "Día de vencimiento de pago mensual",
  class_reminder_hours: "Horas antes del recordatorio de clase",
  belt_options: "Opciones de cinturón (JSON array)",
  belt_grade_max: "Grado máximo de cinturón",
  academy_name: "Nombre de la academia",
  terms_and_conditions: "Términos y condiciones",
};

export default function ConfigPage() {
  const [configs, setConfigs] = useState<Config[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/config").then((r) => r.json()).then((data: Config[]) => {
      setConfigs(data);
      const vals: Record<string, string> = {};
      data.forEach((c) => { vals[c.key] = c.value; });
      setValues(vals);
    });
  }, []);

  const save = async () => {
    setSaving(true);
    await fetch("/api/config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="page-title">Configuración del sistema</h1>

      <div className="card space-y-4">
        {configs.map((c) => (
          <div key={c.key}>
            <label className="label">{KEY_LABELS[c.key] || c.key}</label>
            {c.description && <p className="text-xs text-gray-400 mb-1">{c.description}</p>}
            {c.key === "terms_and_conditions" ? (
              <textarea
                className="input"
                rows={4}
                value={values[c.key] || ""}
                onChange={(e) => setValues((prev) => ({ ...prev, [c.key]: e.target.value }))}
              />
            ) : (
              <input
                className="input"
                value={values[c.key] || ""}
                onChange={(e) => setValues((prev) => ({ ...prev, [c.key]: e.target.value }))}
              />
            )}
          </div>
        ))}

        <div className="flex items-center gap-3 pt-2">
          <button onClick={save} disabled={saving} className="btn-primary">
            {saving ? "Guardando..." : "Guardar configuración"}
          </button>
          {saved && <span className="text-green-600 text-sm font-medium">¡Guardado!</span>}
        </div>
      </div>
    </div>
  );
}
