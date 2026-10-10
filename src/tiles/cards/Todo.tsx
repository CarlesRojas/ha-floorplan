import { callService, haptic, type TileEnv } from '#/tiles/actions.ts'
import { insideTile } from '#/tiles/gestures.ts'
import type { TileConfig } from '#/tiles/host.tsx'
import { Icon } from '#/tiles/Icon.tsx'
import { supports } from '#/tiles/features/parts.tsx'
import { Panel } from '#/tiles/Panel.tsx'
import type { HomeAssistant } from '#/types.ts'
import { useEffect, useState } from 'react'

type Item = { uid: string; summary: string; status: 'needs_action' | 'completed'; due?: string }

// What a to-do list lets a card do, as Home Assistant numbers it.
const CREATE = 1
const DELETE = 2
const UPDATE = 4

// The items of a list, kept up to date for as long as the card shows.
function useItems(hass: HomeAssistant, entityId: string | undefined) {
  const [items, setItems] = useState<Item[] | null>(null)
  const connection = hass.connection
  useEffect(() => {
    if (!entityId || !connection) return
    let unsubscribe: (() => void) | undefined
    let live = true
    connection
      .subscribeMessage<{ items: Item[] }>(event => live && setItems(event.items), {
        type: 'todo/item/subscribe',
        entity_id: entityId,
      })
      .then(stop => (live ? (unsubscribe = stop) : stop()))
      .catch(() => live && setItems([]))
    return () => {
      live = false
      unsubscribe?.()
    }
  }, [connection, entityId])
  return items
}

// A to-do list, the whole width: a field to add to it, what is left to do
// with a round check to tick each off, and what is done under it, with a
// button to clear it all away.
export default function Todo({ env, config }: { env: TileEnv; config: TileConfig }) {
  const entity = env.hass.states[config.entity!]
  const items = useItems(env.hass, config.entity)
  const [draft, setDraft] = useState('')
  const open = (items ?? []).filter(item => item.status === 'needs_action')
  const done = (items ?? []).filter(item => item.status === 'completed')
  const language = env.hass.locale?.language ?? env.hass.language
  const target = { entity_id: config.entity }
  const tick = (item: Item) => {
    haptic('selection')
    void callService(env.hass, 'todo.update_item', {
      ...target,
      item: item.uid,
      status: item.status === 'completed' ? 'needs_action' : 'completed',
    })
  }
  const add = () => {
    const summary = draft.trim()
    if (!summary) return
    void callService(env.hass, 'todo.add_item', { ...target, item: summary })
    setDraft('')
  }
  const row = (item: Item) => (
    <li key={item.uid} className="fp-todo-item" data-done={item.status === 'completed' || undefined}>
      <button
        {...insideTile}
        type="button"
        role="checkbox"
        aria-checked={item.status === 'completed'}
        aria-label={item.summary}
        className="fp-check"
        disabled={!supports(entity, UPDATE)}
        onClick={() => tick(item)}
      >
        {item.status === 'completed' && <Icon icon="ph:check-bold" on />}
      </button>
      <div className="fp-todo-text">
        <div className="fp-todo-summary">{item.summary}</div>
        {item.due && (
          <div className="fp-todo-due">
            {new Date(item.due.length === 10 ? `${item.due}T00:00:00` : item.due).toLocaleDateString(language, {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
            })}
          </div>
        )}
      </div>
    </li>
  )
  return (
    <Panel
      env={env}
      config={config}
      entity={entity}
      state={!items ? 'Loading' : open.length === 0 ? 'All done' : `${open.length} to do`}
      accent="var(--_accent-light)"
      className="fp-todo"
    >
      {supports(entity, CREATE) && (
        <form
          className="fp-todo-add"
          onSubmit={e => {
            e.preventDefault()
            add()
          }}
        >
          <input
            {...insideTile}
            className="fp-todo-field"
            value={draft}
            placeholder="Add an item"
            aria-label="Add an item"
            enterKeyHint="done"
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => e.stopPropagation()}
          />
          <button {...insideTile} type="submit" className="fp-control" aria-label="Add" disabled={!draft.trim()}>
            <Icon icon="ph:plus-bold" on />
          </button>
        </form>
      )}
      {open.length > 0 && <ul className="fp-todo-list">{open.map(row)}</ul>}
      {done.length > 0 && (
        <>
          <div className="fp-todo-head">
            <span>Done</span>
            {supports(entity, DELETE) && (
              <button
                {...insideTile}
                type="button"
                className="fp-link"
                onClick={() => callService(env.hass, 'todo.remove_completed_items', target)}
              >
                Clear
              </button>
            )}
          </div>
          <ul className="fp-todo-list">{done.map(row)}</ul>
        </>
      )}
    </Panel>
  )
}
