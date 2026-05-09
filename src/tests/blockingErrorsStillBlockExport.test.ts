import { describe, expect, it } from 'vitest'
import { buildExportAuditReport } from '../lib/export/buildExportAuditReport'
import { buildBonfireBundle } from './bonfireBundleFixture'

describe('structural export blockers', () => {
  it('blocks export when an item identifier is invalid', async () => {
    const { bundle } = await buildBonfireBundle()
    bundle.actor.items[0].system.identifier = 'identificador invalido'

    const audit = buildExportAuditReport(bundle.actor, bundle.normalized)

    expect(audit.importReadiness.canExport).toBe(false)
    expect(audit.importReadiness.status).toBe('blocked')
    expect(audit.validations.map((validation) => validation.code)).toContain('FOUNDRY_ITEM_IDENTIFIER_INVALID')
  })

  it('blocks export when the Actor contains undefined', async () => {
    const { bundle } = await buildBonfireBundle()
    ;(bundle.actor.system as Record<string, unknown>).bad = undefined

    const audit = buildExportAuditReport(bundle.actor, bundle.normalized)

    expect(audit.importReadiness.canExport).toBe(false)
    expect(audit.importReadiness.status).toBe('blocked')
    expect(audit.validations.map((validation) => validation.code)).toContain('FOUNDRY_ACTOR_UNDEFINED')
  })

  it('blocks export when an activity shape is invalid', async () => {
    const { bundle } = await buildBonfireBundle()
    bundle.actor.items[0].system.activities = { broken: { _id: 'broken', type: 'not-a-real-activity' } }

    const audit = buildExportAuditReport(bundle.actor, bundle.normalized)

    expect(audit.importReadiness.canExport).toBe(false)
    expect(audit.importReadiness.status).toBe('blocked')
    expect(audit.validations.map((validation) => validation.code)).toContain('FOUNDRY_ACTIVITY_TYPE_INVALID')
  })
})
