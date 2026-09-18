import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="es" className="bg-background">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <title>Parche</title>
        <meta
          name="description"
          content="Agenda de fiestas techno en Bogotá: eventos, artistas y tiquetes."
        />
        <meta property="og:title" content="Parche" />
        <meta
          property="og:description"
          content="Agenda de fiestas techno en Bogotá: eventos, artistas y tiquetes."
        />
        <meta property="og:site_name" content="Parche" />
        <meta property="og:locale" content="es_CO" />
        <meta name="theme-color" content="#f2f2f5" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#08080d" media="(prefers-color-scheme: dark)" />
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
