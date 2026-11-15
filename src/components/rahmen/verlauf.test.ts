import { afterEach, describe, expect, it } from 'vitest'
import { aktuelleMarke, markeAnlegen } from './verlauf'

afterEach(() => {
  window.history.replaceState(null, '', '/')
})

describe('Verlaufsmarken', () => {
  it('knows no marker on an ordinary entry, whatever its state holds', () => {
    for (const zustand of [null, 'text', 7, { wohnwerkMarke: 'fremd' }, { andere: 'schublade' }]) {
      window.history.replaceState(zustand, '', '/wohnungen')
      expect(aktuelleMarke()).toBeNull()
    }
  })

  it('adds one entry with the same address and the marker', () => {
    window.history.replaceState({ fremd: 1 }, '', '/wohnungen?x=1')
    const vorher = window.history.length

    markeAnlegen('ungespeichert')

    expect(window.history.length).toBe(vorher + 1)
    expect(window.location.pathname + window.location.search).toBe('/wohnungen?x=1')
    expect(aktuelleMarke()).toBe('ungespeichert')

    markeAnlegen('schublade')
    expect(aktuelleMarke()).toBe('schublade')
  })
})
