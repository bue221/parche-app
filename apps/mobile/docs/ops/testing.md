# Tests

Cómo se prueba la app y qué se espera de un test nuevo.

## Correr

```sh
pnpm test          # una pasada
pnpm test:watch    # en watch
pnpm typecheck     # tsc --noEmit
```

## Configuración

Jest vive en el bloque `jest` de `package.json`:

| Ajuste | Por qué |
|--------|---------|
| `preset: jest-expo/node` | La suite cubre lógica pura. El preset universal levantaría cuatro proyectos (iOS, Android, web, node) y multiplicaría el tiempo sin dar señal extra |
| `roots: src` | Los tests viven junto al código que prueban |
| `moduleNameMapper` | Resuelve los alias `@/…` y `@/assets/…` igual que Metro |
| `transformIgnorePatterns` con `.pnpm` | pnpm anida las dependencias; sin esto Jest no transpila los paquetes de Expo |

Los archivos van en `__tests__/` al lado del módulo, con sufijo `-test.ts`:

```
src/lib/ticket-label.ts
src/lib/__tests__/ticket-label-test.ts
```

## Qué está cubierto

| Módulo | Qué se protege |
|--------|----------------|
| `lib/check-in` | Que `confirm` sea exclusivo de `approved` y que `duplicate` no se confunda con un rechazo |
| `lib/order-items` | Mezcla de etapas en una sola orden, cantidades inválidas, totales |
| `lib/ticket-label` | Agrupación del wallet, conteos, código impreso del tiquete |
| `lib/phone` | Parseo E.164, prefijos compartidos (+1), longitudes por país |
| `lib/password` | Reglas de contraseña, incluido el conteo por code point |
| `lib/format` | Fechas ancladas a Bogotá, countdowns, rangos de filtro |
| `lib/favorite-collections` | Agrupación de guardados por ciudad y año |
| `data/env` | Reescritura de URLs de media y subida: qué firma sobrevive y qué nunca pasa por el proxy de lectura |
| `data/errors` | Mensajes en español y que no se filtren tokens |

## Cómo escribir uno

1. **Prueba comportamiento, no implementación.** El nombre del test dice qué garantiza, no qué función llama.
2. **Cubre el borde.** Entrada vacía, fecha inválida, cantidad negativa, código de país desconocido. La mitad de los tests de esta suite son bordes.
3. **Nada de dependencias de reloj o zona horaria.** Las funciones de fecha aceptan `now` como parámetro; úsalo. Para lo que sí depende de la zona local, afirma invariantes (orden, duración) en vez de cadenas literales.
4. **Nada de red.** Si necesitas el API, el objetivo del test está mal elegido: extrae la lógica pura.

## Lo que falta

- Tests de componentes con `@testing-library/react-native` (no instalado).
- Cobertura de los stores de Zustand y de los hooks de sesión.
- E2E de puerta y compra (Maestro), que es donde vive el checklist de aceptación del [PRD](../product/prd.md).

## Relacionadas

[Build y release](release.md)
