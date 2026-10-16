# F16 Checkout y pagos

El asistente pide tiquetes; el API reserva aforo, manda a **Mercado Pago Checkout Pro** y confirma por webhook **idempotente**. Sin esto no hay QR (F17).

**Depends on:** F15, F01 broker, F02 idempotency  
**Unlocks:** F17, F20  
**Stories:** RC-011

## Producto (no reinventar)

Colombia (`MCO`, COP). Checkout Pro = Preferences API y **`init_point`** (nunca `sandbox_init_point`, nunca Orders API). Expo abre `checkout_url` con **expo-web-browser** (Custom Tabs / Safari View Controller). Mercado Pago **deshabilitó WebView** para Checkout Pro.

La tarjeta de credenciales de Mercado Pago solo muestra **Access Token**, **Public Key**, **número de aplicación** (y un usuario de prueba). Eso alcanza para que Parche cobre con la cuenta de la app. Para que **cada organizador cobre en su Mercado Pago** hace falta **OAuth de Mercado Pago** (authorization code, no Auth0): `MP_CLIENT_ID` + **Client Secret** (Editar datos de la aplicación) y redirect `API_PUBLIC_URL/v1/payments/mercadopago/oauth/callback`. El organizador entra a Mercado Pago, autoriza a Parche, y el dinero de las boletas cae en su cuenta con `marketplace_fee` = **10% de comisión + IVA 19% sobre esa comisión**.

El comprador paga **precio publicado + esa comisión + IVA**. `amount_cents` se queda en el subtotal de boletas (lo que recibe el promoter). `charge_cents` es lo que cobra Mercado Pago. La preferencia suma una línea "Comisión Parche". `notification_url` solo si es HTTPS público (en prod: `https://api-parche.bue221.xyz/v1/payments/webhook`). `back_urls` usa HTTPS público o, en local, el scheme de la app (`parche://orders/{id}`) para volver a cerrar la hoja.

`price_cents` / `amount_cents` en Parche **ya son pesos COP**. `unit_price` de la preferencia es ese número, no se divide entre 100.

## Probar en sandbox (Colombia)

“En unas horas se validará” **no es un pago aprobado**. Es `pending` (PSE, Efecty, o dinero en cuenta). El webhook llega, Parche lo ignora y el QR no sale. Checkout Pro va en `binary_mode` y excluye ticket / PSE / Efecty. **No se puede excluir** `account_money` en Colombia: Mercado Pago rechaza la preferencia y el front nunca recibe `checkout_url`.

Con token de prueba el checkout abre `sandbox.mercadopago.com.co`. Pagá **como invitado**, **tarjeta de crédito** (no “Mercado Pago” / saldo). En nombre **y** apellido poné exactamente `APRO`. Documento `123456789`. Mastercard `5254 1336 7440 3564`, CVV `123`, vencimiento `11/30`. Visa crédito `4013 5406 8274 6260`. Evitá el débito `4915…` si te deja pendiente. Orden nueva después de cada intento.

## Quick path

1. En `.env`: `MP_ACCESS_TOKEN`, `MP_PUBLIC_KEY`, `MP_CLIENT_ID` (número de aplicación), **`MP_CLIENT_SECRET`** (obligatorio para que el organizer conecte su cuenta) y `PAYMENT_PROVIDER=mercadopago`. Redirect OAuth: `https://api-parche.bue221.xyz/v1/payments/mercadopago/oauth/callback` (debe estar en la app de Mercado Pago). El resto (notification, back URL, cifrado) se deriva.
2. Promoter owner: `POST /v1/tenants/{id}/mercadopago/connect` → OAuth de Mercado Pago (no Auth0). Un asistente se vuelve organizer con `POST /v1/me/profiles/promoter` y después conecta cobros. Con OAuth activo, **crear evento exige cuenta conectada**.
3. `POST /v1/events/{id}/orders` + `Idempotency-Key`.
4. Transacción: Order `pending`, Tickets `reserved`, `reserved_count++`. Preferencia con el token del seller si existe; si no, `MP_ACCESS_TOKEN`.
5. Respuesta `checkout_url` = `init_point`.
6. Webhook → GET payment → SUCCESS → tickets `valid` + emitir QR (F17). En prod el webhook de la app **ParcheTiquetes** apunta a `https://api-parche.bue221.xyz/v1/payments/webhook` (topic `payment`). Pon `MP_WEBHOOK_SECRET` en ese servidor; en `APP_ENV=dev` se puede omitir y igual se hace GET `/v1/payments/{id}`. En prod la firma `x-signature` es obligatoria.
7. TTL reserva 15 min: job libera si pending.

