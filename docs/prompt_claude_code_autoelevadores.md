# Prompt para Claude Code — control-autoelevadores (SICA Metalúrgica · SicaLab)

Sos Claude Code. Construí una app web para el control diario (pre-uso) de autoelevadores. Debe cumplir el "Estándar de Desarrollo de Apps SicaLab v1.0" (`docs/Estructura_Apps_SicaLab.docx`) para integrarse al servidor sin correcciones. NO tenés acceso al servidor ni al FortiGate: entregás solo el código con la estructura correcta; el alta (Nginx, DNS, .env real) la hace el administrador de Sistemas.

## 0. Antes de escribir código
1. Archivos de referencia en el repo (copiados por mí): `docs/checklist-original.csv` (cp1252, leelo con ese encoding), `docs/checklist-original.xlsx` y `docs/Estructura_Apps_SicaLab.docx`.
2. Mostrame un plan breve (stack, modelo de datos, pantallas) y esperá mi OK antes de implementar. Si algo es ambiguo, preguntame.

## 1. Origen: formulario F-068 Rev.2 "CHECK LIST DE AUTOELEVADORES"
El Excel es una planilla MENSUAL por equipo: cabecera (CONDUCTOR, EQUIPO, HORAS, FIRMA) + grilla de ítems × días 1–31 (tilde si está bien, cruz si está mal) + recuadro "Observaciones" + sección "A completar por el Servicio de Mantenimiento" (Fecha de recepción, Fecha de reparación, Responsable de la reparación, Conformidad del autoelevadorista).

### Ítems del checklist (21, en este orden; `*` = crítico)
1. Luces delanteras
2. Luces traseras
3. Alarma y luces de retroceso
4. Indicadores de tablero: temperatura y combustible
5. Espejos retrovisores
6. Bocina
7. Freno a pedal *
8. Freno de mano *
9. Estado de cubiertas
10. Cinturones de seguridad *
11. Estado del asiento
12. Matafuego *
13. Pérdidas de fluidos
14. Dirección hidráulica / Transmisión
15. Funcionamiento de uñas (movimientos)
16. Estado y seguros de las uñas *
17. Estado de brazos y horquillas
18. Funcionamiento del motor
19. Lubricación
20. Planilla de operarios habilitados
21. Limpieza general

### Reglas de negocio del formulario (respetarlas tal cual)
- Ítem incorrecto → se marca FALLA y se completa observación.
- Ítems con asterisco (*): requieren reparación y/o reemplazo ANTES de operar el equipo → el equipo pasa a **Fuera de servicio** y la app muestra "NO USAR – avisar a Mantenimiento".
- Ítems sin asterisco: la reparación se programa con Mantenimiento; el equipo queda **Operativo con observaciones**.
- "Ante la falta de elementos de seguridad, el equipo no podrá ser utilizado; de hacerlo será responsabilidad directa del conductor." → mostrar este texto en la pantalla del operario.
- Pie de formulario: "F-068 Rev.2" en vistas imprimibles/exportaciones.

## 2. Interfaces

### A) Operario (mobile-first, celular)
- 6 autoelevadores y 6 operarios. Cada equipo tiene un QR fijo con URL `http://control-autoelevadores.sica/a/<codigo-equipo>`. El operario escanea con la cámara nativa del celular (NO escáner dentro de la web: no hay HTTPS y getUserMedia no funcionaría).
- Identificación: elegir su nombre de una lista (PIN de 4 dígitos opcional, configurable por admin). Solo pueden operar los marcados como "habilitados" (alimenta el ítem 20 "Planilla de operarios habilitados").
- Cabecera: Conductor (el operario elegido), Equipo (por QR), Horas (horómetro, numérico), fecha automática. "Firma" = confirmación con nombre + PIN/botón de confirmar, con fecha y hora registradas.
- Checklist: ítems en el orden de arriba, botones grandes y táctiles (uso con guantes). Dos caminos:
  1. Botón grande "TODO EN ORDEN" → registra los 21 ítems OK (con confirmación).
  2. Ítem por ítem: OK / FALLA. En FALLA: observación (texto) y foto opcional (input file con `capture`, comprimida del lado cliente). Los ítems críticos se destacan visualmente.
- Un control por equipo por día (primer uso del día). Si ya existe, mostrar el estado y lo registrado, sin duplicar. Si el equipo está Fuera de servicio, mostrarlo antes de empezar.
- PWA instalable (manifest + service worker solo para cache de assets), alto contraste, tipografía grande, textos en español (Argentina). Tolerar mala señal wifi: borrador local + cola de reintento (localStorage/IndexedDB siempre con try/catch).

### B) Mantenimiento (navegador de PC)
- Login usuario/contraseña (Auth.js credentials + bcryptjs). Roles: `mantenimiento` y `admin`.
- Dashboard en TIEMPO REAL (SSE, sin polling):
  - 6 tarjetas de equipos: Operativo / Con observaciones / Fuera de servicio / Sin control hoy.
  - Feed en vivo de controles que entran (operario, equipo, hora, resultado).
  - Alerta visual + sonora (botón para activar sonido por política de autoplay) y título de pestaña con contador cuando entra una falla nueva; contador de fallas abiertas.
  - Email opcional ante falla crítica (SMTP por env; si no está configurado se deshabilita sin romper). Sin Web Push (requiere HTTPS).
