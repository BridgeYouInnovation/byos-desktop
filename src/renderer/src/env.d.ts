/// <reference types="vite/client" />

import type { ByosApi } from '../../preload/index'

// The preload bridge, as seen by the renderer — single source of truth in preload.
declare global {
  interface Window {
    byos: ByosApi
  }
}

export {}
