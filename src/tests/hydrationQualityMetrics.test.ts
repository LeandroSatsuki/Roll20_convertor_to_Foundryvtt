import { describe, expect, it } from 'vitest'
import type { FoundryActor } from '../lib/foundry/foundryTypes'
import { buildExportAuditReport } from '../lib/export/buildExportAuditReport'
import { attachHydrationReport } from '../lib/hydration/hydrationAudit'

describe('hydrationQualityMetrics', () => {
  it('counts hydrated items with real activities, midi and plutonium on the final actor', () => {
    const actor: FoundryActor = {
      _id: 'actor000000000001',
      name: 'Hydration Metrics Test',
      type: 'character',
      img: 'icons/svg/mystery-man.svg',
      system: {
        abilities: {},
        skills: {},
        attributes: {},
        details: {},
        traits: {},
        currency: {},
        spells: {},
      },
      prototypeToken: {},
      items: [
        {
          _id: 'spell000000000001',
          name: 'Healing Word',
          type: 'spell',
          img: 'icons/svg/book.svg',
          system: {
            identifier: 'spell-healing-word',
            description: { value: '<p>Healing Word</p>' },
            activities: {
              cast: {
                _id: 'activity00000001',
                name: 'Healing Word',
                type: 'cast',
                spellcasting: { ability: 'wis' },
              },
            },
          },
          effects: [{ _id: 'effect0000000001', name: 'Healing Word Effect' }],
          flags: {
            plutonium: { page: 'spells', source: 'PHB' },
            'midi-qol': { onUseMacroName: 'Healing Word' },
            'roll20-to-foundry': {
              hydration: {
                hydrated: true,
                source: 'foundry-reference-library',
                requestedName: 'Healing Word',
                requestedType: 'spell',
                sourceActorName: 'Library Actor',
                sourceFileName: 'library.json',
                sourceItemName: 'Healing Word',
                sourceItemId: 'spell-source-001',
                matchScore: 180,
                matchConfidence: 'high',
                fallbackCategory: null,
                preservedActivities: true,
                preservedEffects: true,
                preservedMidiProperties: true,
                preservedPlutoniumFlags: true,
                sanitizedActorReferences: 0,
                warnings: [],
              },
            },
          },
          _stats: {},
          folder: null,
        },
      ],
      flags: {},
      effects: [],
      _stats: { systemId: 'dnd5e', systemVersion: '5.2.4' },
    }

    attachHydrationReport(actor, {
      requestedItemsCount: 1,
      entries: [],
      hydrationDetails: [],
      hydratedItemsCount: 1,
      hydrationFallbackCount: 0,
      hydratedSpellsCount: 1,
      hydratedClassFeaturesCount: 0,
      hydratedEquipmentCount: 0,
      hydratedItemsWithActivitiesCount: 1,
      hydratedItemsWithEffectsCount: 1,
      hydratedItemsWithMidiCount: 1,
      hydratedItemsWithPlutoniumCount: 1,
      hydrationHighCount: 1,
      hydrationMediumCount: 0,
      hydrationLowCount: 0,
      hydrationCustomFallbackCount: 0,
      hydrationLibraryMissCount: 0,
      hydrationUnsafeMatchRejectedCount: 0,
      hydrationNoCandidateCount: 0,
      sanitizedActorReferenceCount: 0,
      warnings: [],
    })

    const audit = buildExportAuditReport(actor, null)

    expect(audit.summary.hydratedItemsWithActivitiesCount).toBeGreaterThan(0)
    expect(audit.summary.hydratedItemsWithMidiCount).toBeGreaterThan(0)
    expect(audit.summary.hydratedItemsWithPlutoniumCount).toBeGreaterThan(0)
    expect(audit.summary.activitiesCount).toBe(1)
  })
})
