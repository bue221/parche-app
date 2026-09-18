import Head from 'expo-router/head';
import { useEffect } from 'react';

export const SITE_NAME = 'Parche';
export const SITE_DESCRIPTION =
  'Agenda de fiestas techno en Bogotá: eventos, artistas y tiquetes.';

function clipMeta(value: string, max = 160) {
  const trimmed = value.trim().replace(/\s+/g, ' ');
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

export function documentTitle(title?: string) {
  const trimmed = title?.replace(/\s+/g, ' ').trim();
  if (!trimmed || trimmed === SITE_NAME) return SITE_NAME;
  return `${trimmed} · ${SITE_NAME}`;
}

function setMeta(attr: 'name' | 'property', key: string, content: string | undefined) {
  const selector = `meta[${attr}="${key}"]`;
  let el = document.head.querySelector(selector);
  if (!content) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function applyDocumentHead(fullTitle: string, desc: string, image?: string) {
  document.title = fullTitle;
  setMeta('name', 'description', desc);
  setMeta('property', 'og:title', fullTitle);
  setMeta('property', 'og:description', desc);
  setMeta('property', 'og:site_name', SITE_NAME);
  setMeta('property', 'og:locale', 'es_CO');
  setMeta('property', 'og:image', image);
}

function HeadTags({
  fullTitle,
  desc,
  image,
}: {
  fullTitle: string;
  desc: string;
  image?: string;
}) {
  return (
    <Head>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="es_CO" />
      {image ? <meta property="og:image" content={image} /> : null}
    </Head>
  );
}

export function WebHead({
  title,
  description,
  image,
}: {
  title?: string;
  description?: string;
  image?: string;
}) {
  const fullTitle = documentTitle(title);
  const desc = clipMeta(description?.trim() ? description : SITE_DESCRIPTION);
  const canUseDom = typeof document !== 'undefined';

  useEffect(() => {
    if (!canUseDom) return;
    applyDocumentHead(fullTitle, desc, image);
    const observer = new MutationObserver(() => {
      if (document.title !== fullTitle) {
        applyDocumentHead(fullTitle, desc, image);
      }
    });
    observer.observe(document.head, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [canUseDom, fullTitle, desc, image]);

  // Client: write the DOM directly. Head is for static HTML export.
  if (canUseDom) return null;
  return <HeadTags fullTitle={fullTitle} desc={desc} image={image} />;
}
