import { PrismaClient, Role, DayOfWeek } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando seed...");

  // Admin user
  const adminPassword = await bcrypt.hash("admin123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@bjj.local" },
    update: {},
    create: {
      email: "admin@bjj.local",
      password: adminPassword,
      role: Role.ADMIN,
    },
  });
  console.log("Admin creado:", admin.email);

  // Default SystemConfig
  const configs = [
    { key: "cancellation_hours", value: "4", description: "Horas mínimas de anticipación para cancelar una reserva" },
    { key: "payment_due_day", value: "10", description: "Día del mes en que vence el pago mensual" },
    { key: "class_reminder_hours", value: "1", description: "Horas antes de la clase para enviar recordatorio" },
    { key: "belt_options", value: JSON.stringify(["BLANCO", "AZUL", "VIOLETA", "MARRON", "NEGRO"]), description: "Opciones de cinturón disponibles" },
    { key: "belt_grade_max", value: "10", description: "Grado máximo de cinturón" },
    { key: "academy_name", value: "BJJ Academy", description: "Nombre de la academia" },
    { key: "terms_and_conditions", value: "Al registrarte en nuestra academia aceptás los términos y condiciones de uso...", description: "Texto de términos y condiciones" },
  ];

  for (const config of configs) {
    await prisma.systemConfig.upsert({
      where: { key: config.key },
      update: {},
      create: { ...config, updatedById: admin.id },
    });
  }
  console.log("Configuraciones creadas");

  // Default plans
  const plans = [
    {
      name: "Plan Libre",
      description: "Acceso ilimitado a todas las clases disponibles según tu plan.",
      monthlyPrice: 8000,
      classesPerWeek: null,
      allowsFreeBooking: true,
      allowsReplacement: true,
      maxActiveBookings: null,
    },
    {
      name: "Plan 2 veces por semana",
      description: "Hasta 2 clases por semana. Las clases no usadas no se acumulan.",
      monthlyPrice: 5000,
      classesPerWeek: 2,
      allowsFreeBooking: false,
      allowsReplacement: true,
      maxActiveBookings: 2,
    },
    {
      name: "Plan 3 veces por semana",
      description: "Hasta 3 clases por semana. Las clases no usadas no se acumulan.",
      monthlyPrice: 6500,
      classesPerWeek: 3,
      allowsFreeBooking: false,
      allowsReplacement: true,
      maxActiveBookings: 3,
    },
  ];

  for (const plan of plans) {
    const existing = await prisma.plan.findFirst({ where: { name: plan.name } });
    if (!existing) {
      await prisma.plan.create({ data: plan });
    }
  }
  console.log("Planes creados");

  // Sample class schedules
  const schedules = [
    { name: "BJJ Principiantes - Lunes", dayOfWeek: DayOfWeek.LUNES, startTime: "19:00", duration: 60, maxCapacity: 15 },
    { name: "BJJ Avanzado - Miércoles", dayOfWeek: DayOfWeek.MIERCOLES, startTime: "20:00", duration: 90, maxCapacity: 12 },
    { name: "BJJ Todos los niveles - Viernes", dayOfWeek: DayOfWeek.VIERNES, startTime: "19:00", duration: 60, maxCapacity: 20 },
    { name: "BJJ Competición - Sábado", dayOfWeek: DayOfWeek.SABADO, startTime: "10:00", duration: 120, maxCapacity: 10 },
  ];

  for (const schedule of schedules) {
    const existing = await prisma.classSchedule.findFirst({ where: { name: schedule.name } });
    if (!existing) {
      await prisma.classSchedule.create({
        data: {
          ...schedule,
          isActive: true,
          validFrom: new Date("2024-01-01"),
        },
      });
    }
  }
  console.log("Clases ejemplo creadas");

  console.log("\nSeed completado.");
  console.log("Admin: admin@bjj.local / admin123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
