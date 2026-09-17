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
        <meta name="theme-color" content="#f2f2f5" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#08080d" media="(prefers-color-scheme: dark)" />
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
