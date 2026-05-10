import { describe, expect, it } from 'vitest'
import { defaultBonfireEntityRuleStore } from '../lib/rules/store/bonfireRuleStore'

describe('summaryCardNotCompleteDescription', () => {
  it('keeps summary/card text out of the complete Bonfire description fields', () => {
    const invalidCompleteEntities = defaultBonfireEntityRuleStore.entities.filter((entity) =>
      entity.descriptionStatus === 'complete'
      && ['card-summary', 'category-preview'].includes(entity.descriptionSource ?? 'unknown'),
    )

    expect(invalidCompleteEntities).toHaveLength(0)
  })
})
