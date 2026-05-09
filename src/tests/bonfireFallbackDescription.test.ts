import { describe, expect, it } from 'vitest'
import { buildBonfireBundle } from './bonfireBundleFixture'

describe('bonfireFallbackDescription', () => {
  it('uses Bonfire descriptions for custom race and background fallbacks when available', async () => {
    const { bundle } = await buildBonfireBundle({}, (character) => {
      character.identity.race.value = 'Elfo da Lua'
      character.identity.background.value = 'Estudante de Arqueomancia'
    })

    const raceItem = bundle.actor.items.find((item) => item.name === 'Elfo da Lua')
    const backgroundItem = bundle.actor.items.find((item) => item.name === 'Estudante de Arqueomancia')
    const biography = String(((bundle.actor.system.details as Record<string, unknown>).biography as Record<string, unknown>).value ?? '')

    expect(String((raceItem?.system.description as Record<string, unknown> | undefined)?.value ?? '')).toContain('Elfo da Lua')
    expect(String((backgroundItem?.system.description as Record<string, unknown> | undefined)?.value ?? '').toLowerCase()).toContain('arqueomancia')
    expect(biography).not.toContain('Elfo da Lua')
    expect(biography).not.toContain('Estudante de Arqueomancia')
  })
})
