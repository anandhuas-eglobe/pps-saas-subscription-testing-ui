import { createTheme, type Theme } from '@mui/material/styles'
import type { AppVisualThemeId } from './visualThemes'

export interface AppCustomThemeTokens {
  id: AppVisualThemeId
  label: string
  appBarGradient: string
  heroGradient: string
  loginBackground: string
  pageShellBackground: string
  brandMarkGradient: string
  paperGlass?: boolean
}

declare module '@mui/material/styles' {
  interface Theme {
    custom: AppCustomThemeTokens
  }
  interface ThemeOptions {
    custom?: AppCustomThemeTokens
  }
}

const SHARED_BODY = '#ffffff'
const SHARED_PAGE_SHELL = '#ffffff'

function buildTheme(
  custom: AppCustomThemeTokens,
  options: Parameters<typeof createTheme>[0],
): Theme {
  return createTheme({
    ...options,
    custom,
  })
}

const baseTypography = {
  fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  h4: { fontWeight: 700, letterSpacing: '-0.02em' },
  h5: { fontWeight: 700, letterSpacing: '-0.01em' },
  h6: { fontWeight: 600 },
  subtitle1: { color: '#64748b' },
  button: { textTransform: 'none' as const, fontWeight: 600 },
}

const defaultTheme = buildTheme(
  {
    id: 'default',
    label: 'Default',
    appBarGradient: 'linear-gradient(135deg, #312e81 0%, #4338ca 55%, #2563eb 100%)',
    heroGradient: 'linear-gradient(135deg, #312e81 0%, #4338ca 45%, #2563eb 100%)',
    loginBackground:
      'radial-gradient(circle at top left, rgba(79, 70, 229, 0.12), transparent 32%), radial-gradient(circle at bottom right, rgba(37, 99, 235, 0.1), transparent 28%), #ffffff',
    pageShellBackground: SHARED_PAGE_SHELL,
    brandMarkGradient: 'linear-gradient(135deg, #312e81 0%, #4338ca 55%, #2563eb 100%)',
  },
  {
    palette: {
      mode: 'light',
      primary: { main: '#4f46e5', light: '#818cf8', dark: '#3730a3' },
      secondary: { main: '#0ea5e9' },
      background: { default: SHARED_BODY, paper: '#ffffff' },
      success: { main: '#059669' },
      warning: { main: '#d97706' },
      error: { main: '#dc2626' },
      divider: 'rgba(15, 23, 42, 0.08)',
    },
    shape: { borderRadius: 14 },
    typography: baseTypography,
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: SHARED_BODY,
            backgroundImage: 'none',
          },
        },
      },
      MuiPaper: {
        styleOverrides: { root: { backgroundImage: 'none' } },
      },
      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: { border: '1px solid rgba(15, 23, 42, 0.08)' },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: { borderRadius: 10, boxShadow: 'none' },
          contained: { boxShadow: '0 10px 24px rgba(79, 70, 229, 0.18)' },
        },
      },
      MuiChip: {
        styleOverrides: { root: { fontWeight: 600 } },
      },
    },
  },
)

const fireTheme = buildTheme(
  {
    id: 'fire',
    label: 'Fire',
    appBarGradient: 'linear-gradient(135deg, #7f1d1d 0%, #c2410c 48%, #ea580c 78%, #f59e0b 100%)',
    heroGradient: 'linear-gradient(135deg, #7f1d1d 0%, #c2410c 40%, #f97316 78%, #fbbf24 100%)',
    loginBackground:
      'radial-gradient(circle at top left, rgba(234, 88, 12, 0.14), transparent 32%), radial-gradient(circle at bottom right, rgba(220, 38, 38, 0.1), transparent 28%), #ffffff',
    pageShellBackground: SHARED_PAGE_SHELL,
    brandMarkGradient: 'linear-gradient(135deg, #b91c1c 0%, #ea580c 55%, #fbbf24 100%)',
  },
  {
    palette: {
      mode: 'light',
      primary: { main: '#ea580c', light: '#fb923c', dark: '#c2410c' },
      secondary: { main: '#dc2626' },
      background: { default: SHARED_BODY, paper: '#ffffff' },
      success: { main: '#059669' },
      warning: { main: '#d97706' },
      error: { main: '#dc2626' },
      divider: 'rgba(194, 65, 12, 0.14)',
    },
    shape: { borderRadius: 12 },
    typography: { ...baseTypography, h4: { ...baseTypography.h4, fontWeight: 800 } },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: SHARED_BODY,
            backgroundImage: 'none',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            border: '1px solid rgba(234, 88, 12, 0.14)',
          },
        },
      },
      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            border: '1px solid rgba(234, 88, 12, 0.16)',
            boxShadow: '0 8px 24px rgba(194, 65, 12, 0.06)',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: { borderRadius: 10, boxShadow: 'none' },
          contained: { boxShadow: '0 10px 24px rgba(234, 88, 12, 0.22)' },
        },
      },
      MuiChip: {
        styleOverrides: { root: { fontWeight: 700 } },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            '&.MuiIconButton-colorPrimary': {
              backgroundColor: 'rgba(234, 88, 12, 0.08)',
            },
          },
        },
      },
    },
  },
)

