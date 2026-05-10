import { describe, expect, it } from 'vitest'
import { buildRuleDescriptionMeta } from '../lib/foundry/items/ruleDescription'
import { defaultBonfireEntityRuleStore } from '../lib/rules/store/bonfireRuleStore'

describe('manualReviewNeverReachesActorAsRule', () => {
  it('never uses a manual-review seed as the final rule text in the actor item description', () => {
    const manualReviewEntity = defaultBonfireEntityRuleStore.entities.find((entity) => entity.descriptionSource === 'manual-review')
    expect(manualReviewEntity).toBeTruthy()

    const meta = buildRuleDescriptionMeta({
      itemName: manualReviewEntity!.name,
      itemKind: manualReviewEntity!.kind,
      ruleId: manualReviewEntity!.id,
      sourceUrl: manualReviewEntity!.sourceUrl,
    })

    expect(meta.status).not.toBe('complete')
    expect(meta.html).toContain('Descricao Bonfire nao encontrada, CORRIGIR!')
    if (manualReviewEntity?.descriptionText) {
      expect(meta.html).not.toContain(manualReviewEntity.descriptionText)
    }
    if (manualReviewEntity?.shortDescription) {
      expect(meta.html).not.toContain(manualReviewEntity.shortDescription)
    }
  })
})