## HTTP

### `POST /v1/events/{id}/orders`

Access attendee. Evento `published`. 409 si `PAYMENT_PROVIDER=mercadopago` y no hay `MP_ACCESS_TOKEN` ni seller OAuth.

201 incluye `checkout_url`, `amount_cents` (boletas), `commission_cents`, `iva_cents`, `fee_cents` y `charge_cents` (lo que paga el comprador).

Pasarela: adapter `PaymentProvider` (`CreateCheckout(order)`). Compose: driver `fake` → `/v1/dev/pay/{order}`. Prod: `PAYMENT_PROVIDER=mercadopago` + sdk-go. **sin** hardcode en handlers.

### `GET /v1/orders/{id}`

Comprador o `event.metrics.read`. Incluye `checkout_url` y `charge_cents`. No PAN.

### `POST /v1/payments/webhook`

Sin Bearer. Body crudo.

- Fake/dev: header `X-Payment-Signature` + `PAYMENT_WEBHOOK_SECRET` (± 5 min).
- Mercado Pago: query `data.id` / `type=payment` o body JSON. Si hay `MP_WEBHOOK_SECRET`, verificar `x-signature` con `webhook.ValidateSignature`. En `APP_ENV=dev` sin secret, igual se hace GET `/v1/payments/{id}` (nunca confiar solo en el body). `pending` se ignora (200). `approved` → success; `rejected`/`cancelled` → failed.
- `provider_event_id` unique (payment id) → skip duplicados.

### OAuth promoter

| Método | Ruta | Auth |
|--------|------|------|
| GET | `/v1/tenants/{id}/mercadopago` | owner |
| POST | `/v1/tenants/{id}/mercadopago/connect` | owner |
| DELETE | `/v1/tenants/{id}/mercadopago` | owner |
| GET | `/v1/payments/mercadopago/oauth/callback` | no (state HMAC) |

### `POST /v1/dev/payments/simulate` (solo `APP_ENV=dev`)

Dispara webhook interno fake. No existe en prod.

## Datos

`orders`: user_id, event_id, status, expires_at, amount_cents  
`order_items`: ticket_type_id, quantity, unit_price_cents  
`tickets`: order_id, ticket_type_id, status, user_id  
`payment_transactions`: order_id, provider, provider_event_id unique, status, raw_payload_hash  
`tenant_mp_accounts`: tokens OAuth cifrados (nunca loguear access/refresh)

## Errores

| Caso | code |
|------|------|
| Sin cupo | `CONFLICT` |
| Mercado Pago sin token | `CONFLICT` |
| Promoter sin cuenta Mercado Pago al crear evento | `CONFLICT` |
| Preferencia Mercado Pago rechazada | `CONFLICT` |
| Webhook firma mala | 401 `UNAUTHORIZED` |
| Evento no published | `FORBIDDEN` |

## Seguridad

- Nunca confiar en query `?paid=1` del cliente.
- Idempotency-Key 24h Redis/DB.
- Worker `order.expire` cada minuto.
- No loguear access tokens, refresh tokens ni QR.

## Checklist

- [x] Reserva se libera a los 15 min
- [x] Webhook duplicado no duplica tickets
- [x] Fake provider en compose
- [x] Checkout Pro Preferences + `init_point`
- [x] OAuth seller 1:1 + `marketplace_fee`
- [x] Webhook `x-signature`

## Next step

[F17 QR](F17-ticket-qr.md).
