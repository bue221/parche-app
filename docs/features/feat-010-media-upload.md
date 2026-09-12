# FEAT-010: Subida de media

Flyers, galería, avatares y audio entran por presign. La app nunca habla con el bucket abierto ni con S3 directo.

| Campo | Valor |
|-------|-------|
| Sprint | 1 (imagen); 2 audio |
| RC | RC-003, RC-006 |
| Permiso UI | Autenticado; `event.write` si hay `event_id` |
| Pantallas | Sheets de picker dentro de crear/editar/perfil |

## Quick path

1. Elegir archivo (cámara/galería o audio).
2. `POST /v1/uploads` → PUT a URL presignada con `Content-Type` fijo.
3. Confirmar `POST /v1/events/{id}/assets` o asset de usuario.

## Pantallas

No es una ruta propia. Progreso: eligiendo → subiendo → listo / error. Límite visible antes de subir.

| Kind | MIME | Máx |
|------|------|-----|
| flyer, gallery, avatar | jpeg, png, webp | 8 MB |
| audio | mpeg, ogg, wav | 20 MB preview |

## Flujo

Sin `event_id` solo avatar propio. Prefix/tenant lo valida el API; si `Exists` falla, no mentir “listo”.

## Estados

Presign expirado: repetir desde `uploads`. Red a medias: no dejar flyer roto como principal.

## Contrato

`POST /v1/uploads`, PUT presign, `POST .../assets`, `DELETE .../assets/{id}`.

## Fuera de alcance

Transcoding. Thumbnails (worker). Arrastrar carpetas.

## Checklist

- [ ] Rechazo de MIME/tamaño en cliente y copia el del API.
- [ ] Audio no se sube en Sprint 1.
- [ ] URLs de audio no se tratan como públicas eternas.

## Relacionadas

[FEAT-008](feat-008-event-create.md), [FEAT-013](feat-013-artist-edit.md), [FEAT-017](feat-017-event-tracks.md)
