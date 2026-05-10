import { describe, expect, it } from 'vitest'
import { buildBonfireBundle } from './bonfireBundleFixture'
import { loadMegaLibraryFixture } from './foundryMegaLibraryFixture'

describe('druida-level6FeatureQualityRegression', () => {
  it('keeps features importable while reducing unresolved and missing-description noise', async () => {
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
          { sheetName: 'LOG', address: 'AH31', value: 'Ancestralidade Feérica' },
          { sheetName: 'LOG', address: 'AH32', value: 'Sonho da Lua' },
          { sheetName: 'LOG', address: 'AH33', value: 'Bruma Serenante' },
          { sheetName: 'LOG', address: 'Z45', value: 'Nível 5' },
          { sheetName: 'LOG', address: 'Z46', value: 'Nível 9' },
        ],
      },
      undefined,
      { referenceLibrary: loadMegaLibraryFixture() },
    )

    const biography = String((((bundle.actor.system.details as Record<string, unknown>).biography as Record<string, unknown>).value as string | undefined) ?? '')
    expect(bundle.audit.summary.errorCount).toBe(0)
    expect(bundle.audit.summary.invalidIdentifierCount).toBe(0)
    expect(bundle.audit.summary.duplicateIdentifierCount).toBe(0)
    expect(bundle.audit.summary.genericItemCount).toBeLessThan(10)
    expect(bundle.audit.summary.missingDescriptionCount).toBeLessThan(6)
    expect(bundle.audit.summary.unresolvedSheetFeatureCount).toBeLessThan(3)
    expect(bundle.audit.summary.hydratedSheetFeaturesCount > 1 || bundle.audit.summary.bonfireFallbackFeatureCount > 1).toBe(true)
    expect(bundle.actor.items.some((item) => /^N[ií]vel\s+\d+$/i.test(item.name))).toBe(false)
    expect(biography).not.toMatch(/N[ií]vel\s+(5|9)/i)
  })
})
