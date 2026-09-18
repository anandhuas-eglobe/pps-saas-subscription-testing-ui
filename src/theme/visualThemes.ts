export const APP_VISUAL_THEME_IDS = [
  'default',
  'fire',
  'glass',
  'midnight',
  'ocean',
  'aurora',
] as const

export type AppVisualThemeId = (typeof APP_VISUAL_THEME_IDS)[number]

export interface AppVisualThemeMeta {
  id: AppVisualThemeId
  label: string
  description: string
  /** Small CSS gradient used in settings dropdown previews. */
  previewGradient: string
}

export const APP_VISUAL_THEMES: AppVisualThemeMeta[] = [
  {
    id: 'default',
    label: 'Default',
    description: 'Indigo / blue accents on a white canvas',
    previewGradient: 'linear-gradient(135deg, #312e81 0%, #4338ca 55%, #2563eb 100%)',
  },
  {
    id: 'fire',
    label: 'Fire',
    description: 'Crimson-to-amber header and warm orange accents',
    previewGradient: 'linear-gradient(135deg, #7f1d1d 0%, #c2410c 48%, #ea580c 78%, #f59e0b 100%)',
  },
  {
    id: 'glass',
    label: 'Glass',
    description: 'Frosted cyan cards and cool teal accents',
    previewGradient:
      'linear-gradient(135deg, rgba(14,116,144,0.92) 0%, rgba(56,189,248,0.9) 100%)',
  },
  {
    id: 'midnight',
    label: 'Midnight',
    description: 'Violet / magenta accents with a deep purple header',
    previewGradient: 'linear-gradient(135deg, #1e1b4b 0%, #5b21b6 50%, #a21caf 100%)',
  },
  {
    id: 'ocean',
    label: 'Ocean',
    description: 'Teal-to-cyan header and sea-green accents',
    previewGradient: 'linear-gradient(135deg, #115e59 0%, #0e7490 50%, #06b6d4 100%)',
  },
  {
    id: 'aurora',
    label: 'Aurora',
    description: 'Emerald → violet → pink accent spectrum',
    previewGradient: 'linear-gradient(135deg, #065f46 0%, #7c3aed 55%, #db2777 100%)',
  },
]

export function isAppVisualThemeId(value: unknown): value is AppVisualThemeId {
  return typeof value === 'string' && (APP_VISUAL_THEME_IDS as readonly string[]).includes(value)
}

export function getAppVisualThemeMeta(id: AppVisualThemeId): AppVisualThemeMeta {
  return APP_VISUAL_THEMES.find((theme) => theme.id === id) ?? APP_VISUAL_THEMES[0]
}
