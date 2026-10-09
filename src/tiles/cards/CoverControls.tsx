import { Control } from '#/tiles/Tile.tsx'

type Props = { invert: boolean; onOpen: () => void; onStop: () => void; onClose: () => void }

// The up, stop and down buttons of a wide cover tile, on their own so they
// can be redrawn without touching the rest of the tile. The arrows stay
// where they are and only swap what they do: up always on the left, down
// always on the right. Inverted, for a cover that opens downward like a
// projector screen, up closes and down opens. None is ever disabled, since
// a cover driven by radio may not be where its state says.
export default function CoverControls({ invert, onOpen, onStop, onClose }: Props) {
  return (
    <>
      <Control icon="ph:caret-up" label={invert ? 'Close' : 'Open'} onPress={invert ? onClose : onOpen} />
      <Control icon="ph:stop" label="Stop" onPress={onStop} />
      <Control icon="ph:caret-down" label={invert ? 'Open' : 'Close'} onPress={invert ? onOpen : onClose} />
    </>
  )
}
