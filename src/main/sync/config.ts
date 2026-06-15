// Where the desktop talks to the BYOS backend for online login + the sync
// token/upload endpoints. The PowerSync instance URL is NOT hardcoded — the
// backend returns it from /api/sync/token (the `powersync_url` field).
//
// Defaults to production (the deployed sync API). Override with BYOS_BACKEND_URL
// to point at a local web dev server (e.g. http://localhost:3000).
export const BACKEND_URL = process.env.BYOS_BACKEND_URL || 'https://byos.bridgeyou.cm'
