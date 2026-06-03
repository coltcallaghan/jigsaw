import {
  Application,
  Container,
  Graphics,
  Polygon,
  Sprite,
  Texture,
  FederatedPointerEvent,
} from 'pixi.js'
import type { PieceDefinition, PuzzleConfig } from './types'
import { buildPiecePath, computeGrid, generatePieces, renderPieceTextures } from './generator'
import type { PieceState } from '../utils/saveGame'
import type { Theme } from '../hooks/useSettings'
import { AudioManager } from '../audio/AudioManager'

let SNAP_DISTANCE = 0.5  // fraction of piece size to trigger snap — overridable via setSnapSensitivity()
const TAB_PAD_FRAC = 0.35 * 1.5

// Board "felt" colour per theme — mirrors the --board-felt CSS tokens in theme.css
const THEME_FELT: Record<Theme, number> = {
  cartoon: 0xB9E6FF,
  modern:  0xE8ECF4,
  dark:    0x0E1320,
  arcade:  0x0D0220,
}

export interface PuzzleEngineOptions {
  canvas: HTMLCanvasElement
  config: PuzzleConfig
  theme: Theme
  outlines: boolean
  onProgress: (placed: number, total: number) => void
  onComplete: () => void
  onTrayUpdate: (pieceIds: number[]) => void
  onReady: () => void
}

interface PieceSprite extends Sprite {
  pieceId: number
  pieceCol: number
  pieceRow: number
  placed: boolean
  inTray: boolean
  groupId: number | null  // for connected-piece groups
}

export class PuzzleEngine {
  private app: Application
  private board: Container        // the pan/zoom container
  private piecesLayer: Container  // pieces live here
  private ghostLayer: Container   // ghost image overlay
  private boardBg: Graphics | null = null   // subtle board area fill
  private pieces: Map<number, PieceSprite> = new Map()
  private edgeGraphics: Map<number, Graphics> = new Map()
  private definitions: PieceDefinition[] = []
  private config!: PuzzleConfig
  private cols = 0
  private rows = 0
  private pieceW = 0
  private pieceH = 0
  private padding = 0

  private dragging: PieceSprite | null = null
  private dragOffX = 0
  private dragOffY = 0

  private placedCount = 0
  private onProgress: (placed: number, total: number) => void
  private onComplete: () => void
  private onTrayUpdate: (pieceIds: number[]) => void
  private onReady: () => void
  private theme: Theme = 'dark'
  private outlines = true

  // Pan state
  private isPanning = false
  private panStartX = 0
  private panStartY = 0
  private boardStartX = 0
  private boardStartY = 0

  // Multi-touch pinch state — tracks active pointers by id
  private activePointers: Map<number, { x: number; y: number }> = new Map()
  private pinchStartDist = 0
  private pinchStartScale = 1
  private isPinching = false

  // Long-press-to-stash (touch equivalent of right-click)
  private static readonly LONG_PRESS_MS = 500
  private static readonly LONG_PRESS_MOVE_TOL = 12  // px of movement that cancels a long-press
  private longPressTimer: ReturnType<typeof setTimeout> | null = null
  private longPressSprite: PieceSprite | null = null
  private longPressStartX = 0
  private longPressStartY = 0

  // Groups of snapped-together pieces
  private groups: Map<number, Set<number>> = new Map()
  private nextGroupId = 1

  // Lifecycle guards
  private destroyed = false
  private appInitialized = false
  private rafId = 0

  // Tray tracks insertion order (FIFO), not grid order
  private trayOrder: number[] = []

  constructor(opts: PuzzleEngineOptions) {
    this.onProgress = opts.onProgress
    this.onComplete = opts.onComplete
    this.onTrayUpdate = opts.onTrayUpdate
    this.onReady = opts.onReady
    this.theme = opts.theme
    this.outlines = opts.outlines

    this.app = new Application()
    this.board = new Container()
    this.piecesLayer = new Container()
    this.ghostLayer = new Container()
    // Defer one frame so the canvas has browser-computed dimensions
    this.rafId = requestAnimationFrame(() => { void this.init(opts.canvas, opts.config) })
  }

