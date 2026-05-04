import { describe, expect, it } from 'vitest'
import { buildExportAuditReport } from '../lib/export/buildExportAuditReport'
import { mapNormalizedToFoundryActor } from '../lib/foundry/mapNormalizedToFoundryActor'
import { validateFoundryActorDeep } from '../lib/foundry/validateFoundryActor'
import { parseRoll20Character } from '../lib/parser/parseRoll20Character'
import { sampleHeyzelText } from '../lib/samples/sampleExpectedHeyzel'

function validActor() {
  return mapNormalizedToFoundryActor(parseRoll20Character(sampleHeyzelText, { fileName: 'sample.pdf' }))
}

describe('validateFoundryActorDeep', () => {
  it('passes a valid actor', () => {
    const report = buildExportAuditReport(validActor())
    expect(report.importReadiness.canExport).toBe(true)
    expect(report.summary.errorCount).toBe(0)
  })

  it('fails actor without system', () => {
    const actor = validActor() as any
    delete actor.system
    expect(validateFoundryActorDeep(actor).some((result) => result.code === 'FOUNDRY_ACTOR_SYSTEM_MISSING')).toBe(true)
  })

  it('fails actor with undefined', () => {
    const actor = validActor() as any
    actor.system.bad = undefined
    expect(validateFoundryActorDeep(actor).some((result) => result.code === 'FOUNDRY_ACTOR_UNDEFINED')).toBe(true)
  })

  it('fails actor with invalid identifier', () => {
    const actor = validActor() as any
    actor.items[0].system.identifier = 'Retomar Fôlego'
    expect(validateFoundryActorDeep(actor).some((result) => result.code === 'FOUNDRY_ITEM_IDENTIFIER_INVALID')).toBe(true)
  })

  it('fails actor with duplicate identifiers', () => {
    const actor = validActor() as any
    actor.items[1].system.identifier = actor.items[0].system.identifier
    expect(validateFoundryActorDeep(actor).some((result) => result.code === 'FOUNDRY_ITEM_IDENTIFIER_DUPLICATE')).toBe(true)
  })

  it('fails actor with item without type', () => {
    const actor = validActor() as any
    delete actor.items[0].type
    expect(validateFoundryActorDeep(actor).some((result) => result.code === 'FOUNDRY_ITEM_TYPE_MISSING')).toBe(true)
  })
})
