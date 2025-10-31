import { autoUpdater } from "electron-updater"
import { BrowserWindow, ipcMain, app } from "electron"
import log from "electron-log"

export function initAutoUpdater() {
  log.info("Initializing auto-updater...")

  // Skip update checks in development
  if (!app.isPackaged) {
    log.info("Skipping auto-updater in development mode")
    return
  }

  if (!process.env.GH_TOKEN) {
    log.error("GH_TOKEN environment variable is not set")
    return
  }

  // Configure auto updater
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.allowDowngrade = true
  autoUpdater.allowPrerelease = true

  // Enable more verbose logging
  autoUpdater.logger = log
  log.transports.file.level = "debug"
  log.info(
    "Auto-updater logger configured with level:",
    log.transports.file.level
  )

  // Log all update events
  autoUpdater.on("checking-for-update", () => {
    log.info("Checking for updates...")
  })

  autoUpdater.on("update-available", (info) => {
    log.info("Update available:", info)
    // Notify renderer process about available update
    BrowserWindow.getAllWindows().forEach((window) => {
      log.info("Sending update-available to window")
      window.webContents.send("update-available", info)
    })
  })

  autoUpdater.on("update-not-available", (info) => {
    log.info("Update not available:", info)
  })

  autoUpdater.on("download-progress", (progressObj) => {
    log.info("Download progress:", progressObj)
  })

  autoUpdater.on("update-downloaded", (info) => {
    log.info("Update downloaded:", info)
    // Notify renderer process that update is ready to install
    BrowserWindow.getAllWindows().forEach((window) => {
      log.info("Sending update-downloaded to window")
      window.webContents.send("update-downloaded", info)
    })
  })

  autoUpdater.on("error", (err) => {
    log.error("Auto updater error:", err)
  })

  // Check for updates immediately
  log.info("Checking for updates...")
  autoUpdater
    .checkForUpdates()
    .then((result) => {
      log.info("Update check result:", result)
    })
    .catch((err) => {
      log.error("Error checking for updates:", err)
    })

  // Set up update checking interval (every 1 hour)
  setInterval(() => {
    log.info("Checking for updates (interval)...")
    autoUpdater
      .checkForUpdates()
      .then((result) => {
        log.info("Update check result (interval):", result)
      })
      .catch((err) => {
        log.error("Error checking for updates (interval):", err)
      })
  }, 60 * 60 * 1000)

  // Handle IPC messages from renderer
  ipcMain.handle("start-update", async () => {
    log.info("Start update requested")
    try {
      await autoUpdater.downloadUpdate()
      log.info("Update download completed")
      return { success: true }
    } catch (error) {
      log.error("Failed to start update:", error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle("install-update", () => {
    log.info("Install update requested")
    autoUpdater.quitAndInstall()
  })
}