  private async init(canvas: HTMLCanvasElement, config: PuzzleConfig) {
    if (this.destroyed) return
    this.config = config

    const w = canvas.clientWidth || canvas.offsetWidth || window.innerWidth
    const h = canvas.clientHeight || canvas.offsetHeight || window.innerHeight

    const felt = THEME_FELT[this.theme] ?? THEME_FELT.dark

    await this.app.init({
      canvas,
      width: w,
      height: h,
      background: felt,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    })

    if (this.destroyed) {
      this.app.destroy(false, { children: true, texture: true })
      return
    }
    this.appInitialized = true

    const { cols, rows } = computeGrid(config.imageWidth, config.imageHeight, config.pieceCount)
    this.cols = cols
    this.rows = rows
    this.pieceW = config.imageWidth / cols
    this.pieceH = config.imageHeight / rows
    this.padding = this.pieceW * TAB_PAD_FRAC

    this.definitions = generatePieces({ ...config, cols, rows })

    // Load the image
    const img = new Image()
    img.src = config.imageDataUrl
    await new Promise<void>((resolve) => { img.onload = () => resolve() })

    // Render textures
    const bitmaps = await renderPieceTextures(img, this.definitions)

    // Set up board container with initial centering
    this.board.addChild(this.ghostLayer)
    this.board.addChild(this.piecesLayer)
    this.app.stage.addChild(this.board)

    // Build ghost image layer (board bg is added inside, before the ghost sprite)
    await this.buildGhostLayer(img)
    // Initial board area highlight using the default background colour
    this.rebuildBoardBg(felt)

    // Build all piece sprites
    for (const def of this.definitions) {
      const bitmap = bitmaps.get(def.id)!
      const texture = Texture.from(bitmap)
      const sprite = new Sprite(texture) as PieceSprite
      sprite.pieceId = def.id
      sprite.pieceCol = def.col
      sprite.pieceRow = def.row
      sprite.placed = false
      sprite.inTray = false
      sprite.groupId = null
      sprite.anchor.set(0.5)

      // Scatter pieces in the 4 regions surrounding the board, never on top of it
      const boardW = cols * this.pieceW
      const boardH = rows * this.pieceH
      const pad = Math.max(this.pieceW, this.pieceH) * 0.8 + 10
      const side = Math.floor(Math.random() * 4)
      switch (side) {
        case 0: // left
          sprite.x = -(pad + Math.random() * boardW * 0.7)
          sprite.y = -boardH * 0.1 + Math.random() * boardH * 1.2
          break
        case 1: // right
          sprite.x = boardW + pad + Math.random() * boardW * 0.7
          sprite.y = -boardH * 0.1 + Math.random() * boardH * 1.2
          break
        case 2: // top
          sprite.x = -boardW * 0.1 + Math.random() * boardW * 1.2
          sprite.y = -(pad + Math.random() * boardH * 0.7)
          break
        default: // bottom
          sprite.x = -boardW * 0.1 + Math.random() * boardW * 1.2
          sprite.y = boardH + pad + Math.random() * boardH * 0.7
          break
      }
      sprite.rotation = (Math.random() - 0.5) * 0.3

      sprite.eventMode = 'static'
      sprite.cursor = 'grab'
      // Hit area = the actual jigsaw outline, so transparent corners don't grab
      // and pieces hidden behind another piece's empty corner stay reachable.
      sprite.hitArea = this.buildHitArea(def)
      sprite.on('pointerdown', (e: FederatedPointerEvent) => this.onPieceDown(sprite, e))
      sprite.on('rightclick', () => this.onPieceRightClick(sprite))

      const edge = this.buildEdgeGraphics(def)
      edge.visible = this.outlines
      sprite.addChild(edge)
      this.edgeGraphics.set(def.id, edge)

      this.piecesLayer.addChild(sprite)
      this.pieces.set(def.id, sprite)
    }

    // Initial view: zoom out to show all scattered pieces with board centred
    this.fitAll()

    // Stage-level events for drag/pan
    this.app.stage.eventMode = 'static'
    this.app.stage.hitArea = this.app.screen
    this.app.stage.on('pointermove', (e: FederatedPointerEvent) => this.onStageMove(e))
    this.app.stage.on('pointerup', (e: FederatedPointerEvent) => this.onStageUp(e))
    this.app.stage.on('pointerupoutside', (e: FederatedPointerEvent) => this.onStageUp(e))
    this.app.stage.on('pointercancel', (e: FederatedPointerEvent) => this.onStageUp(e))
    this.app.stage.on('pointerdown', (e: FederatedPointerEvent) => this.onStageDown(e))

    // Prevent the browser from claiming touch gestures (scroll/zoom) over the canvas,
    // so PixiJS pointer events drive pan / drag / pinch instead.
    canvas.style.touchAction = 'none'

    // Wheel zoom + suppress browser context menu so right-click works for tray
    canvas.addEventListener('wheel', (e) => this.onWheel(e), { passive: false })
    canvas.addEventListener('contextmenu', (e) => e.preventDefault())

    this.app.ticker.add(() => this.update())
    this.onReady()
  }

