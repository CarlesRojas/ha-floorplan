import { callService, entityName, formatState, moreInfo, runAction, type TileEnv } from '#/tiles/actions.ts'
import { Control } from '#/tiles/Control.tsx'
import { MEDIA, VolumeSlider } from '#/tiles/features/media.tsx'
import { numberOf, supports } from '#/tiles/features/parts.tsx'
import { useTileGestures } from '#/tiles/gestures.ts'
import { useNow } from '#/tiles/history.ts'
import type { TileConfig } from '#/tiles/host.tsx'
import { Icon } from '#/tiles/Icon.tsx'
import { defaultIcon } from '#/tiles/icons.ts'
import type { CSSProperties } from 'react'

const OFF = ['off', 'standby', 'unavailable', 'unknown']

const clock = (seconds: number) => {
  const whole = Math.max(0, Math.floor(seconds))
  const minutes = Math.floor(whole / 60)
  const hours = Math.floor(minutes / 60)
  const pad = (n: number) => String(n).padStart(2, '0')
  return hours ? `${hours}:${pad(minutes % 60)}:${pad(whole % 60)}` : `${minutes}:${pad(whole % 60)}`
}

// What is playing, the whole width: the cover art, washed large and blurred
// behind the whole card, the title and the artist, how far into it it is,
// the buttons to play it and its volume. A tap on the art opens the
// player's dialog.
export default function MediaControl({ env, config }: { env: TileEnv; config: TileConfig }) {
  const entity = env.hass.states[config.entity!]
  const attributes = entity?.attributes ?? {}
  const playing = entity?.state === 'playing'
  const off = !entity || OFF.includes(entity.state)
  const picture = typeof attributes.entity_picture === 'string' ? attributes.entity_picture : null
  const title = typeof attributes.media_title === 'string' ? attributes.media_title : null
  const artist = [attributes.media_artist, attributes.media_album_name, attributes.app_name].find(
    part => typeof part === 'string' && part,
  ) as string | undefined
  const duration = numberOf(entity, 'media_duration')
  const position = numberOf(entity, 'media_position')
  const updated = typeof attributes.media_position_updated_at === 'string' ? attributes.media_position_updated_at : null
  const now = useNow(1000)
  // The position moves on from when the player last said where it was.
  const at = position === null ? null : playing && updated ? position + (now - Date.parse(updated)) / 1000 : position
  const run = (service: string) => () => callService(env.hass, `media_player.${service}`, { entity_id: config.entity })
  const has = (bit: number) => supports(entity, bit)
  const open = () => moreInfo(env.host, config.entity)
  const { pressed, handlers } = useTileGestures({
    haptics: config.haptic !== false,
    onTap: () => runAction(env, config.tap_action, open),
    onHold: () => runAction(env, config.hold_action, open),
  })
  const name = entityName(config, entity)
  return (
    <div
      className="fp-tile fp-panel fp-media-control"
      data-art={picture ? true : undefined}
      data-unavailable={entity?.state === 'unavailable' || !entity || undefined}
      style={picture ? ({ '--_art': `url("${picture}")` } as CSSProperties) : undefined}
    >
      <div className="fp-media-top">
        <div
          {...handlers}
          role="button"
          tabIndex={0}
          aria-label={name}
          data-pressed={pressed || undefined}
          className="fp-media-art"
        >
          {!picture && <Icon icon={config.icon ?? defaultIcon(config.entity)} on />}
        </div>
        <div className="fp-text">
          <div className="fp-media-title">{off ? name : (title ?? formatState(env.hass, entity))}</div>
          <div className="fp-state">{off ? formatState(env.hass, entity) : (artist ?? name)}</div>
        </div>
      </div>
      {!off && duration !== null && duration > 0 && at !== null && (
        <div className="fp-progress">
          <div
            className="fp-progress-bar"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={duration}
            aria-valuenow={Math.round(Math.min(at, duration))}
          >
            <span style={{ width: `${Math.min(at / duration, 1) * 100}%` }} />
          </div>
          <div className="fp-progress-times">
            <span>{clock(Math.min(at, duration))}</span>
            <span>-{clock(duration - Math.min(at, duration))}</span>
          </div>
        </div>
      )}
      {entity && (
        <div className="fp-media-buttons">
          {!off && has(MEDIA.shuffle) && (
            <Control
              icon="ph:shuffle"
              label="Shuffle"
              className="fp-media-small"
              role="radio"
              checked={attributes.shuffle === true}
              onPress={() =>
                callService(env.hass, 'media_player.shuffle_set', {
                  entity_id: config.entity,
                  shuffle: attributes.shuffle !== true,
                })
              }
            />
          )}
          {!off && has(MEDIA.previous) && (
            <Control icon="ph:skip-back" label="Previous" onPress={run('media_previous_track')} />
          )}
          {!off && has(playing ? MEDIA.pause : MEDIA.play) && (
            <Control
              icon={playing ? 'ph:pause' : 'ph:play'}
              label={playing ? 'Pause' : 'Play'}
              className="fp-media-main"
              onPress={run('media_play_pause')}
            />
          )}
          {!off && has(MEDIA.next) && <Control icon="ph:skip-forward" label="Next" onPress={run('media_next_track')} />}
          {!off && has(MEDIA.repeat) && (
            <Control
              icon={attributes.repeat === 'one' ? 'ph:repeat-once' : 'ph:repeat'}
              label="Repeat"
              className="fp-media-small"
              role="radio"
              checked={attributes.repeat === 'all' || attributes.repeat === 'one'}
              onPress={() =>
                callService(env.hass, 'media_player.repeat_set', {
                  entity_id: config.entity,
                  repeat: attributes.repeat === 'off' ? 'all' : attributes.repeat === 'all' ? 'one' : 'off',
                })
              }
            />
          )}
          {has(off ? MEDIA.turnOn : MEDIA.turnOff) && (
            <Control
              icon="ph:power-bold"
              label={off ? 'Turn on' : 'Turn off'}
              className="fp-media-small"
              onPress={run(off ? 'turn_on' : 'turn_off')}
            />
          )}
        </div>
      )}
      {entity && !off && has(MEDIA.volumeSet) && (
        <div className="fp-feature">
          <VolumeSlider env={env} config={config} entity={entity} />
        </div>
      )}
    </div>
  )
}
