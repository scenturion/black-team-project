"use client";

import { useState } from "react";

export default function InviteButton() {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    setLoading(true);
    setUrl(null);
    const res = await fetch("/api/invitations", { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      setUrl(data.url);
    } else {
      alert("Error al generar la invitación");
    }
    setLoading(false);
  };

  const copy = async () => {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-2">
      <button onClick={generate} disabled={loading} className="btn-secondary">
        {loading ? "Generando..." : "Generar invitación"}
      </button>
      {url && (
        <div className="flex gap-2 items-center">
          <input value={url} readOnly className="input text-xs flex-1 font-mono" />
          <button onClick={copy} className="btn-secondary btn-sm shrink-0">
            {copied ? "✓ Copiado" : "Copiar"}
          </button>
        </div>
      )}
    </div>
  );
}
