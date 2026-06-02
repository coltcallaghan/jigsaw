export type EdgeType = 'flat' | 'tab' | 'blank'

export interface PieceEdges {
  top: EdgeType
  right: EdgeType
  bottom: EdgeType
  left: EdgeType
}

export interface PieceDefinition {
  id: number
  col: number
  row: number
  edges: PieceEdges
  // pixel position of this piece in the source image
  srcX: number
  srcY: number
  srcW: number
  srcH: number
  // solved position on the board (centre)
  solvedX: number
  solvedY: number
}

export interface PuzzleConfig {
  imageDataUrl: string
  imageWidth: number
  imageHeight: number
  cols: number
  rows: number
  pieceCount: number
}

export type GameScreen = 'menu' | 'setup' | 'game'

export const PIECE_COUNT_OPTIONS = [10, 50, 100, 500, 1000, 2000, 5000, 10000] as const
export type PieceCountOption = typeof PIECE_COUNT_OPTIONS[number]
