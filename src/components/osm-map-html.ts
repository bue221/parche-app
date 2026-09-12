import { useMemo } from 'react';

import type { ParcheEvent } from '@/data/types';

const BOGOTA = { lat: 4.711, lng: -74.072 };

export function mapHtml(opts: {
  events: { id: string; name: string; lat: number; lng: number }[];
  pin?: { lat: number; lng: number };
  pick: boolean;
  dark: boolean;
}) {
  return `<!doctype html>
<html class="${opts.dark ? 'dark' : 'light'}"><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>
  html,body,#map{height:100%;margin:0;background:${opts.dark ? '#0b0b0b' : '#f3f1ea'}}
  .leaflet-control-attribution{font-size:10px;background:transparent;color:#808080}
  .leaflet-tile-pane{filter:grayscale(1) ${opts.dark ? 'invert(1) contrast(0.92) brightness(0.9)' : 'contrast(1.08) brightness(1.02)'}}
  .leaflet-container{font-family:Inter,system-ui,sans-serif;background:${opts.dark ? '#0b0b0b' : '#f3f1ea'};cursor:grab}
  .leaflet-marker-icon,.leaflet-interactive{cursor:pointer}
  .pin{width:18px;height:18px;border:2px solid #000;background:#7ffeb1;border-radius:99px;transition:transform .15s ease}
  .pin.on{transform:scale(1.45);background:#fff;border-color:#7ffeb1;box-shadow:0 0 0 4px rgba(127,254,177,.45)}
  .tip{font:700 11px/1.2 Inter,system-ui,sans-serif;letter-spacing:.06em;text-transform:uppercase;background:#000;color:#7ffeb1;border:0;padding:6px 8px;border-radius:4px}
</style>
</head><body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
const events = ${JSON.stringify(opts.events)};
const pin = ${JSON.stringify(opts.pin ?? null)};
const pick = ${opts.pick ? 'true' : 'false'};
const map = L.map('map', { zoomControl: false, attributionControl: true }).setView([${BOGOTA.lat}, ${BOGOTA.lng}], 12);
L.control.zoom({ position: 'bottomright' }).addTo(map);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OSM' }).addTo(map);
function makeIcon() {
  return L.divIcon({ className: '', html: '<div class="pin"></div>', iconSize: [18, 18], iconAnchor: [9, 9] });
}
function post(payload) {
  const data = JSON.stringify(payload);
  if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(data);
  else if (typeof window.parcheMapEmit === 'function') window.parcheMapEmit(data);
}
const byId = {};
const markers = [];
events.forEach((e) => {
  const m = L.marker([e.lat, e.lng], { icon: makeIcon(), title: e.name })
    .bindTooltip(e.name, { direction: 'top', offset: [0, -10], className: 'tip', opacity: 1 })
    .addTo(map)
    .on('click', (ev) => {
      L.DomEvent.stopPropagation(ev);
      post({ type: 'event', id: e.id });
    });
  m._eid = e.id;
  byId[e.id] = m;
  markers.push(m);
});
let marker = pin ? L.marker([pin.lat, pin.lng], { icon: makeIcon() }).addTo(map) : null;
if (pin) markers.push(marker);
if (markers.length > 1) {
  map.fitBounds(L.featureGroup(markers).getBounds().pad(0.25));
} else if (markers.length === 1) {
  map.setView(markers[0].getLatLng(), 14);
}
function setSelected(id) {
  Object.keys(byId).forEach((key) => {
    const el = byId[key].getElement();
    const node = el && el.querySelector('.pin');
    if (node) node.classList.toggle('on', key === id);
  });
  if (id && byId[id]) map.panTo(byId[id].getLatLng());
}
window.addEventListener('message', (e) => {
  try {
    const msg = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
    if (msg && msg.type === 'select') setSelected(msg.id || null);
  } catch (err) {}
});
if (!pick) {
  map.on('click', () => post({ type: 'clear' }));
}
if (pick) {
  map.on('click', (e) => {
    if (marker) map.removeLayer(marker);
    marker = L.marker(e.latlng, { icon: makeIcon() }).addTo(map);
    post({ type: 'pin', lat: e.latlng.lat, lng: e.latlng.lng });
  });
}
</script></body></html>`;
}

export function useMapHtml(
  events: ParcheEvent[] | undefined,
  pin: { lat: number; lng: number } | undefined,
  pick: boolean,
  dark = false
) {
  const signature = [
    dark ? 'd' : 'l',
    pick ? '1' : '0',
    pin ? `${pin.lat},${pin.lng}` : '',
    (events ?? [])
      .filter((e) => e.lat != null && e.lng != null)
      .map((e) => `${e.id}:${e.lat}:${e.lng}:${e.name}`)
      .join('|'),
  ].join('~');

  return useMemo(() => {
    const pins = (events ?? []).filter((e) => e.lat != null && e.lng != null) as (ParcheEvent & {
      lat: number;
      lng: number;
    })[];
    const html = mapHtml({
      events: pins.map((e) => ({ id: e.id, name: e.name, lat: e.lat, lng: e.lng })),
      pin,
      pick,
      dark,
    });
    return { html, pins };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);
}

export function parseMapMessage(raw: string): { type: string; id?: string; lat?: number; lng?: number } | null {
  try {
    return JSON.parse(raw) as { type: string; id?: string; lat?: number; lng?: number };
  } catch {
    return null;
  }
}
