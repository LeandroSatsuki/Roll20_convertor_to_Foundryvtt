import { describe, expect, it } from 'vitest'
import { buildBonfireBundle } from './bonfireBundleFixture'
import { loadMegaLibraryFixture } from './foundryMegaLibraryFixture'

describe('archetypeMagoLevel8ReadyWithReview', () => {
  it('exports a generic mage archetype with placeholder background as ready-with-review', async () => {
    const library = loadMegaLibraryFixture()
    const { bundle } = await buildBonfireBundle(
      {
        includeMagias: true,
        overrides: [
          { sheetName: 'LOG', address: 'T5', value: 'Mago 8' },
          { sheetName: 'LOG', address: 'H11', value: 'ANTECEDENTE' },
          { sheetName: 'LOG', address: 'R31', value: 'Raça' },
          { sheetName: 'LOG', address: 'Z31', value: 'Classe' },
          { sheetName: 'LOG', address: 'AH31', value: 'Recurso Arcano Inexistente' },
        ],
      },
      undefined,
      { referenceLibrary: library },
    )

    expect(bundle.audit.importReadiness.canExport).toBe(true)
    expect(bundle.audit.importReadiness.status).toBe('ready-with-review')
    expect(bundle.audit.summary.blockingErrorCount).toBe(0)
    expect(bundle.actor.items.some((item) => item.name === 'Raça')).toBe(false)
    expect(bundle.actor.items.some((item) => item.name === 'Classe')).toBe(false)
    expect(bundle.actor.items.some((item) => item.name === 'ANTECEDENTE')).toBe(false)
    expect(bundle.actor.items.some((item) => item.name.includes('Recurso Arcano Inexistente (Não Encontrado, CORRIGIR!)'))).toBe(true)

    expect(bundle.actor.items.some((item) => item.type === 'spell')).toBe(true)
    expect(bundle.actor.items.some((item) => item.name === 'Shield')).toBe(true)
  })
})
