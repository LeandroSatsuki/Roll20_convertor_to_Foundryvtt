import { describe, expect, it } from 'vitest'
import { buildExportAuditReport } from '../lib/export/buildExportAuditReport'
import { buildBonfireBundle } from './bonfireBundleFixture'

describe('readinessUsesBlockingErrorsOnly', () => {
  it('keeps export enabled for review-only codes and blocks only structural failures', async () => {
    const { bundle, character } = await buildBonfireBundle({}, (normalized) => {
      normalized.warnings.push({ code: 'RULE_NOT_FOUND', severity: 'warning', message: 'rule review' })
      normalized.warnings.push({ code: 'RULE_DESCRIPTION_MISSING', severity: 'warning', message: 'description review' })
      normalized.warnings.push({ code: 'BACKGROUND_PLACEHOLDER_VALUE', severity: 'warning', message: 'placeholder review', fieldPath: 'identity.background' })
    })

    const reviewAudit = bundle.audit
    expect(reviewAudit.importReadiness.canExport).toBe(true)
    expect(reviewAudit.importReadiness.status).toBe('ready-with-review')

    bundle.actor.items.push({
      _id: 'duplicate-item-001',
      name: 'Dup A',
      type: 'feat',
      img: 'icons/svg/item-bag.svg',
      system: { identifier: 'dup-id', description: { value: '<p>x</p>', chat: '' }, source: { book: 'T', rules: '2024', page: '' }, uses: { spent: null, max: '', recovery: [] }, activities: {} },
      effects: [],
      flags: {},
      folder: null,
      _stats: {},
    })
    bundle.actor.items.push({
      _id: 'duplicate-item-002',
      name: 'Dup B',
      type: 'feat',
      img: 'icons/svg/item-bag.svg',
      system: { identifier: 'dup-id', description: { value: '<p>x</p>', chat: '' }, source: { book: 'T', rules: '2024', page: '' }, uses: { spent: null, max: '', recovery: [] }, activities: {} },
      effects: [],
      flags: {},
      folder: null,
      _stats: {},
    })

    const blockedAudit = buildExportAuditReport(bundle.actor, character)
    expect(blockedAudit.importReadiness.canExport).toBe(false)
    expect(blockedAudit.importReadiness.status).toBe('blocked')
    expect(blockedAudit.summary.blockingErrorCount).toBeGreaterThan(0)
  })
})
