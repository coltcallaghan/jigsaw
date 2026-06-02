import Electron from 'electron'

const { contextBridge, ipcRenderer } = Electron

contextBridge.exposeInMainWorld('electronAPI', {
  openImage: (): Promise<string | null> => ipcRenderer.invoke('open-image')
})
