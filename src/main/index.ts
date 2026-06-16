import { app, shell, BrowserWindow } from 'electron'
import { join } from 'path'
import { registerIpc } from './ipc'
import { getPowerSync, connectSync, closePowerSync } from './sync/powersync'
import { getLoggedInUserId } from './prefs'

const isDev = !app.isPackaged
const SYNC_SMOKE = !!process.env.BYOS_SYNC_SMOKE

// Isolate the sync smoke test in a throwaway data dir so it never touches the
// user's real database.
if (SYNC_SMOKE) {
  app.setPath('userData', join(app.getPath('temp'), `byos-smoke-${process.pid}`))
}

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    show: false,
    autoHideMenuBar: true,
    title: 'BYOS',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => mainWindow.show())

  // Open external links in the system browser, not inside the app window.
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // electron-vite injects ELECTRON_RENDERER_URL in dev; load the built file in prod.
  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(async () => {
  // Live PowerSync round-trip test (isolated temp DB).
  if (SYNC_SMOKE) {
    const { runSyncSmoke } = await import('./sync/sync-smoke')
    await runSyncSmoke()
    app.quit()
    return
  }

  // Open the local PowerSync DB and register IPC before the UI queries it.
  getPowerSync()
  registerIpc()

  // If a user is already logged in (cached account), resume syncing in the
  // background so their data is fresh when online and available when offline.
  if (getLoggedInUserId()) {
    connectSync().catch(() => {
      /* offline — PowerSync retries automatically */
    })
  }

  createWindow()

  // Check for updates on launch (packaged builds only; publishes to GitHub
  // Releases). No-op if there is no update feed yet.
  if (!isDev) {
    import('electron-updater')
      .then(({ autoUpdater }) => autoUpdater.checkForUpdatesAndNotify())
      .catch(() => {
        /* offline or no feed — ignore */
      })
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('will-quit', () => {
  closePowerSync()
})
