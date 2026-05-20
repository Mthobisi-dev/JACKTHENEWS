'use client'

import * as React from 'react'
import { useEffect } from 'react'
import {
  ThemeProvider as NextThemesProvider,
  type ThemeProviderProps,
  useTheme,
} from 'next-themes'
import { useSettingsStore } from '@/lib/stores/settings-store'

function ThemeSyncProvider({ children }: { children: React.ReactNode }) {
  const { setTheme: setNextTheme } = useTheme()
  const storeTheme = useSettingsStore((state) => state.theme)
  
  useEffect(() => {
    setNextTheme(storeTheme)
  }, [storeTheme, setNextTheme])
  
  return <>{children}</>
}

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider {...props}>
      <ThemeSyncProvider>
        {children}
      </ThemeSyncProvider>
    </NextThemesProvider>
  )
}
