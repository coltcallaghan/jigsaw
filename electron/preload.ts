import Electron from 'electron'

const { contextBridge, ipcRenderer } = Electron

contextBridge.exposeInMainWorld('electronAPI', {
  openImage: (): Promise<string | null> => ipcRenderer.invoke('open-image')
})

contextBridge.exposeInMainWorld('steamAPI', {
  activateAchievement: (name: string): Promise<boolean> =>
    ipcRenderer.invoke('steam-achievement', name)
})
