import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { buildConversionBundle } from '../lib/pipeline/buildConversionBundle'
import { parseBonfireCharacterSheet } from '../lib/sheets/parseBonfireCharacterSheet'
import { readWorkbook } from '../lib/sheets/readWorkbook'
import { loadMegaLibraryFixture } from './foundryMegaLibraryFixture'

const nannaPath = 'C:/Users/rhdig/Downloads/Nanna Amastacia.xlsx'
const runIfNannaExists = existsSync(nannaPath) ? it : it.skip

describe('nannaHydrationQualityRegression', () => {
  runIfNannaExists('keeps Nanna importable while exposing quality metrics for hydrated and fallback items', async () => {
    const workbook = await readWorkbook(new Uint8Array(readFileSync(nannaPath)), 'Nanna Amastacia.xlsx')
    const parsed = parseBonfireCharacterSheet(workbook, { selectedTemplateId: 'bonfire-v2.1' })
    const bundle = buildConversionBundle(parsed.character, parsed.debug, { referenceLibrary: loadMegaLibraryFixture() })

    expect(bundle.audit.importReadiness.canExport).toBe(true)
    expect(bundle.audit.summary.errorCount).toBe(0)
    expect(bundle.audit.summary.invalidIdentifierCount).toBe(0)
    expect(bundle.audit.summary.duplicateIdentifierCount).toBe(0)
    expect(bundle.audit.summary.invalidActivitiesCount).toBe(0)
    expect(bundle.audit.summary.hydratedSpellsCount).toBeGreaterThanOrEqual(20)
    expect(bundle.audit.summary.hydratedItemsCount).toBeGreaterThanOrEqual(30)
    expect(bundle.audit.summary.hydrationFallbackCount).toBeLessThanOrEqual(10)
    expect(bundle.audit.summary.hydrationCustomFallbackCount).toBeGreaterThanOrEqual(2)

    const hydrationReport = bundle.audit.auditDebug.hydrationReport as { hydrationDetails?: Array<Record<string, unknown>> } | undefined
    const details = hydrationReport?.hydrationDetails ?? []
    const hasCustomFallback = (name: string) =>
      details.some(
        (entry) => normalizeName(entry.requestedName) === normalizeName(name) && entry.fallbackCategory === 'customFallback',
      )
    expect(
      hasCustomFallback('Elfo da Lua'),
    ).toBe(true)
    expect(
      hasCustomFallback('Estudante de Arqueomancia'),
    ).toBe(true)
    expect(
      details.filter((entry) => entry.fallbackCategory === 'libraryMiss').every((entry) => typeof entry.requestedName === 'string' && entry.requestedName.length > 0),
    ).toBe(true)
  })
})

function normalizeName(value: unknown): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim()
}