const glassTheme = buildTheme(
  {
    id: 'glass',
    label: 'Glass',
    appBarGradient:
      'linear-gradient(135deg, rgba(14, 116, 144, 0.92) 0%, rgba(8, 145, 178, 0.88) 55%, rgba(56, 189, 248, 0.9) 100%)',
    heroGradient:
      'linear-gradient(135deg, #0e7490 0%, #0891b2 45%, #38bdf8 100%)',
    loginBackground:
      'radial-gradient(circle at top left, rgba(56, 189, 248, 0.14), transparent 32%), radial-gradient(circle at bottom right, rgba(139, 92, 246, 0.1), transparent 28%), #ffffff',
    pageShellBackground: SHARED_PAGE_SHELL,
    brandMarkGradient: 'linear-gradient(135deg, #0e7490 0%, #38bdf8 100%)',
    paperGlass: true,
  },
  {
    palette: {
      mode: 'light',
      primary: { main: '#0891b2', light: '#67e8f9', dark: '#0e7490' },
      secondary: { main: '#8b5cf6' },
      background: { default: SHARED_BODY, paper: '#ffffff' },
      success: { main: '#10b981' },
      warning: { main: '#f59e0b' },
      error: { main: '#ef4444' },
      divider: 'rgba(8, 145, 178, 0.14)',
    },
    shape: { borderRadius: 18 },
    typography: baseTypography,
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: SHARED_BODY,
            backgroundImage: 'none',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundColor: 'rgba(255, 255, 255, 0.82) !important',
            backgroundImage:
              'linear-gradient(145deg, rgba(255,255,255,0.95), rgba(224,242,254,0.35))',
            backdropFilter: 'blur(12px) saturate(140%)',
            WebkitBackdropFilter: 'blur(12px) saturate(140%)',
            border: '1px solid rgba(8, 145, 178, 0.16)',
            boxShadow: '0 10px 28px rgba(8, 145, 178, 0.08)',
          },
        },
      },
      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            backgroundColor: 'rgba(255, 255, 255, 0.88) !important',
            backgroundImage:
              'linear-gradient(160deg, rgba(255,255,255,0.95), rgba(207,250,254,0.35))',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: '1px solid rgba(8, 145, 178, 0.14)',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: { borderRadius: 12, boxShadow: 'none' },
          contained: { boxShadow: '0 10px 24px rgba(8, 145, 178, 0.22)' },
        },
      },
      MuiChip: {
        styleOverrides: { root: { fontWeight: 600 } },
      },
    },
  },
)

const midnightTheme = buildTheme(
  {
    id: 'midnight',
    label: 'Midnight',
    appBarGradient: 'linear-gradient(135deg, #1e1b4b 0%, #5b21b6 50%, #a21caf 100%)',
    heroGradient: 'linear-gradient(135deg, #312e81 0%, #7c3aed 50%, #c026d3 100%)',
    loginBackground:
      'radial-gradient(circle at top left, rgba(124, 58, 237, 0.12), transparent 32%), radial-gradient(circle at bottom right, rgba(192, 38, 211, 0.1), transparent 28%), #ffffff',
    pageShellBackground: SHARED_PAGE_SHELL,
    brandMarkGradient: 'linear-gradient(135deg, #6366f1 0%, #a855f7 55%, #d946ef 100%)',
  },
  {
    palette: {
      mode: 'light',
      primary: { main: '#7c3aed', light: '#a78bfa', dark: '#5b21b6' },
      secondary: { main: '#c026d3' },
      background: { default: SHARED_BODY, paper: '#ffffff' },
      success: { main: '#059669' },
      warning: { main: '#d97706' },
      error: { main: '#dc2626' },
      divider: 'rgba(124, 58, 237, 0.14)',
    },
    shape: { borderRadius: 16 },
    typography: { ...baseTypography, h4: { ...baseTypography.h4, fontWeight: 800 } },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: SHARED_BODY,
            backgroundImage: 'none',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            border: '1px solid rgba(124, 58, 237, 0.14)',
            boxShadow: '0 8px 24px rgba(91, 33, 182, 0.06)',
          },
        },
      },
      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            border: '1px solid rgba(124, 58, 237, 0.16)',
            boxShadow: '0 8px 24px rgba(124, 58, 237, 0.06)',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: { borderRadius: 12, boxShadow: 'none' },
          contained: { boxShadow: '0 10px 24px rgba(124, 58, 237, 0.22)' },
        },
      },
      MuiChip: {
        styleOverrides: { root: { fontWeight: 700 } },
      },
    },
  },
)

