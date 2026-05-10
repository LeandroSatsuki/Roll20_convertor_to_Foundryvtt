import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const repoRoot = path.resolve(__dirname, '..', '..')

function readJson<T>(relativePath: string): T {
  return JSON.parse(readFileSync(path.join(repoRoot, relativePath), 'utf8')) as T
}

describe('bonfireDescriptionSourceIntegrity', () => {
  it('never marks card summaries or manual-review previews as complete descriptions', () => {
    const needsReview = readJson<{ items: Array<{ name: string; descriptionStatus: string; descriptionSource?: string; reason?: string }> }>('data/bonfire/review/needs-review.json')
    const missingSourcePages = readJson<{ items: Array<{ name: string; reason: string }> }>('data/bonfire/review/missing-source-pages.json')
    const allSeeds = [
      ...readJson<Array<{ name: string; descriptionStatus?: string; descriptionSource?: string; descriptionText?: string }>>('data/bonfire/generated/race-features.seed.json'),
      ...readJson<Array<{ name: string; descriptionStatus?: string; descriptionSource?: string; descriptionText?: string }>>('data/bonfire/generated/class-features.seed.json'),
      ...readJson<Array<{ name: string; descriptionStatus?: string; descriptionSource?: string; descriptionText?: string }>>('data/bonfire/generated/feats.seed.json'),
    ]

    for (const seed of allSeeds) {
      if (seed.descriptionSource === 'card-summary' || seed.descriptionSource === 'category-preview' || seed.descriptionSource === 'manual-review') {
        expect(seed.descriptionStatus).not.toBe('complete')
      }
    }

    expect(needsReview.items.some((entry) => entry.descriptionStatus === 'needs-review' || entry.descriptionStatus === 'summary-only')).toBe(true)
    expect(missingSourcePages.items.every((entry) => entry.reason === 'category-preview-without-full-page-html' || entry.reason === 'missing-full-rule-description' || entry.reason === 'full-rule-html-not-found')).toBe(true)
  })
})