  private async buildGhostLayer(img: HTMLImageElement) {
    const texture = Texture.from(img)
    const ghost = new Sprite(texture)
    ghost.anchor.set(0)
    ghost.x = 0
    ghost.y = 0
    ghost.width = this.cols * this.pieceW
    ghost.height = this.rows * this.pieceH
    ghost.alpha = 0
    ghost.label = 'ghost'
    this.ghostLayer.addChild(ghost)
  }

  setGhostOpacity(opacity: number) {
    if (!this.appInitialized) return
    const ghost = this.ghostLayer.getChildByLabel('ghost') as Sprite | null
    if (ghost) ghost.alpha = opacity
  }

  // ─── Drag ────────────────────────────────────────────────────────────────

  private onPieceDown(sprite: PieceSprite, e: FederatedPointerEvent) {
    if (sprite.placed) return   // locked — cannot move placed pieces
    if (this.isPinching) return // ignore piece grabs mid-pinch
    e.stopPropagation()
    this.dragging = sprite
    sprite.cursor = 'grabbing'
    AudioManager.play('piece_pickup')

    // Arm long-press-to-stash — touch/pen only. On a mouse, holding the button
    // while deciding where to move a piece must NOT stash it (right-click does).
    if (e.pointerType === 'touch' || e.pointerType === 'pen') {
      this.armLongPress(sprite, e.globalX, e.globalY)
    }

    const local = this.piecesLayer.toLocal(e.global)
    this.dragOffX = local.x - sprite.x
    this.dragOffY = local.y - sprite.y

    // Bring to front
    this.piecesLayer.setChildIndex(sprite, this.piecesLayer.children.length - 1)

    // If part of a group, bring all group members to front
    if (sprite.groupId !== null) {
      const group = this.groups.get(sprite.groupId)
      if (group) {
        group.forEach((id) => {
          const s = this.pieces.get(id)
          if (s && s !== sprite) {
            this.piecesLayer.setChildIndex(s, this.piecesLayer.children.length - 1)
          }
        })
      }
    }
  }

  private onStageDown(e: FederatedPointerEvent) {
    this.activePointers.set(e.pointerId, { x: e.globalX, y: e.globalY })

    // A second pointer begins a pinch — cancel any in-progress drag/pan/long-press
    if (this.activePointers.size === 2) {
      this.beginPinch()
      return
    }

    if (!this.dragging && this.activePointers.size === 1) {
      this.isPanning = true
      this.panStartX = e.globalX
      this.panStartY = e.globalY
      this.boardStartX = this.board.x
      this.boardStartY = this.board.y
    }
  }

  private onStageMove(e: FederatedPointerEvent) {
    if (this.activePointers.has(e.pointerId)) {
      this.activePointers.set(e.pointerId, { x: e.globalX, y: e.globalY })
    }

    if (this.isPinching) {
      this.updatePinch()
      return
    }

    if (this.dragging) {
      // Movement beyond tolerance cancels the pending long-press (it's now a drag)
      if (this.longPressTimer &&
          Math.hypot(e.globalX - this.longPressStartX, e.globalY - this.longPressStartY) > PuzzleEngine.LONG_PRESS_MOVE_TOL) {
        this.cancelLongPress()
      }

      const local = this.piecesLayer.toLocal(e.global)
      const dx = local.x - this.dragOffX - this.dragging.x
      const dy = local.y - this.dragOffY - this.dragging.y

      this.dragging.x = local.x - this.dragOffX
      this.dragging.y = local.y - this.dragOffY
      this.dragging.rotation = 0  // snap rotation when dragging

      // Move the whole group if connected
      if (this.dragging.groupId !== null) {
        const group = this.groups.get(this.dragging.groupId)
        if (group) {
          group.forEach((id) => {
            const s = this.pieces.get(id)
            if (s && s !== this.dragging) {
              s.x += dx
              s.y += dy
            }
          })
        }
      }
    } else if (this.isPanning) {
      this.board.x = this.boardStartX + (e.globalX - this.panStartX)
      this.board.y = this.boardStartY + (e.globalY - this.panStartY)
    }
  }

