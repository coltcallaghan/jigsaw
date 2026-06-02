import React, { useEffect, useState } from 'react'
import MainMenu from './components/MainMenu'
import SetupScreen from './components/SetupScreen'
import PuzzleGame from './components/PuzzleGame'
import SettingsScreen from './components/SettingsScreen'
import type { GameScreen, PieceCountOption, PuzzleConfig } from './puzzle/types'
import { useSettings } from './hooks/useSettings'
import { listSaves, getSave, type SaveData, type SaveMeta } from './utils/saveGame'

type AppScreen = GameScreen | 'settings'


export default function App() {
  const [screen, setScreen] = useState<AppScreen>('menu')
  const [imageDataUrl, setImageDataUrl] = useState('')
  const [imageName, setImageName] = useState('')
  const [puzzleConfig, setPuzzleConfig] = useState<PuzzleConfig | null>(null)
  const [activeSave, setActiveSave] = useState<SaveData | null>(null)
  const [saves, setSaves] = useState<SaveMeta[]>(() => listSaves())

  const { settings, setSettings, resetSettings } = useSettings()

  const handleImageSelected = (dataUrl: string, name: string) => {
    setImageDataUrl(dataUrl)
    setImageName(name)
    setScreen('setup')
  }

  const handleStart = (pieceCount: PieceCountOption) => {
    const img = new Image()
    img.src = imageDataUrl
    img.onload = () => {
      setActiveSave(null)
      setPuzzleConfig({
        imageDataUrl,
        imageWidth: img.naturalWidth,
        imageHeight: img.naturalHeight,
        cols: 0, rows: 0,
        pieceCount,
      })
      setScreen('game')
    }
  }

  const handleContinue = () => {
    if (activeSave) { setPuzzleConfig(activeSave.config); setScreen('game') }
    else if (puzzleConfig) setScreen('game')
  }

  const handleLoadSave = (id: string) => {
    const save = getSave(id)
    if (!save) return
    setActiveSave(save)
    setPuzzleConfig(save.config)
    setScreen('game')
  }

  const handleSaveGame = (save: SaveData) => {
    setActiveSave(save)
    setSaves(listSaves())
  }

  const handleBackToMenu = () => setScreen('menu')

  const appStyle: React.CSSProperties = {
    filter: settings.brightness !== 100 ? `brightness(${settings.brightness / 100})` : undefined,
  }

  return (
    <div className="app" data-theme={settings.theme} style={appStyle}>
      {screen === 'menu' && (
        <MainMenu
          onNewGame={handleImageSelected}
          onContinue={handleContinue}
          onLoadSave={handleLoadSave}
          onSettings={() => setScreen('settings')}
          canContinue={!!activeSave || !!puzzleConfig}
          saves={saves}
          onSavesChange={setSaves}
        />
      )}

      {screen === 'setup' && (
        <SetupScreen
          imageDataUrl={imageDataUrl}
          imageName={imageName}
          onStart={handleStart}
          onBack={() => setScreen('menu')}
        />
      )}

      {screen === 'game' && puzzleConfig && (
        <PuzzleGame
          config={puzzleConfig}
          savedState={activeSave?.pieces ?? null}
          savedElapsed={activeSave?.elapsed ?? 0}
          settings={settings}
          onSettingsChange={setSettings}
          onBackToMenu={handleBackToMenu}
          onSave={handleSaveGame}
        />
      )}

      {screen === 'settings' && (
        <SettingsScreen
          settings={settings}
          onChange={setSettings}
          onReset={resetSettings}
          onBack={() => setScreen('menu')}
        />
      )}
    </div>
  )
}
