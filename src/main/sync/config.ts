// Where the desktop talks to the BYOS backend for online login + the sync
// token/upload endpoints. The PowerSync instance URL is NOT hardcoded — the
// backend returns it from /api/sync/token (the `powersync_url` field).
//
// Override at dev time with BYOS_BACKEND_URL (e.g. the local web dev server).
// Production installers point this at https://byos.bridgeyou.cm once the
// feat/desktop-sync branch is deployed.
export const BACKEND_URL = process.env.BYOS_BACKEND_URL || 'http://localhost:3000'
