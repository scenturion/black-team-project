import { PrismaClient } from "@prisma/client";
import { addHours, addMinutes } from "date-fns";
import { sendClassReminderEmail } from "../src/lib/email";

const prisma = new PrismaClient();

async function run() {
  console.log("[CLASS-REMINDERS]", new Date().toISOString());

  const config = await prisma.systemConfig.findUnique({ where: { key: "class_reminder_hours" } });
  const reminderHours = config ? parseInt(config.value) : 1;

  const now = new Date();
  const windowStart = addMinutes(now, -15);
  const windowEnd = addHours(now, reminderHours + 0.5);

  const sessions = await prisma.classSession.findMany({
    where: {
      status: "ACTIVE",
      date: {
        gte: new Date(now.setHours(0, 0, 0, 0)),
        lte: new Date(now.setHours(23, 59, 59, 999)),
      },
    },
    include: {
      classSchedule: true,
      bookings: {
        where: { status: "RESERVED" },
        include: { student: { include: { user: { select: { id: true, email: true } } } } },
      },
    },
  });

  for (const session of sessions) {
    const time = session.startTime ?? session.classSchedule.startTime;
    const [hours, minutes] = time.split(":").map(Number);
    const classDateTime = new Date(session.date);
    classDateTime.setHours(hours, minutes, 0, 0);

    const diffMs = classDateTime.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < reminderHours - 0.25 || diffHours > reminderHours + 0.25) continue;

    for (const booking of session.bookings) {
      const alreadySent = await prisma.notification.findFirst({
        where: {
          userId: booking.student.user.id,
          type: "CLASS_REMINDER",
          createdAt: { gte: windowStart, lte: windowEnd },
        },
      });

      if (alreadySent) continue;

      await prisma.notification.create({
        data: {
          userId: booking.student.user.id,
          type: "CLASS_REMINDER",
          title: `Recordatorio: ${session.classSchedule.name}`,
          body: `Tu clase "${session.classSchedule.name}" empieza en ${reminderHours} hora(s) a las ${time}.`,
        },
      });

      await sendClassReminderEmail(
        booking.student.user.email,
        session.classSchedule.name,
        session.date.toLocaleDateString("es-AR"),
        time
      );
    }
  }

  console.log("[CLASS-REMINDERS] Completado");
}

run()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
