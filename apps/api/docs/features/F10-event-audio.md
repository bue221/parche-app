# F10 Audio de evento

El promoter adjunta canciones o sets de referencia (ordenados). El original se guarda; el worker genera un **preview** corto servido con URL firmada (no hotlink infinito).

**Depends on:** F03, F08, F09 (mismo assets)  
**Unlocks:** detalle de evento rico  
**Stories:** “posibles canciones o audios” del PRD

## Quick path

1. Upload kind `audio` (F03), confirm `POST /v1/events/{id}/assets` kind audio **o** este flujo vía tracks.
2. `PUT /v1/events/{id}/tracks` reemplaza la lista ordenada.
3. Worker transcode: preview AAC/MP3 96kbps, **45 segundos**, fade out.
4. `GET` detalle incluye tracks con `preview_url` (TTL 10 min) y metadatos, no el master público.

## HTTP

### `PUT /v1/events/{id}/tracks`

`event.write`.

```json
{
  "tracks": [
    { "asset_id": "…", "title": "Acid jam", "position": 0 }
  ]
}
```

Máx **10** tracks por evento. asset kind=audio y owner=ese evento. 200 lista.

### `GET` embebido en evento

```json
{
  "tracks": [
    {
      "id": "…",
      "title": "…",
      "position": 0,
      "duration_ms": 45000,
      "preview_url": "https://…signed",
      "preview_expires_at": "…"
    }
  ]
}
```

Sin `master_url` en público. Owner puede `GET /v1/events/{id}/tracks/{id}/master` → presign 5 min (`event.write`).

## Datos

`event_tracks`: id, event_id, asset_id, title, position unique (event, position).  
`assets` extra: duration_ms, preview_key, transcode_status (`pending`|`ready`|`failed`).

## Transcode (worker `media.process`)

- ffmpeg en imagen worker (binario en Docker).
- Preview 45s desde t=0.
- Si ffmpeg falla: `failed`; el GET omite preview_url y muestra title igual.
- Límites CPU: cola; no bloquear check-in.

**Esto no queda pendiente:** el Compose de F01 incluye ffmpeg en `worker`.

## Seguridad

- Master nunca público.
- Preview firmado; content-disposition inline.
- Copyright: el producto es referencia, no streaming comercial; ToS en clientes. Backend no extrae Content-ID.

## Errores

| Caso | code |
|------|------|
| >10 tracks | `VALIDATION_ERROR` |
| asset de otro evento | `FORBIDDEN` |
| GET master sin write | `FORBIDDEN` |

## Checklist

- [ ] Preview ≤ 45s
- [ ] Público no descarga wav master
- [ ] Orden PUT es estable
- [ ] Worker ffmpeg en Docker

## Next step

Lineup [F12](F12-artists-lineup.md).
