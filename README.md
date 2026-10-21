# control-autoelevadores

Control diario pre-uso de los autoelevadores de SICA Metalúrgica. Digitaliza el formulario
**F-068 Rev.2 "Check list de autoelevadores"**. App SicaLab: `http://control-autoelevadores.sica`.

## Qué hace

**Operario (celular).** Cada equipo tiene un QR fijo con `http://control-autoelevadores.sica/a/<código>`.
El operario lo escanea con la cámara del celular, elige su nombre (solo los habilitados), carga las
horas del horómetro y responde los 21 ítems: con el botón **Todo en orden** o ítem por ítem
(OK / Falla, con observación obligatoria y foto opcional). Firma con su nombre y, si tiene, su PIN.

- Un control por equipo por día (el primer uso). Si ya está hecho, se muestra lo registrado.
- Falla en un ítem crítico (*) → **Fuera de servicio** y la pantalla muestra **NO USAR – avisar a Mantenimiento**.
- Falla en otro ítem → **Operativo con observaciones**; Mantenimiento programa la reparación.
- Sin señal: el control queda guardado en el teléfono y se envía solo cuando vuelve la conexión.
- Cuando Mantenimiento resuelve una falla, el operario da la **conformidad** desde el mismo QR.

**Mantenimiento (PC).** Ingreso con usuario y contraseña (`/login`).

- **Tablero en vivo** (SSE): estado de los 6 equipos, controles que llegan al instante, alerta
  visual + sonora (botón "Activar sonido") y contador en la pestaña cuando entra una falla.
- **Fallas**: la sección "A completar por el Servicio de Mantenimiento" del F-068. El flujo es
  Abierta → En reparación → Resuelta → Conformidad, con historial de quién hizo cada cambio.
  Al marcar **Resuelta** una falla crítica, el equipo vuelve a estar habilitado.
- **Planilla mensual** por equipo, igual al Excel (ítems × días 1–31), imprimible y exportable a CSV.
- **Cumplimiento**: días hábiles sin control por equipo.
- **Administración** (rol admin): equipos y QR, operarios (habilitado / PIN), ítems del checklist,
  usuarios y destinatarios de email.
- **Auditoría** de acciones (logins, controles, cambios de estado, ABM).
- **Email** opcional ante falla crítica (se activa si se configura SMTP).

## Stack

Next.js 14 (App Router, `output: "standalone"`) · TypeScript · Tailwind · Auth.js v5 (credentials + bcryptjs)
· SQLite con drizzle-orm + better-sqlite3 (WAL) · zod · SSE con bus en memoria · vitest.

Persistencia, todo dentro de `/app/data` (bind mount `./data`):

| Qué | Ruta en el contenedor |
| --- | --- |
| Base SQLite | `/app/data/control-autoelevadores.db` (+ `-wal`, `-shm`) |
| Fotos | `/app/data/uploads/` (servidas solo con sesión, por `/api/uploads/...`) |

## Prueba local

Requiere Docker.

```bash
cp .env.example .env
mkdir -p data
docker compose -f docker-compose.local.yml up --build
# si el puerto 3000 está ocupado:  LOCAL_PORT=3010 docker compose -f docker-compose.local.yml up --build
```

En otra terminal:

```bash
docker exec sicalab-control-autoelevadores-1 npm run db:migrate:prod
docker exec sicalab-control-autoelevadores-1 npm run db:seed:prod
docker inspect -f '{{.State.Health.Status}}' sicalab-control-autoelevadores-1   # → healthy
```

- Panel: http://localhost:3000/panel. Con el `.env` recién copiado, el compose local usa
  `admin` / `admin12345` (solo en local).
- Celular simulado: http://localhost:3000/a/AE-01 (en el navegador, modo dispositivo móvil).
- Antes de probar, cargá operarios en **Administración → Operarios**.

Desarrollo sin Docker: `npm ci`, `npm run db:migrate`, `ADMIN_USER=admin ADMIN_PASSWORD=... npm run db:seed`,
`npm run dev`. Tests: `npm test`. Para cambiar el esquema: editar `src/lib/db/schema.ts` y correr
`npm run db:generate` (genera la migración SQL en `drizzle/`).

## Variables de entorno

