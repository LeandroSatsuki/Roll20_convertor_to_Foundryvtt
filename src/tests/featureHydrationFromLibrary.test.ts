import { describe, expect, it } from 'vitest'
import { buildBonfireBundle } from './bonfireBundleFixture'
import { loadMegaLibraryFixture } from './foundryMegaLibraryFixture'

describe('featureHydrationFromLibrary', () => {
  it('hydrates an official sheet feature from the Foundry library and preserves automation metadata', async () => {
    const library = loadMegaLibraryFixture()
    const { bundle } = await buildBonfireBundle(
      {
        overrides: [{ sheetName: 'LOG', address: 'R31', value: 'Tough' }],
      },
      undefined,
      { referenceLibrary: library },
    )

    const hydrationDetail = bundle.audit.auditDebug.hydrationReport && typeof bundle.audit.auditDebug.hydrationReport === 'object'
      ? ((bundle.audit.auditDebug.hydrationReport as { hydrationDetails?: Array<Record<string, unknown>> }).hydrationDetails ?? []).find((entry) => entry.requestedName === 'Tough' || entry.requestedName === 'Robusto')
      : undefined
    const tough = bundle.actor.items.find((item) => item.type === 'feat' && (item.name === 'Tough' || item.name === 'Robusto' || item.name === String(hydrationDetail?.finalItemName ?? '')))
    const flags = tough?.flags['roll20-to-foundry'] as Record<string, any> | undefined

    expect(hydrationDetail).toBeTruthy()
    expect(tough).toBeTruthy()
    expect(flags?.hydration?.hydrated).toBe(true)
    expect(flags?.featureSource?.fromSheetRange).toBe(true)
    expect(flags?.featureSource?.hydratedFromLibrary).toBe(true)
    expect(flags?.hydration?.preservedActivities).toBe(true)
    expect(flags?.hydration?.preservedEffects).toBe(true)
    expect((tough?.effects ?? []).length).toBeGreaterThan(0)
    expect(tough?.system?.description).toBeTruthy()
  })
})
