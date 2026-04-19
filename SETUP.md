# BJJ Administrator — Setup local

## Requisitos
- Node.js 18+
- Docker (para PostgreSQL) o PostgreSQL instalado localmente

## 1. Levantar la base de datos

```bash
docker compose up -d
```

Esto inicia PostgreSQL en `localhost:5432` con usuario/contraseña `postgres` y base `bjj_administrator`.

## 2. Migrar y cargar datos iniciales

```bash
npm run db:push      # Crea las tablas en la DB
npm run db:seed      # Carga admin, planes y clases de ejemplo
```

## 3. Iniciar la app

```bash
npm run dev
```

Abrir: http://localhost:3000

## Credenciales iniciales

| Rol   | Email              | Contraseña |
|-------|--------------------|------------|
| Admin | admin@bjj.local    | admin123   |

## Estructura de rutas

| URL                      | Descripción              |
|--------------------------|--------------------------|
| `/login`                 | Login                    |
| `/register?token=<tok>`  | Registro por invitación (requiere link generado por admin) |
| `/admin/dashboard`       | Panel administrador      |
| `/admin/students`        | Gestión de alumnos       |
| `/admin/plans`           | Gestión de planes        |
| `/admin/classes`         | Gestión de clases        |
| `/admin/attendance`      | Toma de asistencia       |
| `/admin/payments`        | Revisión de pagos        |
| `/admin/documents`       | Revisión de documentos   |
| `/admin/config`          | Configuración del sistema|
| `/student/dashboard`     | Portal del alumno        |
| `/student/classes`       | Reservar clases          |
| `/student/bookings`      | Mis reservas             |
| `/student/payments`      | Informar pagos           |
| `/student/documents`     | Subir documentos         |
| `/student/profile`       | Mi perfil                |

## Jobs (cron)

```bash
npm run job:daily            # Recordatorios de pago, documentos vencidos
npm run job:class-reminders  # Recordatorio 1h antes de cada clase
```

## Variables de entorno

Ver `.env.example` para la lista completa.
Las críticas para producción son `DATABASE_URL`, `JWT_SECRET` y `SENDGRID_API_KEY`.
