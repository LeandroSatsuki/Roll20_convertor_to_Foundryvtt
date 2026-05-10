import { describe, expect, it } from 'vitest'
import { loadClerigoLevel5Foundry } from './clerigoLevel5FoundryFixture'

describe('clerigo-level5Descriptions', () => {
  it('keeps clerigo-level5 exportable while enriching item descriptions', async () => {
    const { actor, audit } = await loadClerigoLevel5Foundry()
    const descriptions = actor.items.map((item) => String(((item.system as any).description as any)?.value ?? '').trim())

    expect(descriptions.every(Boolean)).toBe(true)
    expect(
      audit.summary.describedItemCount
      + audit.summary.descriptionFallbackCount
      + audit.summary.bonfireDescriptionSummaryOnlyCount
      + audit.summary.bonfireDescriptionNeedsReviewCount,
    ).toBeLessThanOrEqual(audit.summary.itemCount)
    expect(
      audit.summary.describedItemCount
      + audit.summary.descriptionFallbackCount
      + audit.summary.bonfireDescriptionSummaryOnlyCount
      + audit.summary.bonfireDescriptionNeedsReviewCount
      + audit.summary.missingDescriptionCount,
    ).toBe(audit.summary.itemCount)
    expect(audit.summary.errorCount).toBe(0)
    expect(audit.summary.invalidIdentifierCount).toBe(0)
    expect(audit.importReadiness.canExport).toBe(true)
  })
})
