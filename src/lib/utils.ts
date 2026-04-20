export function getCurrentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function formatPeriod(period: string): string {
  const [year, month] = period.split("-");
  const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  return `${months[parseInt(month) - 1]} ${year}`;
}

export function isMinor(birthDate: Date): boolean {
  const today = new Date();
  const age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    return age - 1 < 18;
  }
  return age < 18;
}

export function canCancelBooking(sessionDate: Date, sessionTime: string, cancellationHours: number): boolean {
  const [hours, minutes] = sessionTime.split(":").map(Number);
  const classDateTime = new Date(sessionDate);
  classDateTime.setHours(hours, minutes, 0, 0);
  const now = new Date();
  const diffHours = (classDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
  return diffHours >= cancellationHours;
}

export function docTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    APTO_FISICO: "Apto Físico",
    DESLINDE_CONSENTIMIENTO: "Deslinde / Consentimiento",
    AUTORIZACION_TUTOR: "Autorización de Tutor",
    OTRO: "Otro",
  };
  return labels[type] || type;
}

export function beltLabel(belt: string): string {
  const labels: Record<string, string> = {
    BLANCO: "Blanco",
    AZUL: "Azul",
    VIOLETA: "Violeta",
    MARRON: "Marrón",
    NEGRO: "Negro",
  };
  return labels[belt] || belt;
}
