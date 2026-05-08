import { describe, expect, it } from 'vitest'
import { buildBonfireBundle } from './bonfireBundleFixture'
import { loadMegaLibraryFixture } from './foundryMegaLibraryFixture'

describe('nannaFeatureAliasHydration', () => {
  it('hydrates only the safe official aliases from the Foundry library while leaving protected Bonfire features local', async () => {
    const { bundle } = await buildBonfireBundle(
      {
        overrides: [
          { sheetName: 'LOG', address: 'T5', value: 'Druida 5' },
          { sheetName: 'LOG', address: 'T7', value: 'Elfo da Lua' },
          { sheetName: 'LOG', address: 'H11', value: 'Estudante de Arqueomancia' },
          { sheetName: 'LOG', address: 'R31', value: 'Conjuracao' },
          { sheetName: 'LOG', address: 'R32', value: 'Ordem Primal: Xamã' },
          { sheetName: 'LOG', address: 'R33', value: 'Surto Selvagem: Elo Primal' },
          { sheetName: 'LOG', address: 'Z31', value: 'Líder Inspirador' },
        ],
      },
      undefined,
      { referenceLibrary: loadMegaLibraryFixture() },
    )

    const names = bundle.actor.items.map((item) => item.name)
    expect(names).toContain('Spellcasting')
    expect(names).toContain('Inspiring Leader')
    expect(names).toContain('Ordem Primal: Xamã')
    expect(names).toContain('Surto Selvagem: Elo Primal')
    expect(names).not.toContain('Primal Order')
    expect(names).not.toContain('Wild Resurgence')
  })
})
