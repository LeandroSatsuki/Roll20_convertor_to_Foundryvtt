import { describe, expect, it } from 'vitest'
import { buildBonfireBundle } from './bonfireBundleFixture'
import { loadMegaLibraryFixture } from './foundryMegaLibraryFixture'

describe('nannaBonfireFeatureRegression', () => {
  it('keeps protected Nanna features on Bonfire rules and out of the pending biography', async () => {
    const { bundle } = await buildBonfireBundle(
      {
        overrides: [
          { sheetName: 'LOG', address: 'T5', value: 'Druida 5' },
          { sheetName: 'LOG', address: 'T7', value: 'Elfo da Lua' },
          { sheetName: 'LOG', address: 'H11', value: 'Juramento Três Luas' },
          { sheetName: 'LOG', address: 'R31', value: 'Vínculo Natural' },
          { sheetName: 'LOG', address: 'R32', value: 'Ordem Primal: Xamã' },
          { sheetName: 'LOG', address: 'R33', value: 'Surto Selvagem: Elo Primal' },
          { sheetName: 'LOG', address: 'R34', value: 'Ancestralidade Feérica' },
          { sheetName: 'LOG', address: 'R35', value: 'Sonho da Lua' },
          { sheetName: 'LOG', address: 'Z45', value: 'Nível 5' },
          { sheetName: 'LOG', address: 'Z46', value: 'Nível 9' },
          { sheetName: 'LOG', address: 'Z47', value: 'Nível 13' },
          { sheetName: 'LOG', address: 'Z48', value: 'Nível 17' },
        ],
      },
      undefined,
      { referenceLibrary: loadMegaLibraryFixture() },
    )

    const biography = String((((bundle.actor.system.details as Record<string, unknown>).biography as Record<string, unknown>).value as string | undefined) ?? '')
    const itemNames = bundle.actor.items.map((item) => item.name)

    expect(itemNames).toContain('Vínculo Natural')
    expect(itemNames).toContain('Ordem Primal: Xamã')
    expect(itemNames).toContain('Surto Selvagem: Elo Primal')
    expect(itemNames).not.toContain('Wild Companion')
    expect(itemNames).not.toContain('Primal Order')
    expect(itemNames).not.toContain('Wild Resurgence')
    expect(itemNames.some((name) => /^N[ií]vel\s+\d+$/i.test(name))).toBe(false)
    expect(bundle.audit.summary.genericItemCount).toBeLessThan(8)
    expect(bundle.audit.summary.missingDescriptionCount).toBe(0)
    expect(bundle.audit.summary.unresolvedSheetFeatureCount).toBeLessThan(3)
    expect(biography).not.toContain('Vínculo Natural')
    expect(biography).not.toContain('Nível 5')
    expect(biography).not.toContain('Nível 9')
    expect(biography).not.toContain('Nível 13')
    expect(biography).not.toContain('Nível 17')
  })
})
