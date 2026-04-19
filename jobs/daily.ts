import { PrismaClient } from "@prisma/client";
import { addDays, format, startOfMonth, endOfMonth } from "date-fns";
import { sendDocumentExpiringEmail, sendPaymentDueEmail } from "../src/lib/email";

const prisma = new PrismaClient();

async function run() {
  console.log("[DAILY JOB]", new Date().toISOString());

  const config = await prisma.systemConfig.findMany({
    where: { key: { in: ["payment_due_day"] } },
  });
  const configMap: Record<string, string> = {};
  config.forEach((c) => { configMap[c.key] = c.value; });

  const today = new Date();
  const paymentDueDay = parseInt(configMap.payment_due_day || "10");

  if (today.getDate() === paymentDueDay - 3) {
    console.log("[DAILY] Enviando recordatorios de pago...");
    const activeStudents = await prisma.student.findMany({
      where: { status: "ACTIVE" },
      include: { user: { select: { id: true, email: true } } },
    });

    const currentPeriod = format(today, "yyyy-MM");

    for (const student of activeStudents) {
      const paid = await prisma.payment.findFirst({
        where: { studentId: student.id, period: currentPeriod, status: { in: ["PENDING", "APPROVED"] } },
      });

      if (!paid) {
        await prisma.notification.create({
          data: {
            userId: student.user.id,
            type: "PAYMENT_DUE",
            title: "Recordatorio de pago mensual",
            body: `Tu pago mensual vence el día ${paymentDueDay}. Por favor informá tu pago.`,
          },
        });
        await sendPaymentDueEmail(student.user.email, paymentDueDay);
      }
    }
  }

  // Check expiring documents (within 30 days)
  console.log("[DAILY] Verificando documentos por vencer...");
  const in30Days = addDays(today, 30);

  const expiringDocs = await prisma.document.findMany({
    where: {
      status: "APPROVED",
      expiresAt: { gte: today, lte: in30Days },
    },
    include: {
      student: { include: { user: { select: { id: true, email: true } } } },
    },
  });

  for (const doc of expiringDocs) {
    const alreadyNotified = await prisma.notification.findFirst({
      where: {
        userId: doc.student.user.id,
        type: "DOCUMENT_EXPIRING",
        createdAt: { gte: startOfMonth(today), lte: endOfMonth(today) },
      },
    });

    if (!alreadyNotified) {
      const expiresStr = doc.expiresAt ? format(doc.expiresAt, "dd/MM/yyyy") : "";
      await prisma.notification.create({
        data: {
          userId: doc.student.user.id,
          type: "DOCUMENT_EXPIRING",
          title: `Tu documento vence pronto`,
          body: `Tu ${doc.type === "APTO_FISICO" ? "Apto Físico" : doc.type} vence el ${expiresStr}. Actualizá tu documentación.`,
        },
      });
      await sendDocumentExpiringEmail(doc.student.user.email, doc.type, expiresStr);
    }
  }

  // Mark expired documents
  const expiredDocs = await prisma.document.updateMany({
    where: {
      status: "APPROVED",
      expiresAt: { lt: today },
    },
    data: { status: "EXPIRED" },
  });
  if (expiredDocs.count > 0) {
    console.log(`[DAILY] Marcados ${expiredDocs.count} documentos como vencidos`);
  }

  console.log("[DAILY JOB] Completado");
}

run()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
