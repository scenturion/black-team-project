# Arquitectura técnica — bjj-administrator

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 14.2 (App Router) |
| Lenguaje | TypeScript |
| ORM | Prisma 5.22 |
| Base de datos | PostgreSQL 16 |
| Auth | JWT manual (`jsonwebtoken` + `jose`) |
| Estilos | Tailwind CSS 3 + `tailwind.config.ts` con paleta `primary` personalizada |
| Email | SendGrid (`@sendgrid/mail`) |
| Storage | Local `public/uploads/` |
| Validación | Zod |
| Jobs | Scripts TypeScript con `tsx` |

---

## Estructura de directorios

```
bjj-administrator/
├── prisma/
│   ├── schema.prisma       # Modelos de datos
│   └── seed.ts             # Datos iniciales
├── src/
│   ├── app/
│   │   ├── (auth)/         # /login, /register (route group sin layout compartido)
│   │   │   ├── login/page.tsx
│   │   │   └── register/
│   │   │       ├── page.tsx          # Server Component — lee token de searchParams
│   │   │       └── RegisterForm.tsx  # Client Component — formulario de 2 pasos
│   │   ├── admin/          # Rutas /admin/*
│   │   │   ├── layout.tsx
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── students/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── InviteButton.tsx        # Client Component — genera link de invitación
│   │   │   │   ├── new/page.tsx
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx
│   │   │   │       └── StudentActions.tsx  # Client Component — acciones + modal de edición
│   │   │   ├── classes/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── new/page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── plans/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── new/page.tsx
│   │   │   │   ├── [id]/page.tsx
│   │   │   │   └── PlanToggle.tsx          # Client Component inline
│   │   │   ├── payments/page.tsx
│   │   │   ├── attendance/page.tsx
│   │   │   ├── documents/page.tsx
│   │   │   └── config/page.tsx
│   │   ├── student/        # Rutas /student/*
│   │   │   ├── layout.tsx
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── classes/page.tsx
│   │   │   ├── bookings/page.tsx
│   │   │   ├── payments/page.tsx
│   │   │   ├── documents/page.tsx
│   │   │   └── profile/page.tsx
│   │   ├── api/            # API Routes (Next.js Route Handlers)
│   │   ├── page.tsx        # Redirect raíz → /login
│   │   ├── layout.tsx      # Layout raíz
│   │   └── globals.css     # Tailwind + clases de componentes custom
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AdminNav.tsx
│   │   │   └── StudentNav.tsx
│   │   └── ui/
│   │       └── NotificationBell.tsx
│   ├── lib/
│   │   ├── auth.ts         # JWT sign/verify, cookies
│   │   ├── db.ts           # Prisma client singleton
│   │   ├── email.ts        # SendGrid wrapper + stubs
│   │   ├── storage.ts      # Guardar/borrar archivos locales
│   │   ├── notifications.ts# Crear notificaciones in-app + email
│   │   ├── audit.ts        # Registro de auditoría
│   │   ├── classes.ts      # Lógica de sesiones y cupos semanales
│   │   └── utils.ts        # apiError/apiSuccess, helpers
│   ├── middleware.ts        # Auth guard (Edge Runtime, usa jose)
│   └── types/index.ts
├── jobs/
│   ├── daily.ts            # Vencimientos, recordatorios de pago
│   └── class-reminders.ts  # Recordatorio 1h antes de clase
├── public/
│   ├── uploads/            # Archivos subidos por usuarios en runtime (no commitear)
│   └── [assets estáticos]  # Logos, favicons, ilustraciones (ver requerimiento-disenio.txt)
├── .env                    # Para Prisma CLI (solo DATABASE_URL)
├── .env.local              # Para Next.js runtime (toma precedencia)
├── .env.example            # Template de variables de entorno
├── next.config.mjs         # Configuración Next.js (serverComponentsExternalPackages)
├── tailwind.config.ts      # Config Tailwind con colores primary personalizados
├── docker-compose.yml      # PostgreSQL local
├── requerimiento-disenio.txt # Brief de assets visuales para el equipo de diseño
├── SETUP.md                # Guía de inicio rápido
└── ARQUITECTURA.md         # Este archivo
```

> **Nota**: No existe `.gitignore` en el proyecto actualmente. Tampoco hay suite de tests configurada.

---

## Autenticación

