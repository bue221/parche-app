# F26 Email transaccional

Todo correo sale por un puerto `Mailer` y subjects en la cola. No hay SMTP en los handlers.

**Depends on:** F01 worker  
**Unlocks:** F05, F11, F16, F18, F27 digest  
**Stories:** RC-025 (acotado a transaccional + digest opt-in, no spam indiscriminado)

## Quick path

1. Interface `Send(ctx, msg{to, template, vars, idempotency_key})`.
2. Driver `log` en test; `smtp` o API (Resend/SES) en prod.
3. Worker consume `email.send`.
4. Templates versionados en repo (`backend/emails/*.md`).

## Templates (todos implementados)

| id | Trigger |
|----|---------|
| `password_reset` | F05 |
| `email_change` | F14 |
| `event_invite` | F11 |
| `ticket_claim` | F18 |
| `order_paid` | F16 success; adjunto no QR en mail (abre app) |
| `order_failed` | F16 fail |
| `event_cancelled` | F08 |
| `artist_new_event` | F13 + F08 publish |
| `admin_digest` | F27: novedades a users `notify_email=true` |

## RC-025 masivos

`POST /v1/admin/broadcasts` platform_admin:

```json
{ "template": "admin_digest", "audience": "all_attendees" | "followers_of_artist" | "event_buyers", "artist_id?": "", "event_id?": "", "vars": {} }
```

- Job por lotes 100/min.
- Unsubscribe: `users.email_opt_out` + link en cada mail `POST /v1/me/email/opt-out` (token firmado).
- **Prohibido** comprar listas. Solo users de Parche.

## Datos

`email_messages`: id, template, to_user_id, status, provider_id, idempotency_key unique.

## Seguridad

- No mandar qr_token ni passwords.
- SPF/DKIM en prod (ops).
- Rate limit broadcasts.

## Checklist

- [x] Forgot dispara template
- [x] Invite dispara template
- [x] Pago success dispara template
- [x] Broadcast con opt-out (F27 platform admin)
- [x] Driver log en tests

## Next step

[F27](F27-platform-admin.md) broadcasts, `email_opt_out`, and opt-out.
