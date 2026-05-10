import { describe, expect, it } from 'vitest'
import { selectBonfireSectionCandidate } from './bonfireAmbiguousSectionTestHelpers'

describe('parentContextPreventsWrongPromotion', () => {
  it('does not promote a same-name section from the wrong parent context', () => {
    const rule = {
      name: 'Fúria',
      kind: 'classFeature',
      parentName: 'Bárbaro',
      className: 'Bárbaro',
    }

    const candidates = [
      {
        heading: 'Fúria',
        headingLevel: 'h3',
        parentHeading: 'Guerreiro',
        nearestArticleTitle: 'Guerreiro',
        pageTitle: 'Guerreiro',
        pageH1: 'Guerreiro',
        sourceUrl: 'https://example.invalid/guerreiro',
        sourceFile: 'data/Classes/guerreiro.html',
        descriptionSource: 'section-body',
        descriptionHtml: '<p>Você recebe um bônus genérico.</p>',
        text: 'Você recebe um bônus genérico.',
        textPreview: 'Você recebe um bônus genérico.',
        textLength: 31,
        immediateBody: true,
      },
      {
        heading: 'Fúria',
        headingLevel: 'h3',
        parentHeading: 'Paladino',
        nearestArticleTitle: 'Paladino',
        pageTitle: 'Paladino',
        pageH1: 'Paladino',
        sourceUrl: 'https://example.invalid/paladino',
        sourceFile: 'data/Classes/paladino.html',
        descriptionSource: 'section-body',
        descriptionHtml: '<p>Você recebe uma reação especial.</p>',
        text: 'Você recebe uma reação especial.',
        textPreview: 'Você recebe uma reação especial.',
        textLength: 34,
        immediateBody: true,
      },
    ]

    const result = selectBonfireSectionCandidate(rule, candidates)
    expect(result.selectedCandidate).toBeNull()
  })
})