  private onStageUp(e?: FederatedPointerEvent) {
    if (e) this.activePointers.delete(e.pointerId)

    this.cancelLongPress()

    if (this.dragging) {
      this.dragging.cursor = 'grab'
      this.trySnap(this.dragging)
      this.dragging = null
    }
    this.isPanning = false

    // Dropping below two pointers ends the pinch
    if (this.isPinching && this.activePointers.size < 2) {
      this.isPinching = false
    }
  }

  // ─── Pinch zoom ──────────────────────────────────────────────────────────

  private pointerPair(): [{ x: number; y: number }, { x: number; y: number }] | null {
    const pts = [...this.activePointers.values()]
    if (pts.length < 2) return null
    return [pts[0], pts[1]]
  }

  private beginPinch() {
    const pair = this.pointerPair()
    if (!pair) return
    // Abandon single-touch interactions so they don't fight the pinch
    this.cancelLongPress()
    if (this.dragging) { this.dragging.cursor = 'grab'; this.dragging = null }
    this.isPanning = false
    this.isPinching = true
    this.pinchStartDist = Math.hypot(pair[0].x - pair[1].x, pair[0].y - pair[1].y) || 1
    this.pinchStartScale = this.board.scale.x
  }

  private updatePinch() {
    const pair = this.pointerPair()
    if (!pair) return
    const dist = Math.hypot(pair[0].x - pair[1].x, pair[0].y - pair[1].y) || 1
    const midX = (pair[0].x + pair[1].x) / 2
    const midY = (pair[0].y + pair[1].y) / 2

    const newScale = Math.max(0.05, Math.min(4, this.pinchStartScale * (dist / this.pinchStartDist)))
    // Keep the gesture midpoint anchored in world space while scaling
    const worldX = (midX - this.board.x) / this.board.scale.x
    const worldY = (midY - this.board.y) / this.board.scale.y
    this.board.scale.set(newScale)
    this.board.x = midX - worldX * newScale
    this.board.y = midY - worldY * newScale
  }

  // ─── Long-press to stash ───────────────────────────────────────────────────

  private armLongPress(sprite: PieceSprite, globalX: number, globalY: number) {
    this.cancelLongPress()
    if (sprite.placed || sprite.inTray) return
    this.longPressSprite = sprite
    this.longPressStartX = globalX
    this.longPressStartY = globalY
    this.longPressTimer = setTimeout(() => {
      const s = this.longPressSprite
      this.longPressTimer = null
      if (s && !s.placed && !s.inTray) {
        // Stash the piece; abandon the drag that was in progress
        if (this.dragging === s) { this.dragging = null }
        this.sendToTray(s.pieceId)
      }
    }, PuzzleEngine.LONG_PRESS_MS)
  }