- Gestión de fallas, replicando la sección "A completar por el Servicio de Mantenimiento" del F-068: fecha de recepción (automática al entrar la falla), fecha de reparación, responsable de la reparación, observaciones/comentarios, fotos, y **conformidad del autoelevadorista** (el operario confirma desde su pantalla cuando la falla está resuelta). Estados: Abierta → En reparación → Resuelta → Conformidad. Registrar quién cambió cada estado. Resolver una falla crítica habilita el equipo.
- Vista de planilla mensual por equipo (grilla ítems × días 1–31 con tilde/cruz, igual al Excel), con exportación a CSV y vista imprimible con el encabezado F-068 Rev.2.
- Cumplimiento: equipos/días sin control.
- ABM (solo admin): equipos (generar e imprimir QR en A4/etiqueta), operarios (habilitado sí/no, PIN), ítems del checklist (orden, crítico, activo), usuarios de mantenimiento, destinatarios de email.
- Auditoría simple de acciones.

## 3. Stack (obligatorio por estándar SicaLab)
- Un solo servicio Next.js 14 (App Router, TypeScript, `output: "standalone"`). Nombre: `control-autoelevadores` → `control-autoelevadores.sica`. Referencia: app `puestos-clave`.
- SQLite con drizzle-orm + better-sqlite3 en `/app/data/control-autoelevadores.db` (ruta absoluta vía `DB_PATH`), WAL con checkpoint. Fotos en `/app/data/uploads/`, servidas por ruta API autenticada.
- Dockerfile multi-stage con stage `deps-prod` separado (node_modules completo al runner) por bcryptjs/better-sqlite3 (§6.1). Verificá que compile en node:20-alpine.
- SSE en `/api/stream` (`force-dynamic`, `Cache-Control: no-cache, no-transform`, heartbeat 25 s, `X-Accel-Buffering: no`), bus de eventos en memoria.
- Todas las rutas API con `export const dynamic = "force-dynamic"`. Validación con zod, rate limit en login y endpoints públicos, sanitizar subida de imágenes (MIME, tamaño).
- Tailwind; layouts diferenciados operario (mobile) / mantenimiento (desktop). Zona horaria America/Argentina/Buenos_Aires.

## 4. Entrega (checklist §8 del estándar)
En la raíz del repo:
1. `Dockerfile` multi-stage, `ENV HOSTNAME=0.0.0.0`, puerto 3000, sin herramientas de build en la imagen final.
2. `docker-compose.yml` con el bloque estándar: `container_name: sicalab-control-autoelevadores-1`, `restart: unless-stopped`, `env_file: ./control-autoelevadores/.env`, `volumes: ./control-autoelevadores/data:/app/data`, `networks: sicalab_default` (external), healthcheck `["CMD","nc","-z","127.0.0.1","3000"]`, build `context: ./control-autoelevadores/app`. Sin `ports` salvo justificación. Además `docker-compose.local.yml` para pruebas locales.
3. `.env.example` comentado sin valores sensibles: NODE_ENV, PORT=3000, HOSTNAME=0.0.0.0, DB_PATH, UPLOADS_DIR, NEXTAUTH_URL=http://control-autoelevadores.sica, AUTH_SECRET, AUTH_TRUST_HOST=true, ADMIN_USER/ADMIN_PASSWORD, SMTP_* y ALERT_EMAILS opcionales. `.env` en `.gitignore`.
4. `npm run db:migrate:prod` no interactivo (migrator de drizzle-orm vía `scripts/migrate.js`, NO drizzle-kit CLI; SHA256/_journal.json consistentes) y `npm run db:seed:prod` idempotente: carga los 21 ítems (con críticos marcados), 6 equipos placeholder "Autoelevador 1..6" editables, y el admin inicial desde env.
5. `docs/NGINX.md` con el bloque `server{}` (§4.1): `server_name control-autoelevadores.sica;`, `resolver 127.0.0.11 valid=30s ipv6=off;`, `set $upstream sicalab-control-autoelevadores-1:3000;`, y `location /api/stream` con `proxy_buffering off; proxy_read_timeout 24h; proxy_http_version 1.1; proxy_set_header Connection "";`. Nunca `localhost`.
6. `README.md`: qué hace, prueba local, variables, pasos del admin (§7) y cómo imprimir los QR.

## 5. Gotchas a respetar
`data/` existe antes del primer `up`; rutas de DB absolutas; healthcheck con `nc` (no wget/curl); `AUTH_TRUST_HOST=true`; todo lo persistente en `./data` (un rebuild no debe perder datos); seed idempotente.

## 6. Pruebas antes de entregar
- `cp .env.example .env && mkdir -p data && docker compose -f docker-compose.local.yml up --build` levanta en http://localhost:3000 sin errores; `docker logs` limpio; correr `db:migrate:prod` y `db:seed:prod` dentro del contenedor; healthcheck "healthy".
- Flujo completo: abrir `/a/<codigo>` en viewport móvil → control con una falla crítica (ej. Freno de mano) y foto → aparece en tiempo real en el dashboard con alerta → equipo "Fuera de servicio" → falla a En reparación → Resuelta → conformidad del operario → equipo vuelve a Operativo.
- Tests mínimos (vitest) para el cálculo de estado del equipo (crítico vs no crítico) y validaciones.

## 7. Entrega final
Resumime: estructura creada, decisiones tomadas y qué debe hacer el administrador (§7). No hagas deploy ni toques el servidor.
