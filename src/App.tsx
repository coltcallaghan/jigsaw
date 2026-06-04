import React, { useEffect, useState } from 'react'
import MainMenu from './components/MainMenu'
import SetupScreen from './components/SetupScreen'
import PuzzleGame from './components/PuzzleGame'
import SettingsScreen from './components/SettingsScreen'
import type { GameScreen, PieceCountOption, PuzzleConfig } from './puzzle/types'
import { useSettings } from './hooks/useSettings'
import { listSaves, getSave, deleteSave, listCompleted, type SaveData, type SaveMeta, type CompletedPuzzle } from './utils/saveGame'
import { nextPuzzleName } from './utils/puzzleNaming'
import { hasAcceptedCurrentPolicy, acceptCurrentPolicy } from './utils/consent'
import ConsentGate from './components/ConsentGate'
import { AudioManager } from './audio/AudioManager'
import { syncEntitlement } from './config/purchases'

type AppScreen = GameScreen | 'settings'


export default function App() {
  const [screen, setScreen] = useState<AppScreen>('menu')
  const [imageDataUrl, setImageDataUrl] = useState('')
  const [imageName, setImageName] = useState('')
  const [puzzleConfig, setPuzzleConfig] = useState<PuzzleConfig | null>(null)
  const [activeSave, setActiveSave] = useState<SaveData | null>(null)
  const [saves, setSaves] = useState<SaveMeta[]>([])
  const [completed, setCompleted] = useState<CompletedPuzzle[]>([])
  const [consented, setConsented] = useState<boolean>(() => hasAcceptedCurrentPolicy())

  // Saves + completed puzzles live in IndexedDB (async) — load on mount.
  useEffect(() => {
    void listSaves().then(setSaves)
    void listCompleted().then(setCompleted)
  }, [])

  const { settings, setSettings, resetSettings } = useSettings()

  // Refresh the unlock entitlement from the store on launch (no-op on web/desktop).
  useEffect(() => {
    void syncEntitlement().catch(() => {
      // Offline or unconfigured store — keep the cached unlock flag.
    })
  }, [])

  // Push volume/enabled settings into the audio engine whenever they change.
  useEffect(() => {
    AudioManager.setVolumes({
      master: settings.masterVolume / 100,
      music: settings.musicVolume / 100,
      sfx: settings.sfxVolume / 100,
      sfxEnabled: settings.sfxEnabled,
      musicEnabled: settings.musicEnabled,
    })
  }, [settings.masterVolume, settings.musicVolume, settings.sfxVolume, settings.sfxEnabled, settings.musicEnabled])

  // Background music follows the active theme while in a game; stop elsewhere.
  useEffect(() => {
    if (screen === 'game' && settings.musicEnabled) {
      AudioManager.playMusic(settings.theme)
    } else {
      AudioManager.stopMusic()
    }
  }, [screen, settings.theme, settings.musicEnabled])

  const handleImageSelected = (dataUrl: string) => {
    setImageDataUrl(dataUrl)
    // Puzzles are named sequentially ("Puzzle 1", "Puzzle 2", …) regardless of
    // the source file name. The name is editable on the setup screen.
    setImageName(nextPuzzleName())
    setScreen('setup')
  }

  const handleStart = (pieceCount: PieceCountOption, name: string) => {
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
        name: name.trim() || imageName,
      })
      setScreen('game')
    }
  }

  const handleContinue = () => {
    if (activeSave) { setPuzzleConfig(activeSave.config); setScreen('game') }
    else if (puzzleConfig) setScreen('game')
  }

  const handleLoadSave = async (id: string) => {
    const save = await getSave(id)
    if (!save) return
    setActiveSave(save)
    // Backfill name for saves created before puzzles were named.
    setPuzzleConfig({ ...save.config, name: save.config.name ?? save.imageName })
    setScreen('game')
  }

  const handleSaveGame = (save: SaveData) => {
    setActiveSave(save)
    void listSaves().then(setSaves)
  }

  const handlePuzzleComplete = (completedId: string) => {
    // PuzzleGame already wrote it to the completed store; drop the in-progress
    // save and refresh both menu lists.
    void deleteSave(completedId).then(() => listSaves().then(setSaves))
    void listCompleted().then(setCompleted)
    setActiveSave(null)
  }

  const handleBackToMenu = () => setScreen('menu')

  const appStyle: React.CSSProperties = {
    filter: settings.brightness !== 100 ? `brightness(${settings.brightness / 100})` : undefined,
  }

  const handleAcceptConsent = () => {
    acceptCurrentPolicy()
    setConsented(true)
  }

  return (
    <div className="app" data-theme={settings.theme} style={appStyle}>
      {!consented && <ConsentGate onAccept={handleAcceptConsent} />}

      {screen === 'menu' && (
        <MainMenu
          onNewGame={handleImageSelected}
          onContinue={handleContinue}
          onLoadSave={handleLoadSave}
          onSettings={() => setScreen('settings')}
          canContinue={!!activeSave || !!puzzleConfig}
          saves={saves}
          onSavesChange={setSaves}
          completed={completed}
          onCompletedChange={setCompleted}
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
          onComplete={handlePuzzleComplete}
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
