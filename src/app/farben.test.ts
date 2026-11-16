// @vitest-environment node
// Design system: text at least 4.5:1 in both modes (PROJ-2 AC-31). Text on a gradient has to
// reach it on every point of the gradient, so both ends are checked (BUG-3).
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const css = readFileSync(fileURLToPath(new URL('./globals.css', import.meta.url)), 'utf8')
const DUNKEL_START = css.indexOf('/* Dark values')
const MODI = {
  hell: css.slice(css.indexOf(':root {'), DUNKEL_START),
  dunkel: css.slice(DUNKEL_START),
}

/** Value of `--name: H S% L%;` in a block, as RGB 0..1. */
function farbe(block: string, name: string): [number, number, number] {
  const treffer = new RegExp(`--${name}:\\s*([\\d.]+)\\s+([\\d.]+)%\\s+([\\d.]+)%`).exec(block)
  if (!treffer) throw new Error(`--${name} not found`)
  const [h, s, l] = [Number(treffer[1]), Number(treffer[2]) / 100, Number(treffer[3]) / 100]
  const k = (n: number) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const kanal = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))
  return [kanal(0), kanal(8), kanal(4)]
}

function leuchtdichte([r, g, b]: [number, number, number]): number {
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

function kontrast(a: [number, number, number], b: [number, number, number]): number {
  const [hell, dunkel] = [leuchtdichte(a), leuchtdichte(b)].sort((x, y) => y - x)
  return (hell + 0.05) / (dunkel + 0.05)
}

describe.each(Object.entries(MODI))('title bar text, %s mode', (_, block) => {
  it.each(['titlebar-from', 'titlebar-to'])('reaches 4.5:1 on --%s', (hintergrund) => {
    const text = farbe(block, 'primary-foreground')
    expect(kontrast(text, farbe(block, hintergrund))).toBeGreaterThanOrEqual(4.5)
  })
})