Ver `.env.example` (comentado). Resumen:

| Variable | Obligatoria | Uso |
| --- | --- | --- |
| `NODE_ENV`, `PORT=3000`, `HOSTNAME=0.0.0.0` | sí | runtime Next standalone |
| `DB_PATH`, `UPLOADS_DIR` | sí | rutas **absolutas** dentro de `/app/data` |
| `NEXTAUTH_URL` | sí | `http://control-autoelevadores.sica`; también arma la URL de los QR |
| `AUTH_SECRET` | sí | `openssl rand -base64 32` |
| `AUTH_TRUST_HOST=true` | sí | detrás de Nginx |
| `ADMIN_USER`, `ADMIN_PASSWORD` | para el seed | admin inicial (mín. 8 caracteres) |
| `AUTO_MIGRATE` | no (default `true`) | aplica migraciones al arrancar |
| `SMTP_*`, `ALERT_EMAILS` | no | email ante falla crítica; sin `SMTP_HOST` queda desactivado |

## Pasos del administrador de Sistemas (§7)

En el servidor, dentro del directorio `sicalab`:

1. Clonar el repo en `./control-autoelevadores/app`.
2. Crear la carpeta de datos **antes del primer `up`**: `mkdir -p ./control-autoelevadores/data`.
   El contenedor ajusta solo el dueño de esa carpeta (uid 1001).
3. Crear `./control-autoelevadores/.env` a partir de `app/.env.example`. Completar `AUTH_SECRET`
   y `ADMIN_PASSWORD`, y SMTP si se quiere email.
4. Agregar el bloque de `app/docker-compose.yml` al compose del servidor (red externa `sicalab_default`, sin `ports`).
5. Construir y levantar: `docker compose up -d --build control-autoelevadores`.
6. Base de datos:
   ```bash
   docker exec sicalab-control-autoelevadores-1 npm run db:migrate:prod   # idempotente (también corre al arrancar)
   docker exec sicalab-control-autoelevadores-1 npm run db:seed:prod      # idempotente: 21 ítems, 6 equipos, admin
   ```
7. Nginx: agregar el `server {}` de [`docs/NGINX.md`](docs/NGINX.md), `nginx -t` y recargar.
8. DNS interno / FortiGate: registro `control-autoelevadores.sica` apuntando al servidor.
9. Verificar: `docker logs sicalab-control-autoelevadores-1` limpio, healthcheck `healthy`,
   `http://control-autoelevadores.sica/login` abre.
10. Ingresar como admin, **cambiar la contraseña** (Administración → Usuarios), renombrar los
    equipos, cargar operarios y usuarios de Mantenimiento.

Actualizar: `git pull` en `app/` y `docker compose up -d --build control-autoelevadores`. Los datos están en
`./control-autoelevadores/data` y no se pierden con un rebuild. **Backup:** copiar esa carpeta (con la
app detenida o con `sqlite3 ... ".backup"`).

## Cómo imprimir los QR

1. Panel → **Administración → Equipos y QR**. Revisar que cada equipo tenga el código y el nombre
   definitivos: el código va dentro del QR, así que si se cambia hay que reimprimir.
2. Elegir **Imprimir QR en A4** (uno grande por hoja, con la leyenda de seguridad) o **Imprimir QR en
   etiquetas** (6 por hoja para recortar). El botón QR de cada fila imprime solo ese equipo.
3. Imprimir con el botón **Imprimir** (A4, escala 100 %, activar "gráficos de fondo" para ver las franjas).
4. Plastificar y pegar en un lugar visible del equipo. Probarlo con la cámara de un celular conectado al
   wifi de planta: tiene que abrir `http://control-autoelevadores.sica/a/<código>`.

## Notas

- La app es HTTP interna (sin HTTPS). Por eso: el QR se escanea con la cámara nativa (no hay escáner
  web), no hay Web Push, y el service worker solo se registra donde el navegador lo permite. La app
  funciona igual sin él: la cola offline usa IndexedDB/localStorage, no el SW.
- El bus de eventos del tablero está en memoria: pensado para **un único contenedor** (como el resto de SicaLab).
- Pie de formulario "F-068 Rev.2" en la planilla imprimible, el CSV y las hojas de QR.
