# Metodología y sprints

Del documento de Prácticas de Ingeniería IV. El stack citado en el PDF evolutivo (React + Supabase → monorepo Expo / Go / Next) se refleja en [Arquitectura](Architecture); aquí queda el **plan de producto**.

## Enfoque

Metodología **ágil**, iterativa e incremental: de escena dispersa (A) a ecosistema unificado (B).

Pilares:

1. **Análisis / benchmarking** — referentes (Resident Advisor, Xceed, Dice…), dolor local (asistencia, fricción).
2. **Historias de usuario + MoSCoW** — backlog vivo priorizado por impacto en unificación.
3. **Cuatro sprints** — entregables funcionales cada 2–4 semanas.
4. **Integración continua** — commits pequeños, deploys frecuentes (hoy: monorepo + CI por paths).

## Roadmap en 4 fases

| Sprint | Nombre | Valor |
|--------|--------|--------|
| **1** | MVP — centralización e infraestructura | Agenda única: registro, crear/ver eventos |
| **2** | Comunidad, perfiles y talento | Perfiles de artista, lineup, follows |
| **3** | Tiquetería, sostenibilidad y transacciones | Compra, QR, check-in, transfer, aprobación |
| **4** | Descubrimiento, UI/UX y escala | Filtros, recomendaciones, editorial, rendimiento |

## Historias de usuario (IDs RC)

### Sprint 1

| ID | Título | Historia |
|----|--------|----------|
| RC-001 | Registro | Como usuario nuevo, deseo registrarme (asistente u organizador) para acceder a funciones. |
| RC-002 | Login | Como usuario registrado, deseo iniciar sesión. |
| RC-003 | Crear evento | Como organizador, quiero crear un evento (nombre, fecha, ubicación, descripción). |
| RC-004 | Lista de eventos | Como asistente, quiero ver próximos eventos. |
| RC-005 | Detalle de evento | Como asistente, quiero ver lineup, ubicación y fecha. |

### Sprint 2

| ID | Título | Historia |
|----|--------|----------|
| RC-006 | Perfil de artista | Como productor/DJ, quiero un perfil para visibilidad. |
| RC-007 | Asociar artista | Como organizador, quiero vincular artistas al lineup. |
| RC-008 | Ver perfil artista | Como asistente, quiero ver trayectoria y fechas. |
| RC-009 | Seguir artista | Como asistente, quiero seguir DJs favoritos. |
| RC-010 | Perfil personal | Como asistente, quiero configurar nombre/foto. |

### Sprint 3

| ID | Título | Historia |
|----|--------|----------|
| RC-011 | Comprar tiquete | Como asistente, quiero comprar entradas digitales. |
| RC-012 | Mis tiquetes (QR) | Como asistente, quiero ver el QR para puerta. |
| RC-013 | Check-in | Como organizador/staff, quiero escanear QR y evitar fraude. |
| RC-014 | Transferir tiquete | Como asistente, quiero ceder el tiquete a otro usuario. |
| RC-015 | Aprobación de eventos | Como admin, quiero revisar/aprobar publicaciones. |

### Sprint 4

| ID | Título | Historia |
|----|--------|----------|
| RC-016 | UI/UX | Como usuario, quiero navegación rápida e intuitiva. |
| RC-017 | Búsqueda y filtros | Como asistente, quiero filtrar por fecha, subgénero, DJ. |
| RC-018 | Recomendaciones | Como asistente, quiero sugerencias según gustos. |
| RC-019 | Editorial / blog | Como asistente, quiero leer cultura y novedades. |
| RC-020 | Rendimiento backend | Como usuario, quiero respuestas rápidas. |

### Backlog

| ID | Título |
|----|--------|
| RC-021 | Restablecer contraseña |
| RC-022 | Editar evento |
| RC-023 | Directorio de clubes |
| RC-024 | Gestión de usuarios (admin) |
| RC-025 | Notificaciones por email |

## Gestión (referencia del documento)

El PDF describe un tablero Trello (backlog → sprint → in progress → review → done → blocked) con labels por sprint y rol.

- Tablero histórico citado: https://trello.com/b/2YYJvG2P/rave-clud-practica-de-ingenieria-iii
- Prototipo web anterior citado: https://raveclud.netlify.app/

El desarrollo activo vive ahora en este monorepo (`apps/mobile`, `apps/api`, `apps/web`) y en los specs `apps/*/docs/features/`.
