import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

type Antwort = { data: unknown; error: unknown }

// Hand-written fake of the per-request Supabase client. It records every call so the tests
// can assert which table, filters and rpc arguments the module used.
const fake = vi.hoisted(() => {
  const zustand = {
    aufrufe: [] as { methode: string; args: unknown[] }[],
    selectAntwort: { data: null, error: null } as { data: unknown; error: unknown },
    updateAntwort: { data: [{ id: 'user-1' }], error: null } as { data: unknown; error: unknown },
    rpcAntwort: { data: null, error: null } as { data: unknown; error: unknown },
    /** Answers in call order; when empty, `rpcAntwort` answers. */
    rpcFolge: [] as { data: unknown; error: unknown }[],
    claimsAntwort: { data: null, error: null } as { data: unknown; error: unknown },
    userAntwort: { data: { user: { id: 'user-1' } }, error: null } as { data: unknown; error: unknown },
    clientFehler: null as unknown,
  }

  const merke = (methode: string, args: unknown[]) => zustand.aufrufe.push({ methode, args })

  const client = {
    from(...args: unknown[]) {
      merke('from', args)
      return {
        select(...selectArgs: unknown[]) {
          merke('select', selectArgs)
          return {
            eq(...eqArgs: unknown[]) {
              merke('eq', eqArgs)
              return this
            },
            async maybeSingle() {
              merke('maybeSingle', [])
              return zustand.selectAntwort
            },
          }
        },
        update(...updateArgs: unknown[]) {
          merke('update', updateArgs)
          return {
            eq(...eqArgs: unknown[]) {
              merke('eq', eqArgs)
              return {
                async select(...selectArgs: unknown[]) {
                  merke('update.select', selectArgs)
                  return zustand.updateAntwort
                },
              }
            },
          }
        },
      }
    },
    async rpc(...args: unknown[]) {
      merke('rpc', args)
      return zustand.rpcFolge.shift() ?? zustand.rpcAntwort
    },
    auth: {
      async getUser() {
        merke('getUser', [])
        return zustand.userAntwort
      },
      async getClaims() {
        merke('getClaims', [])
        return zustand.claimsAntwort
      },
    },
  }

  return { zustand, client }
})

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => {
    if (fake.zustand.clientFehler) throw fake.zustand.clientFehler
    return fake.client
  },
}))

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  DatenFehler,
  alsVersuch,
  anzeigenameAendern,
  eigenesKontoLoeschen,
  fehlversucheLoeschen,
  profilLesen,
  wiederherstellungsEmail,
} from './konto.data'

const z = fake.zustand
const SCHLUESSEL = 'k'.repeat(40)
const dbFehler = { message: 'boom', code: 'XX000' }
const aufrufe = (methode: string) => z.aufrufe.filter((a) => a.methode === methode)

function setze(teil: Partial<Record<'selectAntwort' | 'updateAntwort' | 'rpcAntwort' | 'userAntwort', Antwort>>) {
  Object.assign(z, teil)
}