- **Cookie**: `bjj_token`, httpOnly, 7 días, SameSite=lax
- **Middleware** (`src/middleware.ts`): corre en Edge Runtime, usa `jose` para verificar el JWT (compatible con Edge, sin Node.js APIs)
- **API routes**: usan `getSession()` de `src/lib/auth.ts`, que usa `jsonwebtoken` (solo corre en Node.js)
- **Rutas públicas**: `/login`, `/register`, `/api/auth/*`, `/api/health`
- **Assets estáticos excluidos del guard**: el matcher excluye cualquier path terminado en `.svg`, `.png`, `.jpg`, `.jpeg`, `.webp`, `.ico`, `.gif`, `.css`, `.js`, `.woff2` y similares — se sirven sin verificar sesión
- **Redirects automáticos**: admin → `/admin/dashboard`, student → `/student/dashboard`

---

## Modelo de datos

```
User ──── Student ──── Guardian (menor de edad)
             │
             ├── StudentPlan ──── Plan ──── ClassSchedulePlan
             ├── Booking ──────── ClassSession ──── ClassSchedule
             ├── Attendance ─────── ClassSession
             ├── Payment
             └── Document

User ──── Notification
User ──── AuditLog
User ──── Invitation   (tokens de un solo uso para registro)
SystemConfig  (tabla key/value para configuración)
```

### Enums

| Enum | Valores |
|------|---------|
| `Role` | ADMIN, STUDENT |
| `StudentStatus` | PENDING_APPROVAL, ACTIVE, INACTIVE |
| `Sex` | MASCULINO, FEMENINO, OTRO |
| `DayOfWeek` | LUNES … DOMINGO |
| `SessionStatus` | ACTIVE, CANCELLED, MODIFIED |
| `BookingStatus` | RESERVED, CANCELLED_BY_STUDENT, CANCELLED_BY_ADMIN, ATTENDED, ABSENT |
| `PaymentStatus` | PENDING, APPROVED, REJECTED |
| `DocumentType` | APTO_FISICO, DESLINDE_CONSENTIMIENTO, AUTORIZACION_TUTOR, OTRO |
| `DocumentStatus` | PENDING, APPROVED, EXPIRED |
| `NotificationType` | PAYMENT_DUE, PAYMENT_PENDING_REVIEW, PAYMENT_APPROVED, PAYMENT_REJECTED, CLASS_REMINDER, CLASS_CANCELLED, CLASS_MODIFIED, DOCUMENT_EXPIRING, DOCUMENT_MISSING, STUDENT_APPROVED |

### Notas de diseño

- `ClassSchedule` = plantilla recurrente (ej: "BJJ General — Lunes, Miércoles y Viernes a las 20 hs"). El campo `days` es un array de `DayOfWeek` (ej: `["LUNES", "MIERCOLES", "VIERNES"]`), lo que permite que una misma clase ocurra en múltiples días de la semana con el mismo horario y capacidad.
- `ClassSchedule.deletedAt` (`DateTime?`): baja lógica. Cuando se "elimina" una clase desde el admin, se setea este campo en lugar de borrar el registro. Las sesiones y reservas históricas se conservan. Las clases con `deletedAt != null` se excluyen de todos los listados (admin y alumnos) y de la generación lazy de sesiones.
- `ClassSchedule.isActive` (`Boolean`): desactivar/reactivar temporalmente una clase sin eliminarla. Las clases inactivas no generan sesiones nuevas y no aparecen en la vista de reservas del alumno.
- `ClassSession` = instancia concreta de una fecha. Se genera **lazy** mediante `ensureSessionsForWeek()` al consultar la semana. Por cada `ClassSchedule` con `isActive: true` y `deletedAt: null`, se crea **una `ClassSession` por cada día** del array `days`.
- El alumno reserva sesiones individuales — puede anotarse al martes de Femenino sin estar en el jueves.
- `Booking.weekStart` = lunes de la semana, usado para contar cupo semanal por alumno
- `Student.belt` es `String` (no enum Prisma) para que las opciones sean configurables desde `SystemConfig.belt_options`
- `Student.beltLockedByAdmin` (`Boolean @default(false)`): cuando el admin edita `belt` o `beltGrade` vía PATCH, este flag se activa. Una vez activo, el alumno solo puede ver su cinturón/grado desde el perfil, no modificarlos

---

## Lógica de reservas y cupos

Archivo clave: `src/lib/classes.ts`

1. Al listar clases de una semana, `ensureSessionsForWeek()` crea los `ClassSession` faltantes a partir de los `ClassSchedule` con `isActive: true` y `deletedAt: null`
2. Al reservar se valida:
   - El alumno tiene status `ACTIVE`
   - Tiene un `StudentPlan` activo
   - No superó el cupo semanal: `count(bookings WHERE status IN [RESERVED, ATTENDED] AND weekStart = lunes)`
   - La sesión tiene lugares disponibles: `effectiveMaxCapacity - count(bookings activos)`