  private cancelLongPress() {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer)
      this.longPressTimer = null
    }
    this.longPressSprite = null
  }

  // ─── Snap logic ─────────────────────────────────────────────────────────

  private trySnap(sprite: PieceSprite) {
    const def = this.definitions[sprite.pieceId]
    const snapDist = Math.min(this.pieceW, this.pieceH) * SNAP_DISTANCE

    // A piece only ever snaps to its OWN correct solved position. This guarantees
    // pieces can never link to the wrong neighbour: every connection is by virtue
    // of both pieces being in their true grid slots, so adjacency is always real.
    const solvedX = def.col * this.pieceW + this.pieceW / 2
    const solvedY = def.row * this.pieceH + this.pieceH / 2
    const distToSolved = Math.hypot(sprite.x - solvedX, sprite.y - solvedY)

    if (distToSolved >= snapDist || sprite.placed) return

    // Lock to the absolute solved position
    sprite.x = solvedX
    sprite.y = solvedY
    sprite.rotation = 0
    sprite.placed = true
    sprite.cursor = 'default'
    sprite.eventMode = 'none'   // clicks pass through to pieces below
    this.addPlacedBorder(sprite, def)

    // Merge with any already-placed grid neighbours so completed regions read
    // as a single connected group (purely cosmetic now — all are at solved pos).
    const neighbours = [
      { dc: 0, dr: -1 }, { dc: 1, dr: 0 }, { dc: 0, dr: 1 }, { dc: -1, dr: 0 },
    ]
    let merged = false
    for (const { dc, dr } of neighbours) {
      const nc = def.col + dc
      const nr = def.row + dr
      if (nc < 0 || nc >= this.cols || nr < 0 || nr >= this.rows) continue
      const neighbour = this.pieces.get(nr * this.cols + nc)
      if (neighbour && neighbour.placed) {
        this.mergeGroups(sprite, neighbour)
        merged = true
      }
    }

    AudioManager.play(merged ? 'piece_group' : 'piece_snap')
    this.placedCount++
    this.onProgress(this.placedCount, this.definitions.length)
    if (this.placedCount === this.definitions.length) this.onComplete()
  }

  private mergeGroups(a: PieceSprite, b: PieceSprite) {
    if (a.groupId !== null && a.groupId === b.groupId) return  // same group already

    const gid = this.nextGroupId++
    const members = new Set<number>()

    if (a.groupId !== null) {
      this.groups.get(a.groupId)?.forEach((id) => members.add(id))
      this.groups.delete(a.groupId)
    } else {
      members.add(a.pieceId)
    }

    if (b.groupId !== null) {
      this.groups.get(b.groupId)?.forEach((id) => members.add(id))
      this.groups.delete(b.groupId)
    } else {
      members.add(b.pieceId)
    }

    this.groups.set(gid, members)
    members.forEach((id) => {
      const s = this.pieces.get(id)
      if (s) s.groupId = gid
    })
  }

  // ─── Zoom ────────────────────────────────────────────────────────────────

  private onWheel(e: WheelEvent) {
    e.preventDefault()
    const scaleBy = e.deltaY < 0 ? 1.1 : 0.9
    const newScale = Math.max(0.05, Math.min(4, this.board.scale.x * scaleBy))

    const pointerX = e.clientX
    const pointerY = e.clientY
    const worldX = (pointerX - this.board.x) / this.board.scale.x
    const worldY = (pointerY - this.board.y) / this.board.scale.y

    this.board.scale.set(newScale)
    this.board.x = pointerX - worldX * newScale
    this.board.y = pointerY - worldY * newScale
  }

  // ─── Camera ──────────────────────────────────────────────────────────────

  private fitAll() {
    const boardW = this.cols * this.pieceW
    const boardH = this.rows * this.pieceH
    const screenW = this.app.screen.width
    const screenH = this.app.screen.height

    // Match the scatter extents: pieces reach ~0.7*boardSize beyond the board
    // on each side, plus the piece-size pad used during scatter.
    const scatterPad = Math.max(this.pieceW, this.pieceH) * 0.8 + 10
    const totalW = boardW * 2.4 + 2 * scatterPad + this.pieceW
    const totalH = boardH * 2.4 + 2 * scatterPad + this.pieceH

    const scale = Math.min(screenW / totalW, screenH / totalH) * 0.92
    this.board.scale.set(scale)

    // Scatter is symmetric so the content centre = board centre (boardW/2, boardH/2)
    this.board.x = screenW / 2 - (boardW / 2) * scale
    this.board.y = screenH / 2 - (boardH / 2) * scale
  }

  private fitBoard() {
    const boardW = this.cols * this.pieceW
    const boardH = this.rows * this.pieceH
    const screenW = this.app.screen.width
    const screenH = this.app.screen.height

    const scale = Math.min(screenW / boardW, screenH / boardH) * 0.80
    this.board.scale.set(scale)
    this.board.x = (screenW - boardW * scale) / 2
    this.board.y = (screenH - boardH * scale) / 2
  }

  centerCamera() {
    if (!this.appInitialized) return
    this.fitAll()
  }

  zoomIn() {
    if (!this.appInitialized) return
    this.applyZoom(1.25)
  }

  zoomOut() {
    if (!this.appInitialized) return
    this.applyZoom(0.8)
  }

  pan(dx: number, dy: number) {
    if (!this.appInitialized) return
    this.board.x += dx
    this.board.y += dy
  }

  private applyZoom(factor: number) {
    const pivotX = this.app.screen.width / 2
    const pivotY = this.app.screen.height / 2
    const newScale = Math.max(0.05, Math.min(4, this.board.scale.x * factor))
    const worldX = (pivotX - this.board.x) / this.board.scale.x
    const worldY = (pivotY - this.board.y) / this.board.scale.y
    this.board.scale.set(newScale)
    this.board.x = pivotX - worldX * newScale
    this.board.y = pivotY - worldY * newScale
  }

  // ─── Tray ────────────────────────────────────────────────────────────────

  private onPieceRightClick(sprite: PieceSprite) {
    if (sprite.placed || sprite.inTray) return
    sprite.inTray = true
    sprite.visible = false
    this.trayOrder.push(sprite.pieceId)
    AudioManager.play('tray_add')
    this.onTrayUpdate(this.getTrayPieceIds())
  }

  sendToTray(pieceId: number) {
    const sprite = this.pieces.get(pieceId)
    if (!sprite || sprite.placed || sprite.inTray) return
    sprite.inTray = true
    sprite.visible = false
    this.trayOrder.push(pieceId)
    AudioManager.play('tray_add')
    this.onTrayUpdate(this.getTrayPieceIds())
  }

  addAllToTray() {
    const newIds: number[] = []
    this.pieces.forEach((sprite, id) => {
      if (!sprite.placed && !sprite.inTray) {
        sprite.inTray = true
        sprite.visible = false
        newIds.push(id)
      }
    })
    // Fisher-Yates shuffle so the tray isn't trivially ordered by grid position
    for (let i = newIds.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[newIds[i], newIds[j]] = [newIds[j], newIds[i]]
    }
    this.trayOrder.push(...newIds)
    if (newIds.length > 0) AudioManager.play('tray_add')
    this.onTrayUpdate(this.getTrayPieceIds())
  }

  retrieveFromTray(pieceId: number) {
    const sprite = this.pieces.get(pieceId)
    if (!sprite) return
    sprite.inTray = false
    sprite.visible = true
    this.trayOrder = this.trayOrder.filter(id => id !== pieceId)
    AudioManager.play('tray_retrieve')
    this.onTrayUpdate(this.getTrayPieceIds())
  }

  getTrayPieceIds(): number[] {
    return [...this.trayOrder]
  }

  // ─── Save / Load ─────────────────────────────────────────────────────────

  getSaveState(): PieceState[] {
    const states: PieceState[] = []
    // Non-tray pieces first (grid order is fine for these)
    this.pieces.forEach((sprite, id) => {
      if (!sprite.inTray) {
        states.push({
          id,
          x: sprite.x,
          y: sprite.y,
          placed: sprite.placed,
          inTray: false,
          groupId: sprite.groupId,
        })
      }
    })
    // Tray pieces last, in trayOrder sequence so loadFromSave restores the shuffle
    for (const id of this.trayOrder) {
      const sprite = this.pieces.get(id)!
      states.push({
        id,
        x: sprite.x,
        y: sprite.y,
        placed: false,
        inTray: true,
        groupId: sprite.groupId,
      })
    }
    return states
  }

  loadFromSave(pieceStates: PieceState[]) {
    for (const state of pieceStates) {
      const sprite = this.pieces.get(state.id)
      if (!sprite) continue
      sprite.x = state.x
      sprite.y = state.y
      sprite.rotation = 0

      if (state.placed) {
        const def = this.definitions[state.id]
        sprite.x = def.col * this.pieceW + this.pieceW / 2
        sprite.y = def.row * this.pieceH + this.pieceH / 2
        sprite.placed = true
        sprite.cursor = 'default'
        sprite.eventMode = 'none'
        this.addPlacedBorder(sprite, def)
        this.placedCount++
        this.onProgress(this.placedCount, this.definitions.length)
      } else if (state.inTray) {
        sprite.inTray = true
        sprite.visible = false
        this.trayOrder.push(state.id)
      }

      if (state.groupId !== null) {
        sprite.groupId = state.groupId
        if (!this.groups.has(state.groupId)) this.groups.set(state.groupId, new Set())
        this.groups.get(state.groupId)!.add(state.id)
      }
    }
    this.onTrayUpdate(this.getTrayPieceIds())
  }

  // ─── Runtime settings ────────────────────────────────────────────────────

  /** `fraction` is a SNAP_DISTANCE value (fraction of piece size), via snapFraction(). */
  setSnapSensitivity(fraction: number) {
    SNAP_DISTANCE = Math.max(0.12, Math.min(0.4, fraction))
  }

  setBackgroundColor(hex: string) {
    if (!this.appInitialized) return
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    const num = (r << 16) | (g << 8) | b
    this.app.renderer.background.color = num
    this.rebuildBoardBg(num)
  }

  private rebuildBoardBg(bgColor: number) {
    if (this.boardBg) {
      this.ghostLayer.removeChild(this.boardBg)
      this.boardBg.destroy()
      this.boardBg = null
    }

    const boardW = this.cols * this.pieceW
    const boardH = this.rows * this.pieceH

    // Lift each channel by ~18 to create a subtle contrast zone for the board
    const lift = (ch: number) => Math.min(255, ch + 18)
    const r = lift((bgColor >> 16) & 0xff)
    const g = lift((bgColor >> 8) & 0xff)
    const b = lift(bgColor & 0xff)
    const boardColor = (r << 16) | (g << 8) | b

    const bg = new Graphics()
    bg.rect(0, 0, boardW, boardH)
    bg.fill({ color: boardColor, alpha: 1 })
    bg.rect(0, 0, boardW, boardH)
    bg.stroke({ color: 0xffffff, width: 1, alpha: 0.08 })
    bg.eventMode = 'none'

    this.boardBg = bg
    this.ghostLayer.addChildAt(bg, 0)   // below the ghost sprite
  }

  getColsRows() {
    return { cols: this.cols, rows: this.rows }
  }

  // ─── Edge / border helpers ───────────────────────────────────────────────

  private applyPathToGraphics(pathStr: string, g: Graphics) {
    const tokens = pathStr.trim().split(/\s+/)
    let i = 0
    while (i < tokens.length) {
      const cmd = tokens[i++]
      switch (cmd) {
        case 'M': g.moveTo(+tokens[i], +tokens[i + 1]); i += 2; break
        case 'L': g.lineTo(+tokens[i], +tokens[i + 1]); i += 2; break
        case 'C':
          g.bezierCurveTo(
            +tokens[i], +tokens[i + 1],
            +tokens[i + 2], +tokens[i + 3],
            +tokens[i + 4], +tokens[i + 5]
          )
          i += 6; break
        case 'Z': g.closePath(); break
        default: break
      }
    }
  }

  /**
   * Flatten a piece path into a Polygon hit area in the sprite's centred local
   * space, so only the actual jigsaw shape is grabbable (not the transparent
   * bounding-box corners). Bezier segments are sampled into line points.
   */
  private buildHitArea(def: PieceDefinition): Polygon {
    const pathStr = buildPiecePath(def.edges, def.srcW, def.srcH)
    const tokens = pathStr.trim().split(/\s+/)
    const pts: number[] = []
    // anchor is 0.5, so local coords are offset to centre the piece
    const ox = -def.srcW / 2
    const oy = -def.srcH / 2
    let cx = 0, cy = 0
    const push = (x: number, y: number) => { pts.push(x + ox, y + oy) }
    const SEGMENTS = 8

    let i = 0
    while (i < tokens.length) {
      const cmd = tokens[i++]
      switch (cmd) {
        case 'M':
        case 'L': {
          cx = +tokens[i]; cy = +tokens[i + 1]; i += 2
          push(cx, cy)
          break
        }
        case 'C': {
          const x1 = +tokens[i], y1 = +tokens[i + 1]
          const x2 = +tokens[i + 2], y2 = +tokens[i + 3]
          const x3 = +tokens[i + 4], y3 = +tokens[i + 5]
          i += 6
          for (let s = 1; s <= SEGMENTS; s++) {
            const t = s / SEGMENTS, u = 1 - t
            // Cubic bezier from (cx,cy) via (x1,y1),(x2,y2) to (x3,y3)
            const x = u*u*u*cx + 3*u*u*t*x1 + 3*u*t*t*x2 + t*t*t*x3
            const y = u*u*u*cy + 3*u*u*t*y1 + 3*u*t*t*y2 + t*t*t*y3
            push(x, y)
          }
          cx = x3; cy = y3
          break
        }
        case 'Z': default: break
      }
    }
    return new Polygon(pts)
  }

  /**
   * Two-tone outline: a wider dark "halo" stroke underneath plus a thinner
   * light stroke on top. The pairing stays visible on any image — the dark
   * halo reads against light areas, the light line reads against dark areas.
   * `accent` lets a theme tint the top line (e.g. arcade neon).
   */
  private buildEdgeGraphics(def: PieceDefinition): Graphics {
    type EdgeStyle = {
      dark: number; light: number
      darkAlpha: number; lightAlpha: number
      darkWidth: number; lightWidth: number
    }
    const edgeStyle: Record<Theme, EdgeStyle> = {
      cartoon: { dark: 0x000000, light: 0xFFFFFF, darkAlpha: 0.45, lightAlpha: 0.55, darkWidth: 3.0, lightWidth: 1.4 },
      modern:  { dark: 0x000000, light: 0xFFFFFF, darkAlpha: 0.40, lightAlpha: 0.55, darkWidth: 2.6, lightWidth: 1.2 },
      dark:    { dark: 0x000000, light: 0xFFFFFF, darkAlpha: 0.50, lightAlpha: 0.65, darkWidth: 2.8, lightWidth: 1.2 },
      arcade:  { dark: 0x000000, light: 0x07F2E6, darkAlpha: 0.55, lightAlpha: 0.85, darkWidth: 3.0, lightWidth: 1.5 },
    }
    const s = edgeStyle[this.theme]
    const path = buildPiecePath(def.edges, def.srcW, def.srcH)

    const g = new Graphics()
    g.label = 'edge'
    g.eventMode = 'none'
    g.x = -def.srcW / 2
    g.y = -def.srcH / 2

    // Dark halo first (underneath)
    this.applyPathToGraphics(path, g)
    g.stroke({ color: s.dark, width: s.darkWidth, alpha: s.darkAlpha })
    // Light line on top
    this.applyPathToGraphics(path, g)
    g.stroke({ color: s.light, width: s.lightWidth, alpha: s.lightAlpha })

    return g
  }

  setOutlines(enabled: boolean) {
    this.outlines = enabled
    this.edgeGraphics.forEach(g => { g.visible = enabled })
  }

  private addPlacedBorder(sprite: PieceSprite, def: PieceDefinition) {
    const g = new Graphics()
    g.label = 'placed-border'
    g.eventMode = 'none'
    g.x = -def.srcW / 2
    g.y = -def.srcH / 2

    this.applyPathToGraphics(buildPiecePath(def.edges, def.srcW, def.srcH), g)

    const placedStyle: Record<Theme, { color: number; width: number; alpha: number }> = {
      cartoon: { color: 0x2B2B2B, width: 2,   alpha: 0.30 },
      modern:  { color: 0x111827, width: 1,   alpha: 0.12 },
      dark:    { color: 0xEAEEF7, width: 1.5, alpha: 0.20 },
      arcade:  { color: 0x07F2E6, width: 2,   alpha: 0.55 },
    }
    const ps = placedStyle[this.theme]
    g.stroke({ color: ps.color, width: ps.width, alpha: ps.alpha })

    sprite.addChild(g)
  }

  // ─── Update loop ─────────────────────────────────────────────────────────

  private update() {
    // nothing per-frame needed yet; PixiJS renders on demand
  }

  // ─── Resize ──────────────────────────────────────────────────────────────

  resize(width: number, height: number) {
    if (!this.appInitialized) return
    this.app.renderer.resize(width, height)
    this.app.stage.hitArea = this.app.screen
  }

  destroy() {
    this.destroyed = true
    this.cancelLongPress()
    cancelAnimationFrame(this.rafId)
    if (this.appInitialized) {
      this.app.destroy(false, { children: true, texture: true })
    }
  }
}
