// Paleta oficial tomada de op/plantillas/tmp_aps/css/aps-ui.css (Sistema de diseño APS)
export const colors = {
  navy: '#16214d',
  navy2: '#233163',
  navy3: '#2b3f86',
  blue: '#2563eb',
  blue2: '#1d4ed8',
  teal: '#2bb7b3',
  ink: '#0f172a',
  ink2: '#475569',
  mut: '#8a93a5',
  line: 'rgba(255,255,255,0.14)',
  card: 'rgba(255,255,255,0.07)',
  cardBorder: 'rgba(255,255,255,0.16)',
  ok: '#16a34a',
  warn: '#f59e0b',
  danger: '#dc2626',
  white: '#ffffff',
  text: '#f4f6fb',
  textMuted: 'rgba(244,246,251,0.62)',
  placeholder: 'rgba(244,246,251,0.38)',
  inputBg: 'rgba(255,255,255,0.09)',
};

export const gradients = {
  hero: [colors.navy, colors.navy2, colors.navy3] as const,
  primaryButton: [colors.blue, colors.blue2] as const,
  teal: [colors.teal, '#1f8f8c'] as const,
};

export const radii = {
  card: 18,
  input: 14,
  button: 14,
  pill: 999,
};

export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
};
