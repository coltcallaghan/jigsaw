import React, { useEffect, useState } from 'react'
import MainMenu from './components/MainMenu'
import SetupScreen from './components/SetupScreen'
import PuzzleGame from './components/PuzzleGame'
import SettingsScreen from './components/SettingsScreen'
import type { GameScreen, PieceCountOption, PuzzleConfig } from './puzzle/types'
import { useSettings } from './hooks/useSettings'
import { listSaves, getSave, deleteSave, listCompleted, getStorageStatus, type SaveData, type SaveMeta, type CompletedPuzzle } from './utils/saveGame'
import { nextPuzzleName } from './utils/puzzleNaming'
import { pickImage } from './utils/pickImage'
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
  // Stable id for the active puzzle, owned here so it survives PuzzleGame
  // remounts (a new game mints one; loading a save reuses the save's id).
  const [puzzleId, setPuzzleId] = useState<string | null>(null)
  // True once the active puzzle has been completed, so Continue won't reopen it.
  const [puzzleFinished, setPuzzleFinished] = useState(false)
  const [activeSave, setActiveSave] = useState<SaveData | null>(null)
  const [saves, setSaves] = useState<SaveMeta[]>([])
  const [completed, setCompleted] = useState<CompletedPuzzle[]>([])
  const [storageNearFull, setStorageNearFull] = useState(false)
  const [consented, setConsented] = useState<boolean>(() => hasAcceptedCurrentPolicy())

  const refreshStorageStatus = () => {
    void getStorageStatus().then(s => setStorageNearFull(s.nearFull))
  }

  // Saves + completed puzzles live in IndexedDB (async) — load on mount.
  useEffect(() => {
    void listSaves().then(setSaves)
    void listCompleted().then(setCompleted)
    refreshStorageStatus()
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

  // Play a themed UI click on any button press (delegated at the root so every
  // button gets it without per-button wiring). Capture phase so it fires even if
  // a handler stops propagation. AudioManager gates this on SFX volume/enabled.
  useEffect(() => {
    if (!consented) return
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null
      if (target?.closest('button, .btn, [role="button"]')) {
        AudioManager.playClick(settings.theme)
      }
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => document.removeEventListener('pointerdown', onPointerDown, true)
  }, [consented, settings.theme])

  // Background music follows the active theme across all screens once the user
  // has accepted consent (the first user gesture, which browsers require before
  // audio can start). Stops only when music is disabled or consent is pending.
  useEffect(() => {
    if (consented && settings.musicEnabled) {
      AudioManager.playMusic(settings.theme)
    } else {
      AudioManager.stopMusic()
    }
  }, [consented, settings.theme, settings.musicEnabled])

  const handleImageSelected = (dataUrl: string) => {
    setImageDataUrl(dataUrl)
    // Puzzles are named sequentially ("Puzzle 1", "Puzzle 2", …) regardless of
    // the source file name. The name is editable on the setup screen.
    setImageName(nextPuzzleName())
    setScreen('setup')
  }

  // Used by the win overlay's "New Puzzle" — go straight to image selection,
  // clearing any finished-puzzle state first.
  const handleNewPuzzle = async () => {
    const dataUrl = await pickImage()
    if (!dataUrl) return
    setPuzzleFinished(false)
    setPuzzleConfig(null)
    setPuzzleId(null)
    setActiveSave(null)
    handleImageSelected(dataUrl)
  }

  const handleStart = (pieceCount: PieceCountOption, name: string) => {
    const img = new Image()
    img.src = imageDataUrl
    img.onload = () => {
      setActiveSave(null)
      setPuzzleFinished(false)
      setPuzzleId(Date.now().toString())
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
    setPuzzleFinished(false)
    setPuzzleId(save.id)
    // Backfill name for saves created before puzzles were named.
    setPuzzleConfig({ ...save.config, name: save.config.name ?? save.imageName })
    setScreen('game')
  }

  const handleSaveGame = (save: SaveData) => {
    setActiveSave(save)
    void listSaves().then(setSaves)
    refreshStorageStatus()
  }

  const handlePuzzleComplete = (completedId: string) => {
    // PuzzleGame has already written the completed record by this point; drop
    // the in-progress save and refresh both menu lists.
    void deleteSave(completedId).then(() => listSaves().then(setSaves))
    void listCompleted().then(setCompleted)
    refreshStorageStatus()
    // Mark the active puzzle finished so "Continue" won't reopen it with a fresh
    // (empty) board. We keep puzzleConfig set so the win overlay stays visible.
    setActiveSave(null)
    setPuzzleFinished(true)
  }

  const handleBackToMenu = () => {
    // Leaving a finished puzzle: forget it so Continue has nothing stale to open.
    if (puzzleFinished) {
      setPuzzleConfig(null)
      setPuzzleId(null)
      setPuzzleFinished(false)
    }
    setScreen('menu')
  }

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
          canContinue={!puzzleFinished && (!!activeSave || !!puzzleConfig)}
          saves={saves}
          onSavesChange={(s) => { setSaves(s); refreshStorageStatus() }}
          completed={completed}
          onCompletedChange={(c) => { setCompleted(c); refreshStorageStatus() }}
          storageNearFull={storageNearFull}
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
          saveId={puzzleId}
          savedState={activeSave?.pieces ?? null}
          savedElapsed={activeSave?.elapsed ?? 0}
          settings={settings}
          onSettingsChange={setSettings}
          onSettingsReset={resetSettings}
          onBackToMenu={handleBackToMenu}
          onSave={handleSaveGame}
          onComplete={handlePuzzleComplete}
          onNewPuzzle={handleNewPuzzle}
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
