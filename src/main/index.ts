import { app, shell, BrowserWindow } from 'electron'
import { join } from 'path'
import { registerIpc } from './ipc'
import { getDb, closeDb } from './db/connection'

const isDev = !app.isPackaged
const SMOKE = !!process.env.BYOS_SMOKE
const SYNC_SMOKE = !!process.env.BYOS_SYNC_SMOKE

// Isolate smoke tests in a throwaway data dir so they never touch the user's DB.
if (SMOKE || SYNC_SMOKE) {
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
    title: 'BridgeYou Business OS',
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
  // Live PowerSync round-trip test — does NOT touch the better-sqlite3 layer.
  if (SYNC_SMOKE) {
    const { runSyncSmoke } = await import('./sync/sync-smoke')
    await runSyncSmoke()
    app.quit()
    return
  }

  // Open + migrate + seed the local DB before the UI can query it.
  getDb()
  registerIpc()

  if (SMOKE) {
    const { runSmoke } = await import('./smoke')
    await runSmoke()
    app.quit()
    return
  }

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('will-quit', () => {
  closeDb()
})
