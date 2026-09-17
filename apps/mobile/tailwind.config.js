const { hairlineWidth } = require('nativewind/theme');

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        'pitch-black': 'var(--color-pitch-black)',
        'paper-white': 'var(--color-paper-white)',
        'ash-gray': 'var(--color-ash-gray)',
        concrete: 'var(--color-concrete)',
        charcoal: 'var(--color-charcoal)',
        slate: 'var(--color-slate)',
        stone: 'var(--color-stone)',
        aurora: 'var(--color-aurora)',
        heat: 'var(--color-heat)',
        neon: 'var(--color-neon)',
        volt: 'var(--color-volt)',
        amber: 'var(--color-amber)',
        danger: 'var(--color-danger)',
        confirm: 'var(--color-confirm)',
        'aurora-soft': 'var(--color-aurora-soft)',
        'heat-soft': 'var(--color-heat-soft)',
        'neon-soft': 'var(--color-neon-soft)',
        'volt-soft': 'var(--color-volt-soft)',
        'amber-soft': 'var(--color-amber-soft)',
        'danger-soft': 'var(--color-danger-soft)',
        surface: 'var(--color-surface)',
        glass: 'var(--color-glass)',
        'glass-strong': 'var(--color-glass-strong)',
        glow: 'var(--color-glow)',
        border: 'var(--color-border)',
        input: 'var(--color-input)',
        ring: 'var(--color-ring)',
        background: 'var(--color-background)',
        foreground: 'var(--color-foreground)',
        primary: {
          DEFAULT: 'var(--color-primary)',
          foreground: 'var(--color-primary-foreground)',
        },
        secondary: {
          DEFAULT: 'var(--color-secondary)',
          foreground: 'var(--color-secondary-foreground)',
        },
        destructive: {
          DEFAULT: 'var(--color-destructive)',
          foreground: 'var(--color-destructive-foreground)',
        },
        muted: {
          DEFAULT: 'var(--color-muted)',
          foreground: 'var(--color-muted-foreground)',
        },
        accent: {
          DEFAULT: 'var(--color-accent)',
          foreground: 'var(--color-accent-foreground)',
        },
        popover: {
          DEFAULT: 'var(--color-popover)',
          foreground: 'var(--color-popover-foreground)',
        },
        card: {
          DEFAULT: 'var(--color-card)',
          foreground: 'var(--color-card-foreground)',
        },
      },
      fontFamily: {
        sans: ['Inter'],
        favorit: ['Inter'],
        foggy: ['Antonio'],
      },
      fontSize: {
        caption: [
          'var(--text-caption)',
          { lineHeight: 'var(--leading-caption)', letterSpacing: 'var(--tracking-caption)' },
        ],
        'body-sm': [
          'var(--text-body-sm)',
          { lineHeight: 'var(--leading-body-sm)', letterSpacing: 'var(--tracking-body-sm)' },
        ],
        body: [
          'var(--text-body)',
          { lineHeight: 'var(--leading-body)', letterSpacing: 'var(--tracking-body)' },
        ],
        subheading: [
          'var(--text-subheading)',
          { lineHeight: 'var(--leading-subheading)', letterSpacing: 'var(--tracking-subheading)' },
        ],
        'heading-sm': [
          'var(--text-heading-sm)',
          { lineHeight: 'var(--leading-heading-sm)', letterSpacing: 'var(--tracking-heading-sm)' },
        ],
        heading: [
          'var(--text-heading)',
          { lineHeight: 'var(--leading-heading)', letterSpacing: 'var(--tracking-heading)' },
        ],
        display: [
          'var(--text-display)',
          { lineHeight: 'var(--leading-display)', letterSpacing: 'var(--tracking-display)' },
        ],
      },
      fontWeight: {
        quiet: '350',
        regular: '400',
        bold: '700',
      },
      letterSpacing: {
        favorit: '0.08em',
      },
      maxWidth: {
        page: 'var(--page-max-width)',
      },
      spacing: {
        'ds-4': 'var(--spacing-4)',
        'ds-8': 'var(--spacing-8)',
        'ds-12': 'var(--spacing-12)',
        'ds-16': 'var(--spacing-16)',
        'ds-20': 'var(--spacing-20)',
        'ds-24': 'var(--spacing-24)',
        'ds-32': 'var(--spacing-32)',
        'ds-40': 'var(--spacing-40)',
        'ds-48': 'var(--spacing-48)',
        'ds-60': 'var(--spacing-60)',
        'ds-80': 'var(--section-gap)',
        'ds-120': 'var(--spacing-120)',
      },
      borderRadius: {
        sm: 'var(--radius-small)',
        md: 'var(--radius-small)',
        lg: 'var(--radius-cards)',
        xl: 'var(--radius-xl)',
        '2xl': 'var(--radius-navelements)',
        '3xl': 'var(--radius-buttons)',
        full: 'var(--radius-tags)',
        tags: 'var(--radius-tags)',
        cards: 'var(--radius-cards)',
        images: 'var(--radius-images)',
        buttons: 'var(--radius-buttons)',
        navelements: 'var(--radius-navelements)',
      },
      borderWidth: {
        hairline: hairlineWidth(),
      },
      boxShadow: {
        none: 'none',
        card: 'var(--shadow-card)',
        glass: 'var(--shadow-glass)',
        tab: 'var(--shadow-tab)',
        control: 'var(--shadow-control)',
        button: 'var(--shadow-button)',
        signal: 'var(--shadow-signal)',
        confirm: 'var(--shadow-confirm)',
        focus: 'var(--shadow-focus)',
        error: 'var(--shadow-error)',
      },
    },
  },
  future: {
    hoverOnlyWhenSupported: true,
  },
  plugins: [],
};
