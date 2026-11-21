#!/usr/bin/env node
/**
 * Full-functionality Parche demo clips (local API + SPA nav after login).
 * Usage: node demo-video/record-role.mjs cliente|promotor|door|admin
 */
import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLIPS = path.join(__dirname, 'clips');
const BASE = process.env.PARCHE_WEB_URL || 'http://localhost:8081';
const API = process.env.PARCHE_API_URL || 'http://localhost:8080';
const PASS = process.env.PARCHE_DEMO_PASSWORD || 'parche1234';

const SELVA_ID = '01a0a791-85d4-7677-91a4-8f24aba3584c';
const MOTOR_ID = '01a0a7e1-5d5a-783b-adf2-ebea8b4ae911';

const pause = (page, ms) => page.waitForTimeout(ms);

const DEMO_BUTTON = {
  'ata@parche.test': 'Asistente',
  'promoter@parche.test': 'Organizador',
  'door@parche.test': 'Puerta',
  'admin@parche.test': 'Admin',
};

async function apiLogin(email) {
  const res = await fetch(`${API}/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PASS }),
  });
  if (!res.ok) throw new Error(`login ${email} ${res.status}`);
  return (await res.json()).access_token;
}

async function apiJson(pathname, token, { method = 'GET', body, idempotency } = {}) {
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  if (idempotency) headers['Idempotency-Key'] = idempotency;
  const res = await fetch(`${API}${pathname}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(`${method} ${pathname} ${res.status} ${text.slice(0, 200)}`);
  return data;
}

/** Prefer Motor Sur (future); Selva seed events are already ended. */
async function ensureScanTicket() {
  const eventId = MOTOR_ID;
  const token = await apiLogin('ata@parche.test');
  const tickets = await apiJson('/v1/me/tickets', token);
  const existing = (tickets.items || []).find((t) => t.event?.id === eventId && t.status === 'valid');
  if (existing?.qr_token) return { ...existing, eventId };

  const types = await apiJson(`/v1/events/${eventId}/ticket-types`, token);
  const type = (types.items || []).find((t) => t.status === 'on_sale') || types.items?.[0];
  if (!type) throw new Error('Motor Sur has no ticket types');
  const order = await apiJson(`/v1/events/${eventId}/orders`, token, {
    method: 'POST',
    body: { items: [{ ticket_type_id: type.id, quantity: 1 }] },
    idempotency: `demo-motor-${Date.now()}`,
  });
  const orderId = order.order_id || order.id;
  await apiJson('/v1/dev/payments/simulate', token, {
    method: 'POST',
    body: { order_id: orderId, status: 'success' },
  });
  const after = await apiJson('/v1/me/tickets', token);
  const bought = (after.items || []).find((t) => t.event?.id === eventId && t.status === 'valid');
  if (!bought?.qr_token) throw new Error('Motor Sur ticket missing after pay');
  return { ...bought, eventId };
}

async function dismissAuthSheet(page) {
  for (let i = 0; i < 4; i++) {
    // exact: true — otherwise "Cerrar sesión" matches and logs the user out.
    const close = page.getByRole('button', { name: 'Cerrar', exact: true });
    if (await close.isVisible().catch(() => false)) {
      await close.click({ force: true }).catch(() => {});
      await pause(page, 350);
    } else break;
  }
  await page.keyboard.press('Escape').catch(() => {});
}

/** Soft navigate inside the Expo web SPA (keeps in-memory access token). */
async function spaGo(page, pathName) {
  await dismissAuthSheet(page);
  await page.evaluate((path) => {
    // expo-router / history
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, pathName);
  await pause(page, 1200);
  // Fallback hard assign only if still wrong — prefer click
  if (!page.url().includes(pathName.split('?')[0])) {
    await page.evaluate((path) => {
      location.assign(path);
    }, pathName);
    await pause(page, 2500);
    await dismissAuthSheet(page);
  }
}

async function loginPassword(page, email) {
  await page.goto(`${BASE}/auth/login`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await pause(page, 1800);
  const demoLabel = DEMO_BUTTON[email];
  if (demoLabel) {
    await page.getByRole('button', { name: demoLabel }).click();
    await pause(page, 400);
  } else {
    await page.locator('input[type="email"]').fill(email);
  }
  const pass = page.locator('input[type="password"]');
  if (!(await pass.inputValue().catch(() => ''))) await pass.fill(PASS);

  const loginResp = page.waitForResponse(
    (r) => r.url().includes('/v1/auth/login') && r.request().method() === 'POST',
    { timeout: 30000 }
  );
  await page.getByRole('button', { name: /^Entrar$/i }).click();
  const resp = await loginResp;
  if (!resp.ok()) throw new Error(`UI login failed ${resp.status()} ${resp.url()}`);
  const host = new URL(resp.url()).host;
  console.log(`[login] ok via ${host}`);
  if (!host.includes('localhost') && !host.includes('127.0.0.1')) {
    console.warn('[login] WARNING: not local API — session may drop on reload');
  }
  await page.waitForURL((url) => !url.pathname.includes('/auth/login'), { timeout: 20000 }).catch(() => {});
  await pause(page, 2000);
  await dismissAuthSheet(page);

  // Confirm session flag + no guest CTA on Cuenta via SPA
  await page.getByRole('tab', { name: 'Cuenta' }).click().catch(() => {});
  await pause(page, 1500);
  await dismissAuthSheet(page);
}

async function clickFirst(page, locator, waitMs = 1200) {
  const el = locator.first();
  if (await el.isVisible().catch(() => false)) {
    await el.click({ timeout: 5000 }).catch(() => el.click({ force: true }));
    await pause(page, waitMs);
    return true;
  }
  return false;
}

async function scroll(page, times = 2) {
  for (let i = 0; i < times; i++) {
    await page.mouse.wheel(0, 500);
    await pause(page, 600);
  }
}

const ROLES = {
  cliente: {
    email: 'ata@parche.test',
    async flow(page) {
      await page.getByRole('tab', { name: 'Explorar' }).click();
      await pause(page, 2000);
      await dismissAuthSheet(page);
      await scroll(page, 1);

      // Open Motor Sur from explore if possible, else SPA path
      const opened = await clickFirst(
        page,
        page.getByRole('button', { name: /Motor Sur|Neon Garden|Bruma Room|Acid Roof/i }),
        2500
      );
      if (!opened) {
        await spaGo(page, `/event/${MOTOR_ID}`);
      }
      await scroll(page, 2);
      await clickFirst(page, page.getByRole('button', { name: /comprar|boleta|entrada|Pagar/i }), 2000);

      await spaGo(page, `/checkout/${MOTOR_ID}`);
      await pause(page, 2000);
      await dismissAuthSheet(page);
      const pay = page.getByRole('button', { name: /Pagar/i }).first();
      if (await pay.isVisible().catch(() => false)) {
        await pay.click({ force: true });
        await pause(page, 2500);
      }
      const confirm = page.getByRole('button', { name: /^Pagar /i }).or(page.getByRole('button', { name: /^Pagar$/i }));
      if (await confirm.first().isVisible().catch(() => false)) {
        await confirm.first().click({ force: true });
        await pause(page, 4000);
      }

      // Wallet + QR (hard nav OK now that refresh cookie persists on localhost)
      await page.goto(`${BASE}/wallet`, { waitUntil: 'domcontentloaded' });
      await pause(page, 3000);
      await dismissAuthSheet(page);
      await scroll(page, 1);

      const token = await apiLogin('ata@parche.test');
      const tickets = await apiJson('/v1/me/tickets', token);
      const tid =
        tickets.items?.find((t) => t.event?.id === MOTOR_ID)?.ticket_id || tickets.items?.[0]?.ticket_id;
      if (tid) {
        await page.goto(`${BASE}/ticket/${tid}`, { waitUntil: 'domcontentloaded' });
        await pause(page, 5000);
        await dismissAuthSheet(page);
        // Skip thermal print if it steals the screen
        const skip = page.getByRole('button', { name: /saltar|omitir|wallet|boletas|listo|continuar/i });
        await clickFirst(page, skip, 1500);
        await pause(page, 2500);
      }
      await page.goto(`${BASE}/wallet`, { waitUntil: 'domcontentloaded' });
      await pause(page, 2500);
    },
  },
  promotor: {
    email: 'promoter@parche.test',
    async flow(page) {
      await page.getByRole('tab', { name: /Operar/i }).click().catch(async () => {
        await spaGo(page, '/operate');
      });
      await pause(page, 2500);
      await dismissAuthSheet(page);
      await scroll(page, 2);
      await page.goto(`${BASE}/event/${MOTOR_ID}/operate`, { waitUntil: 'domcontentloaded' });
      await pause(page, 2500);
      await scroll(page, 2);
      for (const suffix of ['metrics', 'members']) {
        await page.goto(`${BASE}/event/${MOTOR_ID}/${suffix}`, { waitUntil: 'domcontentloaded' });
        await pause(page, 2200);
        await scroll(page, 1);
      }
      await page.goto(`${BASE}/operate`, { waitUntil: 'domcontentloaded' });
      await pause(page, 2000);
    },
  },
  door: {
    email: 'door@parche.test',
    async flow(page, ctx) {
      const ticket = ctx.scanTicket;
      const eventId = ticket?.eventId || MOTOR_ID;
      // Prefer SPA nav so the in-memory access token survives (full reload races session restore).
      await page.getByRole('tab', { name: /Operar/i }).click().catch(async () => {
        await spaGo(page, '/operate');
      });
      await pause(page, 2000);
      await dismissAuthSheet(page);
      await spaGo(page, `/event/${eventId}/door`);
      await pause(page, 2500);
      if (!page.url().includes('/door')) {
        await page.goto(`${BASE}/event/${eventId}/door`, { waitUntil: 'domcontentloaded' });
        await pause(page, 4000);
      }
      await dismissAuthSheet(page);

      const paste = page.getByRole('button', { name: /Pegar código/i });
      try {
        await paste.waitFor({ state: 'visible', timeout: 20000 });
      } catch {
        console.warn('[door] Pegar código not visible — retry hard nav');
        await page.goto(`${BASE}/event/${eventId}/door`, { waitUntil: 'domcontentloaded' });
        await pause(page, 5000);
        await dismissAuthSheet(page);
        await paste.waitFor({ state: 'visible', timeout: 15000 });
      }
      await paste.click();
      await pause(page, 800);
      if (ticket?.qr_token) {
        await page.locator('input').last().fill(ticket.qr_token);
        await pause(page, 600);
        await page.getByRole('button', { name: /Revisar código/i }).click();
        await pause(page, 2000);
        const dar = page.getByRole('button', { name: /Dar ingreso/i });
        if (await dar.isVisible().catch(() => false)) {
          await dar.click();
          await pause(page, 2800);
        }
        await clickFirst(page, page.getByRole('button', { name: /Continuar/i }), 1500);
      }
      await clickFirst(page, page.getByRole('button', { name: /Aforo en vivo/i }), 1500);
      await spaGo(page, `/event/${eventId}/live`);
      if (!page.url().includes('/live')) {
        await page.goto(`${BASE}/event/${eventId}/live`, { waitUntil: 'domcontentloaded' });
      }
      await pause(page, 3500);
      await scroll(page, 1);
    },
  },
  admin: {
    email: 'admin@parche.test',
    async flow(page) {
      await page.getByRole('tab', { name: 'Cuenta' }).click();
      await pause(page, 2000);
      await dismissAuthSheet(page);
      await scroll(page, 1);
      await clickFirst(page, page.getByRole('button', { name: /Cola de aprobación/i }), 2500);
      await spaGo(page, '/admin/queue');
      await pause(page, 3500);
      await dismissAuthSheet(page);
      await scroll(page, 2);
      await page.getByRole('tab', { name: /Operar/i }).click().catch(async () => {
        await spaGo(page, '/operate');
      });
      await pause(page, 2500);
      await dismissAuthSheet(page);
      await page.getByRole('tab', { name: 'Explorar' }).click();
      await pause(page, 2000);
      await dismissAuthSheet(page);
    },
  },
};

async function main() {
  const roleKey = process.argv[2];
  const role = ROLES[roleKey];
  if (!role) {
    console.error('Usage: node record-role.mjs cliente|promotor|door|admin');
    process.exit(1);
  }
  fs.mkdirSync(CLIPS, { recursive: true });
  const outDir = path.join(CLIPS, `_raw_${roleKey}`);
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  const ctx = {};
  if (roleKey === 'door' || roleKey === 'cliente') {
    console.log('[prep] ensure scan ticket');
    ctx.scanTicket = await ensureScanTicket();
    console.log('[prep] ticket', ctx.scanTicket.ticket_id, 'event', ctx.scanTicket.eventId || MOTOR_ID);
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: outDir, size: { width: 1280, height: 720 } },
    colorScheme: 'dark',
  });
  const page = await context.newPage();
  console.log(`[${roleKey}] login ${role.email}`);
  await loginPassword(page, role.email);
  console.log(`[${roleKey}] flow`);
  try {
    await role.flow(page, ctx);
  } catch (err) {
    console.warn(`[${roleKey}] flow warning:`, err.message);
  }
  await pause(page, 1200);
  await context.close();
  await browser.close();

  const files = fs.readdirSync(outDir).filter((f) => f.endsWith('.webm'));
  if (!files.length) {
    console.error('No video written');
    process.exit(1);
  }
  const dest = path.join(CLIPS, `${roleKey}.webm`);
  fs.renameSync(path.join(outDir, files[0]), dest);
  fs.rmSync(outDir, { recursive: true, force: true });
  const dur = execFileSync('ffprobe', [
    '-v',
    'error',
    '-show_entries',
    'format=duration',
    '-of',
    'default=nw=1:nk=1',
    dest,
  ])
    .toString()
    .trim();
  console.log(`[${roleKey}] saved ${dest} (${dur}s)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
