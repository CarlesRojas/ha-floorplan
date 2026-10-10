import { callService, formatState, type TileEnv } from '#/tiles/actions.ts'
import { FillTile } from '#/tiles/cards/Fill.tsx'
import { Control } from '#/tiles/Control.tsx'
import { MEDIA } from '#/tiles/features/media.tsx'
import { numberOf, supports } from '#/tiles/features/parts.tsx'
import type { TileConfig } from '#/tiles/host.tsx'
import { Tile } from '#/tiles/Tile.tsx'

// The media player features the buttons need, as Home Assistant numbers them.
const PAUSE = 1
const PREVIOUS = 16
const NEXT = 32
const TURN_OFF = 256
const PLAY = 16384

type Props = { env: TileEnv; config: TileConfig }

// A speaker or a TV. A tap plays or pauses it, or turns it on while it is
// off. The line under the name says what is playing. A wide tile adds
// previous, play or pause, and next buttons, and a power button for one
// that is on and can be turned off. Lit while it plays. With the volume
// feature the whole tile is its volume, filled from the left, and a tap
// still plays or pauses it.
export default function Media({ env, config }: Props) {
  const entity = env.hass.states[config.entity!]
  const attributes = entity?.attributes ?? {}
  const features = typeof attributes.supported_features === 'number' ? attributes.supported_features : 0
  const playing = entity?.state === 'playing'
  const loaded = playing || entity?.state === 'paused'
  const title = [attributes.media_title, attributes.media_artist].filter(part => typeof part === 'string' && part)
  const state = loaded && title.length ? title.join(' · ') : formatState(env.hass, entity)
  const on = !!entity && !['off', 'standby', 'unavailable', 'unknown'].includes(entity.state)
  const run = (service: string) => () => callService(env.hass, `media_player.${service}`, { entity_id: config.entity })
  const onTap = loaded ? run('media_play_pause') : run('toggle')
  if (config.feature === 'volume-slider' && on && supports(entity, MEDIA.volumeSet)) {
    const { feature: _, ...plain } = config
    const muted = attributes.is_volume_muted === true
    return (
      <FillTile
        env={env}
        config={plain}
        entity={entity}
        value={Math.round((numberOf(entity, 'volume_level') ?? 0) * 100)}
        on={playing}
        accent="var(--_accent)"
        format={v => [muted ? 'Muted' : `${v}%`, ...(loaded ? title : [])].join(' · ')}
        onTap={onTap}
        onSend={v =>
          callService(env.hass, 'media_player.volume_set', { entity_id: entity.entity_id, volume_level: v / 100 })
        }
      />
    )
  }
  return (
    <Tile
      env={env}
      config={config}
      entity={entity}
      active={playing}
      toggles
      state={state}
      onTap={onTap}
      controls={
        (loaded || on) && (
          <>
            {loaded && features & PREVIOUS ? (
              <Control icon="ph:skip-back" label="Previous" onPress={run('media_previous_track')} />
            ) : null}
            {loaded && features & (playing ? PAUSE : PLAY) ? (
              <Control
                icon={playing ? 'ph:pause' : 'ph:play'}
                label={playing ? 'Pause' : 'Play'}
                onPress={run('media_play_pause')}
              />
            ) : null}
            {loaded && features & NEXT ? (
              <Control icon="ph:skip-forward" label="Next" onPress={run('media_next_track')} />
            ) : null}
            {on && features & TURN_OFF ? (
              <Control icon="ph:power-bold" label="Turn off" onPress={run('turn_off')} />
            ) : null}
          </>
        )
      }
    />
  )
}
