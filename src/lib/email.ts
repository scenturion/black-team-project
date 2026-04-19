import sgMail from "@sendgrid/mail";

const FROM = process.env.EMAIL_FROM || "noreply@bjj.local";
const FROM_NAME = process.env.EMAIL_FROM_NAME || "BJJ Administrator";
const API_KEY = process.env.SENDGRID_API_KEY;

if (API_KEY) {
  sgMail.setApiKey(API_KEY);
}

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(payload: EmailPayload): Promise<void> {
  if (!API_KEY) {
    console.log(`[EMAIL STUB] Para: ${payload.to} | Asunto: ${payload.subject}`);
    return;
  }
  await sgMail.send({
    to: payload.to,
    from: { email: FROM, name: FROM_NAME },
    subject: payload.subject,
    html: payload.html,
    text: payload.text || payload.html.replace(/<[^>]+>/g, ""),
  });
}

export async function sendClassReminderEmail(to: string, className: string, date: string, time: string) {
  await sendEmail({
    to,
    subject: `Recordatorio: ${className} hoy a las ${time}`,
    html: `<p>Hola,</p><p>Te recordamos que tenés la clase <strong>${className}</strong> hoy <strong>${date}</strong> a las <strong>${time}</strong>.</p><p>¡Nos vemos!</p>`,
  });
}

export async function sendPaymentApprovedEmail(to: string, period: string) {
  await sendEmail({
    to,
    subject: `Pago aprobado - ${period}`,
    html: `<p>Tu pago del período <strong>${period}</strong> fue aprobado. ¡Gracias!</p>`,
  });
}

export async function sendPaymentRejectedEmail(to: string, period: string, reason?: string) {
  await sendEmail({
    to,
    subject: `Pago rechazado - ${period}`,
    html: `<p>Tu pago del período <strong>${period}</strong> fue rechazado.${reason ? ` Motivo: ${reason}` : ""}</p><p>Por favor contactate con la academia.</p>`,
  });
}

export async function sendStudentApprovedEmail(to: string) {
  await sendEmail({
    to,
    subject: "¡Tu cuenta fue aprobada!",
    html: `<p>¡Bienvenido! Tu cuenta fue aprobada. Ya podés ingresar a la plataforma y reservar tus clases.</p>`,
  });
}

export async function sendPaymentDueEmail(to: string, dueDay: number) {
  await sendEmail({
    to,
    subject: "Recordatorio de pago mensual",
    html: `<p>Tu pago mensual vence el día <strong>${dueDay}</strong>. Por favor informá tu pago a través de la plataforma.</p>`,
  });
}

export async function sendDocumentExpiringEmail(to: string, docType: string, expiresAt: string) {
  await sendEmail({
    to,
    subject: `Tu ${docType} vence pronto`,
    html: `<p>Tu <strong>${docType}</strong> vence el <strong>${expiresAt}</strong>. Por favor actualizá tu documentación en la plataforma.</p>`,
  });
}
