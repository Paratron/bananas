import { screen } from 'electron'
import settings from 'electron-settings'

export type SettingsData = {
  username: string
  color: string
}

type Settings = {
  get: () => SettingsData
  set: (data: SettingsData) => void
}

type WindowState = {
  x?: number
  y?: number
  width: number
  height: number
  isMaximized: boolean
}

type WindowStateKeeper = WindowState & {
  track: (win: Electron.BrowserWindow) => void
}

export const settingsKeeper = async (): Promise<Settings> => {
  const hasSettings = await settings.has('settings')
  if (hasSettings) {
    return {
      get: (): SettingsData => settings.get('settings') as unknown as SettingsData,
      set: (data: SettingsData) => settings.set('settings', data)
    }
  }
  return {
    get: (): SettingsData => ({ username: 'Banana Joe', color: '#ffffff' }),
    set: (data: SettingsData) => settings.set('settings', data)
  }
}

export const windowStateKeeper = async (windowName: string): Promise<WindowStateKeeper> => {
  let window: Electron.BrowserWindow
  let windowState: WindowState

  const setBounds = async (): Promise<WindowState> => {
    const hasState = await settings.has(`windowState.${windowName}`)
    if (hasState) {
      return (await settings.get(`windowState.${windowName}`)) as unknown as WindowState
    }

    const size = screen.getPrimaryDisplay().workAreaSize

    return {
      width: size.width / 2,
      height: size.height / 2,
      isMaximized: false
    }
  }

  const saveState = async (): Promise<void> => {
    // bug: lots of save state events are called. they should be debounced
    const bounds = window.getBounds()
    windowState = {
      ...bounds,
      isMaximized: window.isMaximized()
    }
    await settings.set(`windowState.${windowName}`, windowState)
  }

  const track = async (win: Electron.BrowserWindow): Promise<void> => {
    window = win
    win.on('move', saveState)
    win.on('resize', saveState)
    win.on('unmaximize', saveState)
  }

  windowState = await setBounds()

  return {
    x: windowState.x,
    y: windowState.y,
    width: windowState.width,
    height: windowState.height,
    isMaximized: windowState.isMaximized,
    track
  }
}
