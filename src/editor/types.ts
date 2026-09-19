export type Mode = 'rooms' | 'devices'

export type Tool = 'select' | 'draw'

export type Selection = {
  roomId: string | null
  vertex: number | null
}
