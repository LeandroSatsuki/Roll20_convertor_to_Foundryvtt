import { describe, expect, it } from 'vitest'
import { buildRuleDescriptionMeta } from '../lib/foundry/items/ruleDescription'
import { defaultBonfireEntityRuleStore } from '../lib/rules/store/bonfireRuleStore'

describe('previewNeverUsedAsFinalDescription', () => {
  it('never turns a preview/category summary into the final description block', () => {
    const forbiddenComplete = defaultBonfireEntityRuleStore.entities.filter((entity) =>
      entity.descriptionStatus === 'complete'
      && ['card-summary', 'category-preview', 'manual-review', 'fallback', 'generated', 'local-preview', 'unknown'].includes(entity.descriptionSource ?? 'unknown'),
    )
    const incompleteEntity = defaultBonfireEntityRuleStore.entities.find((entity) => entity.kind === 'background' && entity.descriptionStatus !== 'complete')

    expect(forbiddenComplete).toHaveLength(0)
    expect(incompleteEntity).toBeTruthy()
    const meta = buildRuleDescriptionMeta({
      itemName: incompleteEntity!.name,
      itemKind: incompleteEntity!.kind,
      ruleId: incompleteEntity!.id,
      sourceUrl: incompleteEntity!.sourceUrl,
    })

    expect(meta.status).not.toBe('complete')
    expect(meta.html).toContain('Descricao Bonfire nao encontrada, CORRIGIR!')
    expect(meta.html).not.toContain(incompleteEntity!.shortDescription ?? '')
  })
})
