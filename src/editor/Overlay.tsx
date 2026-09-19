import styles from '#/index.css?inline'
import { useLayoutEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

function createHost() {
  const host = document.createElement('div')
  host.style.position = 'fixed'
  host.style.inset = '0'
  host.style.zIndex = '10000'
  const shadow = host.attachShadow({ mode: 'open' })
  const style = document.createElement('style')
  style.textContent = styles
  shadow.appendChild(style)
  const mount = document.createElement('div')
  mount.style.height = '100%'
  shadow.appendChild(mount)
  return { host, mount }
}

// Renders children into a host appended to document.body, outside the HA
// dialog, so no ancestor transform or overflow can confine a fullscreen view.
// The host gets its own shadow root with the card styles.
export default function Overlay({ children }: { children: ReactNode }) {
  const [{ host, mount }] = useState(createHost)

  useLayoutEffect(() => {
    document.body.appendChild(host)
    return () => host.remove()
  }, [host])

  return createPortal(children, mount)
}
