import { beforeEach, describe, expect, it, vi } from 'vitest'

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
      return zustand.rpcAntwort
    },
    auth: {
      async getUser() {
        merke('getUser', [])
        return zustand.userAntwort
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

import {
  DatenFehler,
  anzeigenameAendern,
  eigenesKontoLoeschen,
  fehlversuchZaehlen,
  fehlversucheLoeschen,
  profilLesen,
  sperreLesen,
} from './konto.data'

const z = fake.zustand
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
  z.userAntwort = { data: { user: { id: 'user-1' } }, error: null }
  z.clientFehler = null
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

describe('sperreLesen', () => {
  it('maps a locked row to gesperrt with a Date', async () => {
    setze({ rpcAntwort: { data: [{ gesperrt: true, gesperrt_bis: '2026-01-01T10:15:00Z' }], error: null } })

    await expect(sperreLesen('a@example.com')).resolves.toEqual({
      gesperrt: true,
      gesperrtBis: new Date('2026-01-01T10:15:00Z'),
    })
    expect(aufrufe('rpc')[0].args).toEqual(['login_sperre_pruefen', { p_email: 'a@example.com' }])
  })

  it('maps an unlocked row', async () => {
    setze({ rpcAntwort: { data: [{ gesperrt: false, gesperrt_bis: null }], error: null } })

    await expect(sperreLesen('a@example.com')).resolves.toEqual({ gesperrt: false, gesperrtBis: null })
  })

  it.each([
    ['a database error', { data: null, error: dbFehler }],
    ['an error next to a not-locked row', { data: [{ gesperrt: false, gesperrt_bis: null }], error: dbFehler }],
    ['an empty array', { data: [], error: null }],
    ['null data', { data: null, error: null }],
    ['a row without a boolean', { data: [{ gesperrt: null, gesperrt_bis: null }], error: null }],
    ['an unreadable timestamp', { data: [{ gesperrt: true, gesperrt_bis: 'kein Datum' }], error: null }],
  ])('fails closed on %s', async (_name, rpcAntwort) => {
    setze({ rpcAntwort })

    await expect(sperreLesen('a@example.com')).rejects.toBeInstanceOf(DatenFehler)
  })

  it('fails closed when the client cannot be created', async () => {
    z.clientFehler = new TypeError('fetch failed')

    await expect(sperreLesen('a@example.com')).rejects.toBeInstanceOf(DatenFehler)
  })
})

describe('fehlversuchZaehlen', () => {
  it.each(['passwort', 'totp'] as const)('passes e-mail and kind %s', async (art) => {
    await expect(fehlversuchZaehlen('a@example.com', art)).resolves.toBeUndefined()

    expect(aufrufe('rpc')).toEqual([
      { methode: 'rpc', args: ['login_fehlversuch_zaehlen', { p_email: 'a@example.com', p_art: art }] },
    ])
  })

  it('throws DatenFehler on error', async () => {
    setze({ rpcAntwort: { data: null, error: dbFehler } })

    await expect(fehlversuchZaehlen('a@example.com', 'passwort')).rejects.toBeInstanceOf(DatenFehler)
  })
})

describe.each([
  ['fehlversucheLoeschen', fehlversucheLoeschen, 'login_fehlversuche_loeschen'],
  ['eigenesKontoLoeschen', eigenesKontoLoeschen, 'delete_own_account'],
] as const)('%s', (_name, funktion, rpcName) => {
  it('calls the rpc without arguments', async () => {
    await expect(funktion()).resolves.toBeUndefined()

    expect(aufrufe('rpc')).toEqual([{ methode: 'rpc', args: [rpcName] }])
  })

  it('throws DatenFehler with the original error as cause', async () => {
    setze({ rpcAntwort: { data: null, error: dbFehler } })

    const fehler = await funktion().catch((e: unknown) => e)
    expect(fehler).toBeInstanceOf(DatenFehler)
    expect((fehler as DatenFehler).cause).toBe(dbFehler)
  })
})