3. **Cancelación**: si se hace dentro de la ventana configurable (`cancellation_hours`, default 4h antes), el booking pasa a `CANCELLED_BY_STUDENT` y el cupo semanal queda libre
4. **Reprogramación**: no existe como operación separada — el alumno cancela (recupera cupo) y reserva otra sesión disponible de la misma semana. Las clases no usadas al finalizar la semana se pierden (no acumulan)

---

## API Routes

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/auth/login` | Login, setea cookie |
| POST | `/api/auth/register` | Registro de alumno |
| POST | `/api/auth/logout` | Elimina cookie |
| GET | `/api/auth/me` | Datos del usuario actual |
| GET / POST | `/api/students` | Listar / crear alumno (admin) |
| GET / PATCH / DELETE | `/api/students/[id]` | Ver / editar / eliminar alumno. Admin: edita todos los campos incluyendo email, password y guardian (al editar belt/beltGrade activa `beltLockedByAdmin`). Alumno: edita phone, weight, emergencia, notas médicas, termsAcceptedAt; puede editar belt/beltGrade solo si `beltLockedByAdmin === false` |
| POST | `/api/students/[id]/approve` | Aprobar alumno (admin) |
| POST | `/api/students/[id]/plan` | Asignar plan (admin) |
| GET / POST | `/api/plans` | Listar / crear planes |
| GET / PUT / DELETE | `/api/plans/[id]` | Ver / editar / eliminar plan |
| GET / POST | `/api/classes/schedules` | Listar plantillas (excluye `deletedAt != null`) / crear. POST acepta `days: DayOfWeek[]` |
| GET / PATCH / DELETE | `/api/classes/schedules/[id]` | Ver / editar / eliminar (baja lógica: setea `deletedAt`). PATCH acepta `days: DayOfWeek[]`, `name`, `startTime`, `duration`, `maxCapacity`, `planIds`, `isActive` |
| GET / POST | `/api/classes/sessions?week=YYYY-MM-DD` | Sesiones de una semana (genera lazy, solo de schedules activos y no eliminados) / crear sesión manual |
| GET / PUT / DELETE | `/api/classes/sessions/[id]` | Ver / cancelar o modificar sesión puntual |
| GET / POST | `/api/bookings` | Ver / crear reservas |
| GET / PUT / DELETE | `/api/bookings/[id]` | Ver / editar / cancelar reserva |
| GET / POST | `/api/attendance` | Ver / registrar asistencia |
| GET / PUT / DELETE | `/api/attendance/[id]` | Ver / corregir / eliminar asistencia |
| GET / POST | `/api/payments` | Ver / informar pagos (multipart) |
| GET / PUT / DELETE | `/api/payments/[id]` | Ver / editar / eliminar pago |
| POST | `/api/payments/[id]/review` | Aprobar o rechazar pago (admin) |
| GET / POST | `/api/documents` | Ver / subir documentos (multipart) |
| GET / PUT / DELETE | `/api/documents/[id]` | Ver / editar / eliminar documento |
| POST | `/api/documents/[id]/review` | Revisar documento (admin) |
| GET / POST | `/api/notifications` | Notificaciones del usuario autenticado / crear notificación |
| GET / PUT / DELETE | `/api/notifications/[id]` | Ver / marcar leída / eliminar notificación |
| GET / PUT | `/api/config` | Leer / actualizar SystemConfig |
| GET | `/api/health` | Health check (verifica conexión DB) |
| POST | `/api/invitations` | Generar link de invitación de un solo uso (admin) |
| GET | `/api/invitations` | Listar invitaciones generadas (admin) |

---

## Flujo de registro por invitación

El registro de alumnos es **exclusivamente por invitación**. No existe auto-registro público.

1. El admin abre `/admin/students` y hace clic en **"Generar invitación"**
2. Se llama `POST /api/invitations` → devuelve una URL del tipo `http://localhost:3000/register?token=<cuid>`
3. El admin comparte esa URL con el futuro alumno
4. El alumno visita la URL, completa el formulario de 2 pasos e incluye el token en el body de `POST /api/auth/register`
5. El backend valida que el token exista, no esté usado y no haya expirado (TTL: 7 días)
6. Tras el registro exitoso, el token se marca `used=true, usedAt=now()` — no puede reutilizarse
7. Si el alumno intenta visitar `/register` sin token, ve un mensaje de "Acceso solo por invitación"

**Modelo `Invitation`:** `token` (cuid único), `used` (boolean), `usedAt`, `expiresAt`, `createdById` → User.

---

## Clases de componentes CSS (globals.css)

Definidas en `@layer components`:

