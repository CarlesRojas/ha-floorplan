import { callService, formatState } from '#/tiles/actions.ts'
import {
  domainOf,
  listOf,
  MenuPill,
  numberOf,
  optionWord,
  press,
  SlimSlider,
  SwitchPill,
  type FeatureProps,
} from '#/tiles/features/parts.tsx'
import { kelvinToRgb } from '#/signals.ts'
import type { EntityState } from '#/types.ts'
import type { CSSProperties } from 'react'

// The features of a light, and the switch any on and off entity can have.

const COLOR_MODES = ['hs', 'xy', 'rgb', 'rgbw', 'rgbww']

const colorModes = (entity: EntityState) => listOf(entity, 'supported_color_modes')
export const dims = (entity: EntityState) => colorModes(entity).some(mode => mode !== 'onoff')
export const warms = (entity: EntityState) => colorModes(entity).includes('color_temp')
export const colors = (entity: EntityState) => colorModes(entity).some(mode => COLOR_MODES.includes(mode))

const rgb = (kelvin: number) => `rgb(${kelvinToRgb(kelvin).map(c => Math.round(c * 255))})`

// How warm or cool its white is, along a slim bar beside the icon that
// runs from candle light to daylight.
export function ColorTemp({ env, entity, onPreview }: FeatureProps) {
  const min = numberOf(entity, 'min_color_temp_kelvin') ?? 2000
  const max = numberOf(entity, 'max_color_temp_kelvin') ?? 6500
  const kelvin = numberOf(entity, 'color_temp_kelvin') ?? Math.round((min + max) / 2)
  const stops = [0, 0.25, 0.5, 0.75, 1].map(t => `${rgb(min + (max - min) * t)} ${t * 100}%`)
  const format = (v: number) => `${Math.round(v / 50) * 50} K`
  return (
    <SlimSlider
      label="Color temperature"
      value={kelvin}
      min={min}
      max={max}
      step={50}
      track={`linear-gradient(90deg, ${stops.join(', ')})`}
      format={format}
      onMove={v => onPreview?.(v === null ? null : { state: format(v), color: rgb(v) })}
      onChange={v => callService(env.hass, 'light.turn_on', { entity_id: entity.entity_id, color_temp_kelvin: v })}
    />
  )
}

const HUES = [0, 60, 120, 180, 240, 300, 360].map(h => `hsl(${h} 100% 55%) ${(h / 360) * 100}%`).join(', ')

// The hue it shines in, along a slim rainbow beside the icon.
export function Hue({ env, entity, onPreview }: FeatureProps) {
  const hs = entity.attributes.hs_color
  const hue = Array.isArray(hs) ? Math.round(hs[0]) : 0
  const saturation = Array.isArray(hs) && hs[1] > 20 ? hs[1] : 100
  const format = (v: number) => `${v}°`
  return (
    <SlimSlider
      label="Color"
      value={hue}
      min={0}
      max={360}
      track={`linear-gradient(90deg, ${HUES})`}
      format={format}
      onMove={v =>
        onPreview?.(v === null ? null : { state: format(v), color: `hsl(${v} 100% ${100 - saturation / 2}%)` })
      }
      onChange={v => callService(env.hass, 'light.turn_on', { entity_id: entity.entity_id, hs_color: [v, saturation] })}
    />
  )
}

type Swatch = { label: string; color: string; data: Record<string, unknown> }

// A few colors a press away: warm, neutral and cool white for a light that
// has whites, and a handful of hues for one that has colors.
export function ColorFavorites({ env, entity }: FeatureProps) {
  const whites: Swatch[] = warms(entity)
    ? [2700, 4000, 6000].map(k => ({ label: `${k} K`, color: rgb(k), data: { color_temp_kelvin: k } }))
    : []
  const hues: Swatch[] = colors(entity)
    ? [
        ['Red', 0],
        ['Orange', 30],
        ['Green', 130],
        ['Blue', 220],
        ['Purple', 280],
      ].map(([label, h]) => ({
        label: label as string,
        color: `hsl(${h} 100% 58%)`,
        data: { hs_color: [h, 100] },
      }))
    : []
  const swatches = [...whites, ...hues].slice(0, 7)
  return (
    <div className="fp-swatches" role="group" aria-label="Favorite colors">
      {swatches.map(swatch => (
        <button
          key={swatch.label}
          type="button"
          aria-label={swatch.label}
          title={swatch.label}
          className="fp-swatch"
          style={{ '--_swatch': swatch.color } as CSSProperties}
          {...press(() => callService(env.hass, 'light.turn_on', { entity_id: entity.entity_id, ...swatch.data }))}
        />
      ))}
    </div>
  )
}

// One of the light's effects, from a menu.
export function Effect({ env, entity }: FeatureProps) {
  const effect = typeof entity.attributes.effect === 'string' ? entity.attributes.effect : null
  return (
    <MenuPill
      icon="ph:magic-wand"
      label="Effect"
      options={listOf(entity, 'effect_list')}
      current={effect}
      word={option => optionWord(env.hass, entity, option, 'effect')}
      onPick={option => callService(env.hass, 'light.turn_on', { entity_id: entity.entity_id, effect: option })}
    />
  )
}

const ON_STATES = ['on', 'open', 'opening']

// A switch along the bottom, for anything on or off.
export function Toggle({ env, entity }: FeatureProps) {
  const domain = domainOf(entity)
  const on = ON_STATES.includes(entity.state)
  const service = domain === 'valve' ? (on ? 'close_valve' : 'open_valve') : on ? 'turn_off' : 'turn_on'
  return (
    <SwitchPill
      label={formatState(env.hass, entity)}
      checked={on}
      onToggle={() => callService(env.hass, `${domain}.${service}`, { entity_id: entity.entity_id })}
    />
  )
}
