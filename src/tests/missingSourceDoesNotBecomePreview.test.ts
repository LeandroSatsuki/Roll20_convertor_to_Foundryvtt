import { describe, expect, it } from 'vitest'
import { buildRuleDescriptionMeta } from '../lib/foundry/items/ruleDescription'
import { defaultBonfireEntityRuleStore } from '../lib/rules/store/bonfireRuleStore'

describe('missingSourceDoesNotBecomePreview', () => {
  it('keeps unresolved Bonfire rules as placeholders instead of promoting previews', () => {
    const unresolved = defaultBonfireEntityRuleStore.entities.find((entity) =>
      entity.descriptionStatus !== 'complete'
      && entity.kind !== 'spellOverride'
      && ['category-preview', 'manual-review', 'section-body', 'unknown'].includes(entity.descriptionSource ?? 'unknown'),
    )

    expect(unresolved).toBeTruthy()
    const meta = buildRuleDescriptionMeta({
      itemName: unresolved!.name,
      itemKind: unresolved!.kind,
      ruleId: unresolved!.id,
      sourceUrl: unresolved!.sourceUrl,
    })

    expect(meta.status).not.toBe('complete')
    expect(meta.html).toContain('Descricao Bonfire nao encontrada, CORRIGIR!')
    if (unresolved?.shortDescription) expect(meta.html).not.toContain(unresolved.shortDescription)
  })
})