| Clase | Descripción |
|-------|-------------|
| `.btn` | Base button |
| `.btn-primary` | Botón azul (acción principal) |
| `.btn-secondary` | Botón blanco/gris |
| `.btn-danger` | Botón rojo |
| `.btn-success` | Botón verde |
| `.btn-sm` | Variante pequeña |
| `.input` | Campo de formulario |
| `.label` | Etiqueta de formulario |
| `.card` | Contenedor con sombra y padding |
| `.badge` | Badge base |
| `.badge-green / .yellow / .red / .gray / .blue` | Variantes de badge |
| `.table-row-hover` | Hover para filas de tabla |
| `.page-title` | Título de página (2xl) |
| `.section-title` | Título de sección (lg) |

---

## Scripts npm

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run start` | Servidor de producción |
| `npm run lint` | ESLint |
| `npm run db:generate` | `prisma generate` |
| `npm run db:migrate` | `prisma migrate dev` |
| `npm run db:push` | `prisma db push` (sync schema sin migración) |
| `npm run db:seed` | Seed inicial (admin + planes + clases) |
| `npm run db:studio` | Prisma Studio (GUI de la DB) |
| `npm run db:reset` | Reset + reseed completo |
| `npm run job:daily` | Job diario manual |
| `npm run job:class-reminders` | Job de recordatorios manual |

---

## Variables de entorno

| Variable | Usado en | Notas |
|----------|----------|-------|
| `DATABASE_URL` | Prisma | Docker local: `postgresql://postgres:postgres@localhost/bjj_administrator` |
| `JWT_SECRET` | `src/lib/auth.ts` + middleware | Mínimo 32 chars en producción |
| `SENDGRID_API_KEY` | `src/lib/email.ts` | Si está vacío, los emails solo se loguean en consola |
| `EMAIL_FROM` | Emails salientes | |
| `EMAIL_FROM_NAME` | Emails salientes | Nombre del remitente |
| `STORAGE_PATH` | `src/lib/storage.ts` | Default: `./public/uploads` |
| `APP_BASE_URL` | Links en emails | |
| `NODE_ENV` | Next.js | `development` en local |

> **Importante**: Prisma CLI lee `.env`; Next.js runtime lee `.env.local`. Ambos archivos deben tener `DATABASE_URL`.
> La DB corre via Docker Compose (`docker compose up -d`). Usuario: `postgres`, password: `postgres`.

---

## Jobs / Cron

| Script | Frecuencia recomendada | Qué hace |
|--------|----------------------|----------|
| `npm run job:daily` | 1x por día (ej. 8am) | Recordatorios de pago (3 días antes del vencimiento), alertas de documentos por vencer, marca documentos como EXPIRED |
| `npm run job:class-reminders` | Cada 15 min | Envía notificación + email a alumnos con reserva ~1h antes de su clase |

Para producción en Render, estos van como servicios `cron` en `render.yaml`.

---

## Configuración del sistema (SystemConfig)

Editable desde `/admin/config`:

| Key | Default | Descripción |
|-----|---------|-------------|
| `cancellation_hours` | `4` | Horas mínimas de anticipación para cancelar una reserva |
| `payment_due_day` | `10` | Día del mes en que vence el pago mensual |
| `class_reminder_hours` | `1` | Horas antes de la clase para enviar el recordatorio |
| `belt_options` | JSON array | Lista de cinturones disponibles |
| `belt_grade_max` | `10` | Grado máximo de cinturón |
| `academy_name` | `BJJ Academy` | Nombre de la academia |
| `terms_and_conditions` | texto | Texto de T&C que el alumno debe aceptar desde su perfil |

---

## Credenciales de desarrollo

| Rol | Email | Contraseña |
|-----|-------|------------|
| Admin | admin@bjj.local | admin123 |

Creadas por `npm run db:seed`.

---

## Pendiente para producción

| Tarea | Detalle |
|-------|---------|
| ~~`.gitignore`~~ | ~~Crear archivo para excluir `node_modules`, `.next`, `.env`, `.env.local`, `public/uploads/`~~ ✓ Hecho |
| Tests | No hay suite de tests configurada |
| Storage en nube | Reemplazar `src/lib/storage.ts` por AWS S3 o Cloudflare R2. La interfaz ya está abstraída (`saveFile`, `deleteFile`) |
| Email activo | Agregar `SENDGRID_API_KEY` en variables de entorno |
| ~~Render deploy~~ | ~~Completar `render.yaml` con repo real, ajustar región y nombres~~ ✓ Hecho — repo `scenturion/black-team-project`, plan free, schema+seed corren en `startCommand`. `db push` usa `--accept-data-loss` para soportar migraciones destructivas. |
| Seguridad | Rotar `JWT_SECRET`, considerar rate limiting en `/api/auth/login` |
| Dominio | Configurar `APP_BASE_URL` con dominio real |
| Backups | Activar backups automáticos en Render Postgres |
