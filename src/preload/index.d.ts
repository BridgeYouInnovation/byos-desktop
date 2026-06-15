import type { ByosApi } from './index'

declare global {
  interface Window {
    byos: ByosApi
  }
}

export {}
