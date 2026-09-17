import { useMemo } from 'react';

import type { ParcheEvent } from '@/data/types';
import { formatPinDay } from '@/lib/format';

const BOGOTA = { lat: 4.711, lng: -74.072 };

export function mapHtml(opts: {
  events: { id: string; name: string; lat: number; lng: number; genre?: string; label?: string }[];
  pin?: { lat: number; lng: number };
  pick: boolean;
  dark: boolean;
  showZoom?: boolean;
  padTop?: number;
  padBottom?: number;
}) {
  const zoom = opts.showZoom !== false;
  const padTop = Math.max(0, Math.round(opts.padTop ?? 0));
  const padBottom = Math.max(0, Math.round(opts.padBottom ?? 0));
  const canvas = opts.dark ? '#1a1f1c' : '#e8efe4';
  const tileFilter = opts.dark
    ? 'saturate(1.7) brightness(0.7) contrast(1.16)'
    : 'saturate(1.65) contrast(1.12) brightness(1.04)';
  return `<!doctype html>
<html class="${opts.dark ? 'dark' : 'light'}"><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css" />
<link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css" />
<style>
  html,body,#map{height:100%;margin:0;background:${canvas}}
  .leaflet-control-attribution{font-size:10px;background:transparent;color:#808080;margin-bottom:8px}
  .leaflet-tile-pane{filter:${tileFilter}}
  .leaflet-container{font-family:Inter,system-ui,sans-serif;background:${canvas};cursor:grab}
  .leaflet-marker-icon,.leaflet-interactive{cursor:pointer}
  .leaflet-control-zoom{margin-top:${zoom ? 12 : 72}px;margin-right:12px}
  .pin-wrap{background:none !important;border:none !important}
  .pin{width:18px;height:18px;border:2px solid #0b0b12;border-radius:99px;transition:transform .15s ease;background:#3ddcff}
  .pin.neon{background:#3ddcff}
  .pin.volt{background:#7ffeb1}
  .pin.amber{background:#ffc44d}
  .pin.on{transform:scale(1.45);background:#fff;border-color:#3ddcff;box-shadow:0 0 0 4px rgba(61,220,255,.45)}
  .pill{display:flex;align-items:center;gap:6px;padding:7px 12px;border-radius:999px;background:#fff;color:#0b0b12;font:700 11px/1 Inter,system-ui,sans-serif;letter-spacing:.06em;text-transform:uppercase;white-space:nowrap;border:1px solid rgba(11,11,18,.08);box-shadow:0 8px 22px rgba(11,11,18,.16);transform-origin:center bottom;transition:transform .15s ease,background .15s ease,color .15s ease}
  .pill .dot{width:7px;height:7px;border-radius:99px;flex:none}
  .pill.neon .dot{background:#3ddcff}
  .pill.volt .dot{background:#7ffeb1}
  .pill.amber .dot{background:#ffc44d}
  .pill.on{background:#b8a4ff;border-color:#0b0b12;transform:scale(1.08);box-shadow:0 0 0 3px rgba(184,164,255,.4),0 10px 24px rgba(11,11,18,.2)}
  .cluster-wrap{background:none !important;border:none !important}
  .cluster{width:40px;height:40px;border-radius:99px;background:#fff;color:#0b0b12;font:700 13px/40px Inter,system-ui,sans-serif;text-align:center;box-shadow:0 8px 22px rgba(11,11,18,.2);border:1px solid rgba(11,11,18,.08)}
  .tip{font:700 11px/1.2 Inter,system-ui,sans-serif;letter-spacing:.06em;text-transform:uppercase;background:#0b0b12;color:#fff;border:0;padding:6px 8px;border-radius:8px}
</style>
</head><body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js"></script>
<script>
const events = ${JSON.stringify(opts.events)};
const pin = ${JSON.stringify(opts.pin ?? null)};
const pick = ${opts.pick ? 'true' : 'false'};
const zoom = ${zoom ? 'true' : 'false'};
let padTop = ${padTop};
let padBottom = ${padBottom};
const overview = ${zoom ? 'false' : 'true'};
const startZoom = overview ? 11 : 13;
const fitMaxZoom = overview ? 11 : 16;
const map = L.map('map', { zoomControl: false, attributionControl: true }).setView([${BOGOTA.lat}, ${BOGOTA.lng}], startZoom);
if (zoom) L.control.zoom({ position: 'topright' }).addTo(map);
L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
  maxZoom: 19,
  subdomains: 'abc',
  attribution: '&copy; OSM &copy; HOT'
}).addTo(map);
function esc(value) {
  return String(value || '').replace(/[&<>"'\\/]/g, function (ch) {
    return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '/': '&#47;' })[ch];
  });
}
function pinTone(genre) {
  const g = String(genre || '');
  if (!g) return 'neon';
  let n = 0;
  for (let i = 0; i < g.length; i++) n = (n + g.charCodeAt(i)) % 3;
  return n === 1 ? 'volt' : n === 2 ? 'amber' : 'neon';
}
function makeIcon(event) {
  const tone = pinTone(event && event.genre);
  if (event && event.label) {
    return L.divIcon({
      className: 'pin-wrap',
      html: '<div class="pill ' + tone + '"><span class="dot"></span>' + esc(event.label) + '</div>',
      iconSize: [108, 36],
      iconAnchor: [54, 40]
    });
  }
  return L.divIcon({ className: 'pin-wrap', html: '<div class="pin ' + tone + '"></div>', iconSize: [18, 18], iconAnchor: [9, 9] });
}
function post(payload) {
  const data = JSON.stringify(payload);
  if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(data);
  else if (typeof window.parcheMapEmit === 'function') window.parcheMapEmit(data);
}
function boundsPad() {
  if (zoom) return { padding: [36, 36] };
  return { paddingTopLeft: [24, Math.max(48, padTop)], paddingBottomRight: [24, Math.max(48, padBottom)] };
}
function panToVisible(latlng) {
  map.setView(latlng, Math.max(map.getZoom(), 14), { animate: true });
  const shift = (padBottom - padTop) / 2;
  if (shift) map.panBy([0, shift], { animate: true });
}
const byId = {};
const markers = [];
const cluster = !pick && events.length > 1 && window.L && L.markerClusterGroup
  ? L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 64,
      spiderfyOnMaxZoom: true,
      iconCreateFunction: function (c) {
        return L.divIcon({
          html: '<div class="cluster">' + c.getChildCount() + '</div>',
          className: 'cluster-wrap',
          iconSize: [40, 40]
        });
      }
    })
  : null;
events.forEach((e) => {
  const m = L.marker([e.lat, e.lng], { icon: makeIcon(e), title: e.name, riseOnHover: true })
    .bindTooltip(e.name, { direction: 'top', offset: [0, -16], className: 'tip', opacity: 1 })
    .on('click', (ev) => {
      L.DomEvent.stopPropagation(ev);
      post({ type: 'event', id: e.id });
    });
  m._eid = e.id;
  byId[e.id] = m;
  markers.push(m);
  if (cluster) cluster.addLayer(m);
  else m.addTo(map);
});
if (cluster) cluster.addTo(map);
let marker = pin ? L.marker([pin.lat, pin.lng], { icon: makeIcon() }).addTo(map) : null;
if (pin) markers.push(marker);
function fitAll() {
  if (markers.length === 0) return;
  if (overview || markers.length > 1) {
    map.fitBounds(L.featureGroup(markers).getBounds(), Object.assign(boundsPad(), {
      maxZoom: fitMaxZoom,
      animate: false
    }));
    return;
  }
  panToVisible(markers[0].getLatLng());
}
fitAll();
function setSelected(id) {
  Object.keys(byId).forEach((key) => {
    const el = byId[key].getElement();
    const node = el && (el.querySelector('.pill') || el.querySelector('.pin'));
    if (node) node.classList.toggle('on', key === id);
  });
  if (id && byId[id]) panToVisible(byId[id].getLatLng());
}
window.setSelected = setSelected;
window.setMapPad = function (top, bottom) {
  padTop = Number(top) || 0;
  padBottom = Number(bottom) || 0;
  map.invalidateSize();
};
window.addEventListener('resize', function () { map.invalidateSize(); });
window.addEventListener('message', (e) => {
  try {
    const msg = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
    if (!msg) return;
    if (msg.type === 'select') setSelected(msg.id || null);
    if (msg.type === 'pad') window.setMapPad(msg.top, msg.bottom);
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
setTimeout(function () { map.invalidateSize(); }, 200);
</script></body></html>`;
}

export function useMapHtml(
  events: ParcheEvent[] | undefined,
  pin: { lat: number; lng: number } | undefined,
  pick: boolean,
  dark = false,
  showZoom = true,
  padTop = 0,
  padBottom = 0
) {
  const signature = [
    dark ? 'd' : 'l',
    pick ? '1' : '0',
    showZoom ? 'z' : 'n',
    pin ? `${pin.lat},${pin.lng}` : '',
    (events ?? [])
      .filter((e) => e.lat != null && e.lng != null)
      .map((e) => `${e.id}:${e.lat}:${e.lng}:${e.name}:${e.genre ?? ''}:${e.startsAt}`)
      .join('|'),
  ].join('~');

  return useMemo(() => {
    const pins = (events ?? []).filter((e) => e.lat != null && e.lng != null) as (ParcheEvent & {
      lat: number;
      lng: number;
    })[];
    const html = mapHtml({
      events: pins.map((e) => ({
        id: e.id,
        name: e.name,
        lat: e.lat,
        lng: e.lng,
        genre: e.genre,
        label: formatPinDay(e.startsAt),
      })),
      pin,
      pick,
      dark,
      showZoom,
      padTop,
      padBottom,
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
