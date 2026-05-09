import { describe, expect, it } from 'vitest'
import { getBonfireRuleEntity } from '../lib/rules/store/bonfireRuleStore'

describe('summaryCardNotCompleteDescription', () => {
  it('keeps summary/card text out of the complete Bonfire description fields', () => {
    const entity = getBonfireRuleEntity('folken-mente-genial')

    expect(entity).toBeTruthy()
    expect(entity?.descriptionStatus).toBe('summary-only')
    expect(entity?.descriptionSource).toBe('card-summary')
    expect(entity?.shortDescription).toContain('Os Folken Limalumes demonstram raciocínio vivo')
    expect(entity?.descriptionText ?? '').not.toContain('Os Folken Limalumes demonstram raciocínio vivo')
    expect(entity?.needsReviewReasons).toContain('missing-full-rule-page')
  })
})
