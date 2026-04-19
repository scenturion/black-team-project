import { prisma } from "./db";
import { NotificationType } from "@prisma/client";
import { sendEmail } from "./email";

export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  sendEmailTo?: string
) {
  const notification = await prisma.notification.create({
    data: { userId, type, title, body },
  });

  if (sendEmailTo) {
    try {
      await sendEmail({ to: sendEmailTo, subject: title, html: `<p>${body}</p>` });
      await prisma.notification.update({
        where: { id: notification.id },
        data: { emailSentAt: new Date() },
      });
    } catch (e) {
      console.error("Error enviando email:", e);
    }
  }

  return notification;
}

export async function notifyStudentApproved(userId: string, email: string) {
  await createNotification(
    userId,
    NotificationType.STUDENT_APPROVED,
    "¡Tu cuenta fue aprobada!",
    "Tu cuenta fue aprobada. Ya podés reservar tus clases.",
    email
  );
}

export async function notifyPaymentApproved(userId: string, email: string, period: string) {
  await createNotification(
    userId,
    NotificationType.PAYMENT_APPROVED,
    `Pago aprobado - ${period}`,
    `Tu pago del período ${period} fue aprobado.`,
    email
  );
}

export async function notifyPaymentRejected(userId: string, email: string, period: string, reason?: string) {
  await createNotification(
    userId,
    NotificationType.PAYMENT_REJECTED,
    `Pago rechazado - ${period}`,
    `Tu pago del período ${period} fue rechazado.${reason ? ` Motivo: ${reason}` : ""}`,
    email
  );
}

export async function notifyClassCancelled(userIds: string[], className: string, date: string) {
  for (const userId of userIds) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) continue;
    await createNotification(
      userId,
      NotificationType.CLASS_CANCELLED,
      `Clase cancelada: ${className}`,
      `La clase ${className} del ${date} fue cancelada.`,
      user.email
    );
  }
}

export async function notifyClassModified(userIds: string[], className: string, date: string, changes: string) {
  for (const userId of userIds) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) continue;
    await createNotification(
      userId,
      NotificationType.CLASS_MODIFIED,
      `Cambio en clase: ${className}`,
      `La clase ${className} del ${date} fue modificada. ${changes}`,
      user.email
    );
  }
}

export async function notifyPaymentPendingReview(adminUserId: string, studentName: string) {
  await createNotification(
    adminUserId,
    NotificationType.PAYMENT_PENDING_REVIEW,
    "Nuevo pago para revisar",
    `${studentName} informó un pago. Revisalo en el panel de pagos.`
  );
}