beforeEach(() => {
  z.aufrufe = []
  z.selectAntwort = { data: null, error: null }
  z.updateAntwort = { data: [{ id: 'user-1' }], error: null }
  z.rpcAntwort = { data: null, error: null }
  z.rpcFolge = []
  z.claimsAntwort = { data: null, error: null }
  z.userAntwort = { data: { user: { id: 'user-1' } }, error: null }
  z.clientFehler = null
  vi.stubEnv('LOGIN_SPERRE_SCHLUESSEL', SCHLUESSEL)
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('profilLesen', () => {
  it('maps the visible row to a Profil', async () => {
    setze({
      selectAntwort: {
        data: { id: 'user-1', display_name: 'Michael', created_at: '2026-11-14T08:00:00+00:00' },
        error: null,
      },
    })

    await expect(profilLesen()).resolves.toEqual({
      id: 'user-1',
      anzeigename: 'Michael',
      angelegtAm: '2026-11-14T08:00:00+00:00',
    })
    expect(aufrufe('from')[0].args).toEqual(['profiles'])
    expect(aufrufe('select')[0].args).toEqual(['id, display_name, created_at'])
  })

  it('keeps a missing display name as null', async () => {
    setze({
      selectAntwort: {
        data: { id: 'user-1', display_name: null, created_at: '2026-11-14T08:00:00+00:00' },
        error: null,
      },
    })

    expect((await profilLesen())?.anzeigename).toBeNull()
  })

  it('returns null when no row is visible', async () => {
    await expect(profilLesen()).resolves.toBeNull()
  })

  it('relies on RLS only: no id filter and no user lookup', async () => {
    await profilLesen()

    expect(aufrufe('eq')).toHaveLength(0)
    expect(aufrufe('getUser')).toHaveLength(0)
    expect(aufrufe('maybeSingle')).toHaveLength(1)
  })

  it('throws DatenFehler with the original error as cause', async () => {
    setze({ selectAntwort: { data: null, error: dbFehler } })

    const fehler = await profilLesen().catch((e: unknown) => e)
    expect(fehler).toBeInstanceOf(DatenFehler)
    expect((fehler as DatenFehler).cause).toBe(dbFehler)
  })

  it('wraps a thrown transport error in DatenFehler', async () => {
    const transport = new TypeError('fetch failed')
    z.clientFehler = transport

    const fehler = await profilLesen().catch((e: unknown) => e)
    expect(fehler).toBeInstanceOf(DatenFehler)
    expect((fehler as DatenFehler).cause).toBe(transport)
  })
})

describe('anzeigenameAendern', () => {
  it('updates the row of the server-verified user with the new value', async () => {
    await expect(anzeigenameAendern('Michael')).resolves.toBeUndefined()

    expect(aufrufe('getUser')).toHaveLength(1)
    expect(aufrufe('from')[0].args).toEqual(['profiles'])
    expect(aufrufe('update')[0].args).toEqual([{ display_name: 'Michael' }])
    expect(aufrufe('eq')).toEqual([{ methode: 'eq', args: ['id', 'user-1'] }])
    expect(aufrufe('update.select')[0].args).toEqual(['id'])
  })

  it('clears the display name with null', async () => {
    await anzeigenameAendern(null)

    expect(aufrufe('update')[0].args).toEqual([{ display_name: null }])
  })

  it('throws without touching the table when there is no user', async () => {
    setze({ userAntwort: { data: { user: null }, error: null } })

    await expect(anzeigenameAendern('Michael')).rejects.toBeInstanceOf(DatenFehler)
    expect(aufrufe('update')).toHaveLength(0)
  })

  it('throws without touching the table when the user lookup fails', async () => {
    setze({ userAntwort: { data: { user: null }, error: dbFehler } })

    await expect(anzeigenameAendern('Michael')).rejects.toBeInstanceOf(DatenFehler)
    expect(aufrufe('update')).toHaveLength(0)
  })

  it('throws when no row was updated', async () => {
    setze({ updateAntwort: { data: [], error: null } })

    await expect(anzeigenameAendern('Michael')).rejects.toBeInstanceOf(DatenFehler)
  })

  it('throws when the update returns no data', async () => {
    setze({ updateAntwort: { data: null, error: null } })

    await expect(anzeigenameAendern('Michael')).rejects.toBeInstanceOf(DatenFehler)
  })

  it('throws DatenFehler on a database error', async () => {
    setze({ updateAntwort: { data: null, error: dbFehler } })

    const fehler = await anzeigenameAendern('Michael').catch((e: unknown) => e)
    expect(fehler).toBeInstanceOf(DatenFehler)
    expect((fehler as DatenFehler).cause).toBe(dbFehler)
  })
})

describe('alsVersuch (AC-22, BUG-6, BUG-10)', () => {
  const frei = { data: [{ gesperrt: false, gesperrt_bis: null, versuch_id: 41 }], error: null }
  const gesperrt = {
    data: [{ gesperrt: true, gesperrt_bis: '2026-01-01T10:15:00Z', versuch_id: null }],
    error: null,
  }
  const zuruecknehmen = {
    methode: 'rpc',
    args: ['login_versuch_zuruecknehmen', { p_schluessel: SCHLUESSEL, p_versuch_id: 41 }],
  }

  it('reserves the attempt with the server key before the check', async () => {
    z.rpcFolge = [frei]
    let rpcVorPruefung = -1
    await alsVersuch('a@example.com', 'passwort', async () => {
      rpcVorPruefung = aufrufe('rpc').length
      return { falsch: true, wert: 'x' }
    })

    expect(aufrufe('rpc')[0].args).toEqual([
      'login_versuch_beginnen',
      { p_schluessel: SCHLUESSEL, p_email: 'a@example.com', p_art: 'passwort' },
    ])
    expect(rpcVorPruefung).toBe(1)
  })

  it('keeps the attempt counted when the credentials were wrong', async () => {
    z.rpcFolge = [frei]

    await expect(
      alsVersuch('a@example.com', 'totp', async () => ({ falsch: true, wert: 'falsch' })),
    ).resolves.toEqual({ gesperrt: false, wert: 'falsch' })
    expect(aufrufe('rpc')).toHaveLength(1)
  })

  it('gives the attempt back when the credentials were right', async () => {
    z.rpcFolge = [frei]

    await expect(
      alsVersuch('a@example.com', 'passwort', async () => ({ falsch: false, wert: 'ok' })),
    ).resolves.toEqual({ gesperrt: false, wert: 'ok' })
    expect(aufrufe('rpc')[1]).toEqual(zuruecknehmen)
  })

  it('gives the attempt back and rethrows when the check throws', async () => {
    z.rpcFolge = [frei]
    const ausfall = new TypeError('fetch failed')

    await expect(
      alsVersuch('a@example.com', 'passwort', async () => {
        throw ausfall
      }),
    ).rejects.toBe(ausfall)
    expect(aufrufe('rpc')[1]).toEqual(zuruecknehmen)
  })

  it('does not fail when giving the attempt back fails', async () => {
    z.rpcFolge = [frei, { data: null, error: dbFehler }]

    await expect(
      alsVersuch('a@example.com', 'passwort', async () => ({ falsch: false, wert: 'ok' })),
    ).resolves.toEqual({ gesperrt: false, wert: 'ok' })
  })

  it('never runs the check for a locked address', async () => {
    z.rpcFolge = [gesperrt]
    const pruefen = vi.fn(async () => ({ falsch: false, wert: 'ok' }))

    await expect(alsVersuch('a@example.com', 'passwort', pruefen)).resolves.toEqual({
      gesperrt: true,
      gesperrtBis: new Date('2026-01-01T10:15:00Z'),
    })
    expect(pruefen).not.toHaveBeenCalled()
    expect(aufrufe('rpc')).toHaveLength(1)
  })

  it.each([
    ['a database error', { data: null, error: dbFehler }],
    ['an error next to a free row', { ...frei, error: dbFehler }],
    ['an empty array', { data: [], error: null }],
    ['null data', { data: null, error: null }],
    ['a row without a boolean', { data: [{ gesperrt: null, gesperrt_bis: null, versuch_id: 1 }], error: null }],
    ['a free row without an id', { data: [{ gesperrt: false, gesperrt_bis: null, versuch_id: null }], error: null }],
    ['an unreadable timestamp', { data: [{ gesperrt: true, gesperrt_bis: 'kein Datum', versuch_id: null }], error: null }],
  ])('fails closed on %s without running the check', async (_name, antwort) => {
    z.rpcFolge = [antwort]
    const pruefen = vi.fn(async () => ({ falsch: false, wert: 'ok' }))

    await expect(alsVersuch('a@example.com', 'passwort', pruefen)).rejects.toBeInstanceOf(DatenFehler)
    expect(pruefen).not.toHaveBeenCalled()
  })

  it('fails closed without the server key and never calls the database', async () => {
    vi.stubEnv('LOGIN_SPERRE_SCHLUESSEL', '')
    const pruefen = vi.fn(async () => ({ falsch: false, wert: 'ok' }))

    await expect(alsVersuch('a@example.com', 'passwort', pruefen)).rejects.toBeInstanceOf(DatenFehler)
    expect(aufrufe('rpc')).toHaveLength(0)
    expect(pruefen).not.toHaveBeenCalled()
  })
})

describe('wiederherstellungsEmail (BUG-1)', () => {
  const jetztSek = () => Math.floor(Date.now() / 1000)
  const claims = (amr: unknown, email: unknown = 'a@example.com') => ({
    data: { claims: { amr, email } },
    error: null,
  })

  it('returns the e-mail of a session from a recovery link opened moments ago', async () => {
    z.claimsAntwort = claims([{ method: 'recovery', timestamp: jetztSek() - 60 }])

    await expect(wiederherstellungsEmail()).resolves.toBe('a@example.com')
    expect(aufrufe('getClaims')).toHaveLength(1)
  })

  it.each([
    ['a password session', () => claims([{ method: 'password', timestamp: jetztSek() - 60 }])],
    [
      'a password + 2FA session',
      () =>
        claims([
          { method: 'password', timestamp: jetztSek() },
          { method: 'totp', timestamp: jetztSek() },
        ]),
    ],
    ['an old recovery link', () => claims([{ method: 'recovery', timestamp: jetztSek() - 16 * 60 }])],
    ['claims without e-mail', () => claims([{ method: 'recovery', timestamp: jetztSek() }], null)],
    ['no claims', () => ({ data: null, error: null })],
    ['a claims error', () => ({ data: null, error: dbFehler })],
  ])('returns null for %s', async (_name, antwort) => {
    z.claimsAntwort = antwort()

    await expect(wiederherstellungsEmail()).resolves.toBeNull()
  })
})

describe('fehlversucheLoeschen', () => {
  it('calls the rpc without arguments', async () => {
    await expect(fehlversucheLoeschen()).resolves.toBeUndefined()

    expect(aufrufe('rpc')).toEqual([{ methode: 'rpc', args: ['login_fehlversuche_loeschen'] }])
  })

  it('throws DatenFehler with the original error as cause', async () => {
    setze({ rpcAntwort: { data: null, error: dbFehler } })

    const fehler = await fehlversucheLoeschen().catch((e: unknown) => e)
    expect(fehler).toBeInstanceOf(DatenFehler)
    expect((fehler as DatenFehler).cause).toBe(dbFehler)
  })
})

describe('eigenesKontoLoeschen (BUG-3)', () => {
  const frischeSitzung = () => fake.client as unknown as SupabaseClient

  it('calls the rpc through the fresh session it is given', async () => {
    await expect(eigenesKontoLoeschen(frischeSitzung())).resolves.toBeUndefined()

    expect(aufrufe('rpc')).toEqual([{ methode: 'rpc', args: ['delete_own_account'] }])
  })

  it('throws DatenFehler with the original error as cause', async () => {
    setze({ rpcAntwort: { data: null, error: dbFehler } })

    const fehler = await eigenesKontoLoeschen(frischeSitzung()).catch((e: unknown) => e)
    expect(fehler).toBeInstanceOf(DatenFehler)
    expect((fehler as DatenFehler).cause).toBe(dbFehler)
  })
})
