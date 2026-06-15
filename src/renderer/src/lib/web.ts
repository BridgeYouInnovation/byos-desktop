// Admin features that need connectivity or unsynced data (billing renewal, full
// team management, customization requests) open in the production web app.
const WEB_APP_URL = 'https://byos.bridgeyou.cm'

export function openOnWeb(slug: string, section: string): void {
  window.byos.openExternal(`${WEB_APP_URL}/app/${slug}/${section}`)
}