const oceanTheme = buildTheme(
  {
    id: 'ocean',
    label: 'Ocean',
    appBarGradient: 'linear-gradient(135deg, #115e59 0%, #0e7490 50%, #06b6d4 100%)',
    heroGradient: 'linear-gradient(135deg, #0f766e 0%, #0891b2 50%, #22d3ee 100%)',
    loginBackground:
      'radial-gradient(circle at top left, rgba(6, 182, 212, 0.12), transparent 32%), radial-gradient(circle at bottom right, rgba(13, 148, 136, 0.1), transparent 28%), #ffffff',
    pageShellBackground: SHARED_PAGE_SHELL,
    brandMarkGradient: 'linear-gradient(135deg, #0f766e 0%, #22d3ee 100%)',
  },
  {
    palette: {
      mode: 'light',
      primary: { main: '#0d9488', light: '#5eead4', dark: '#0f766e' },
      secondary: { main: '#06b6d4' },
      background: { default: SHARED_BODY, paper: '#ffffff' },
      success: { main: '#059669' },
      warning: { main: '#d97706' },
      error: { main: '#dc2626' },
      divider: 'rgba(13, 148, 136, 0.14)',
    },
    shape: { borderRadius: 14 },
    typography: baseTypography,
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: SHARED_BODY,
            backgroundImage: 'none',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            border: '1px solid rgba(13, 148, 136, 0.14)',
          },
        },
      },
      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            border: '1px solid rgba(13, 148, 136, 0.16)',
            boxShadow: '0 8px 24px rgba(13, 148, 136, 0.06)',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: { borderRadius: 10, boxShadow: 'none' },
          contained: { boxShadow: '0 10px 24px rgba(13, 148, 136, 0.22)' },
        },
      },
      MuiChip: {
        styleOverrides: { root: { fontWeight: 600 } },
      },
    },
  },
)

const auroraTheme = buildTheme(
  {
    id: 'aurora',
    label: 'Aurora',
    appBarGradient: 'linear-gradient(135deg, #065f46 0%, #7c3aed 55%, #db2777 100%)',
    heroGradient: 'linear-gradient(135deg, #059669 0%, #7c3aed 50%, #db2777 100%)',
    loginBackground:
      'radial-gradient(circle at top left, rgba(16, 185, 129, 0.12), transparent 32%), radial-gradient(circle at bottom right, rgba(219, 39, 119, 0.1), transparent 28%), #ffffff',
    pageShellBackground: SHARED_PAGE_SHELL,
    brandMarkGradient: 'linear-gradient(135deg, #10b981 0%, #8b5cf6 50%, #ec4899 100%)',
  },
  {
    palette: {
      mode: 'light',
      primary: { main: '#059669', light: '#34d399', dark: '#047857' },
      secondary: { main: '#a855f7' },
      background: { default: SHARED_BODY, paper: '#ffffff' },
      success: { main: '#10b981' },
      warning: { main: '#d97706' },
      error: { main: '#dc2626' },
      divider: 'rgba(5, 150, 105, 0.14)',
    },
    shape: { borderRadius: 16 },
    typography: { ...baseTypography, h4: { ...baseTypography.h4, fontWeight: 800 } },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: SHARED_BODY,
            backgroundImage: 'none',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            border: '1px solid rgba(5, 150, 105, 0.14)',
            boxShadow: '0 8px 24px rgba(124, 58, 237, 0.05)',
          },
        },
      },
      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            border: '1px solid rgba(168, 85, 247, 0.14)',
            boxShadow: '0 8px 24px rgba(5, 150, 105, 0.06)',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: { borderRadius: 12, boxShadow: 'none' },
          contained: { boxShadow: '0 10px 24px rgba(5, 150, 105, 0.2)' },
        },
      },
      MuiChip: {
        styleOverrides: { root: { fontWeight: 700 } },
      },
    },
  },
)

const THEME_MAP: Record<AppVisualThemeId, Theme> = {
  default: defaultTheme,
  fire: fireTheme,
  glass: glassTheme,
  midnight: midnightTheme,
  ocean: oceanTheme,
  aurora: auroraTheme,
}

/** @deprecated Use getThemeById('default') via ServerThemeProvider. */
export const appTheme = defaultTheme

export function getThemeById(id: AppVisualThemeId): Theme {
  return THEME_MAP[id] ?? defaultTheme
}
