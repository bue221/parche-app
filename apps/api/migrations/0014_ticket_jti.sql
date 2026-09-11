-- F17: each valid ticket has a stable jti used to (re)sign the QR JWS.
ALTER TABLE tickets ADD COLUMN jti UUID;

CREATE UNIQUE INDEX tickets_jti_uidx ON tickets (jti) WHERE jti IS NOT NULL;
CREATE INDEX tickets_user_id_status_idx ON tickets (user_id, status);
