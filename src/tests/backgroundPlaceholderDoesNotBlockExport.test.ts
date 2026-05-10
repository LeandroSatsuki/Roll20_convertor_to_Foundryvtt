import { describe, expect, it } from 'vitest'
import { buildBonfireBundle } from './bonfireBundleFixture'

describe('backgroundPlaceholderDoesNotBlockExport', () => {
  it('treats template placeholder background values as review-only and keeps export enabled', async () => {
    const { character, bundle } = await buildBonfireBundle({
      overrides: [{ sheetName: 'LOG', address: 'H11', value: 'ANTECEDENTE' }],
    })

    expect(character.warnings.some((warning) => warning.code === 'BACKGROUND_PLACEHOLDER_VALUE')).toBe(true)
    expect(bundle.audit.importReadiness.canExport).toBe(true)
    expect(bundle.audit.importReadiness.status).toBe('ready-with-review')
    expect(bundle.audit.summary.blockingErrorCount).toBe(0)
    expect(bundle.audit.summary.reviewIssueCount).toBeGreaterThan(0)
    expect(bundle.actor.items.some((item) => item.name === 'ANTECEDENTE')).toBe(false)
    expect(String((bundle.actor.system.details as Record<string, unknown>).background ?? '')).toBe('')
    expect(String((((bundle.actor.system.details as Record<string, unknown>).biography as Record<string, unknown>).value ?? ''))).toContain('Antecedente não informado na ficha (CORRIGIR!)')
    expect(bundle.audit.auditDebug.bonfireMissingRules?.some((entry) => entry.reason === 'template-placeholder-not-filled')).toBe(true)
  })
})
