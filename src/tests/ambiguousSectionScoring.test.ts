import { describe, expect, it } from 'vitest'
import { scoreBonfireSectionCandidate, selectBonfireSectionCandidate } from './bonfireAmbiguousSectionTestHelpers'

describe('ambiguousSectionScoring', () => {
  it('chooses the correct section when heading and parent context match strongly', () => {
    const rule = {
      name: 'Fúria',
      kind: 'classFeature',
      parentName: 'Bárbaro',
      className: 'Bárbaro',
      sourceUrl: 'https://example.invalid/barbaro',
      sourceFile: 'data/Classes/barbaro.html',
    }
    const candidates = [
      {
        heading: 'Fúria',
        headingLevel: 'h3',
        parentHeading: 'Bárbaro',
        nearestArticleTitle: 'Bárbaro',
        pageTitle: 'Bárbaro',
        pageH1: 'Bárbaro',
        sourceUrl: 'https://example.invalid/barbaro',
        sourceFile: 'data/Classes/barbaro.html',
        descriptionSource: 'section-body',
        descriptionHtml: '<p>Você entra em Fúria e ganha Vantagem em testes de Força.</p>',
        text: 'Você entra em Fúria e ganha Vantagem em testes de Força.',
        textPreview: 'Você entra em Fúria e ganha Vantagem em testes de Força.',
        textLength: 58,
        immediateBody: true,
      },
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
        descriptionHtml: '<p>Texto curto.</p>',
        text: 'Texto curto.',
        textPreview: 'Texto curto.',
        textLength: 12,
        immediateBody: true,
      },
    ]

    const scoredPrimary = scoreBonfireSectionCandidate(rule, candidates[0])
    const scoredSecondary = scoreBonfireSectionCandidate(rule, candidates[1])
    const { selectedCandidate, scoredCandidates } = selectBonfireSectionCandidate(rule, candidates)
    expect(scoredPrimary.score).toBeGreaterThan(scoredSecondary.score)
    expect(scoredCandidates[0].score).toBeGreaterThan(scoredCandidates[1].score)
    expect(selectedCandidate?.nearestArticleTitle).toBe('Bárbaro')
  })

  it('does not choose when two candidates remain too close', () => {
    const rule = {
      name: 'Escudo Arcano',
      kind: 'classFeature',
      parentName: 'Mago',
      className: 'Mago',
    }
    const candidates = [
      {
        heading: 'Escudo Arcano',
        headingLevel: 'h3',
        parentHeading: 'Mago',
        nearestArticleTitle: 'Mago',
        pageTitle: 'Mago',
        pageH1: 'Mago',
        sourceUrl: 'https://example.invalid/mago',
        sourceFile: 'data/Classes/mago.html',
        descriptionSource: 'section-body',
        descriptionHtml: '<p>Uma vez por descanso, você cria um escudo mágico.</p>',
        text: 'Uma vez por descanso, você cria um escudo mágico.',
        textPreview: 'Uma vez por descanso, você cria um escudo mágico.',
        textLength: 53,
        immediateBody: true,
      },
      {
        heading: 'Escudo Arcano',
        headingLevel: 'strong',
        parentHeading: 'Mago',
        nearestArticleTitle: 'Mago',
        pageTitle: 'Mago',
        pageH1: 'Mago',
        sourceUrl: 'https://example.invalid/mago',
        sourceFile: 'data/Classes/mago.html',
        descriptionSource: 'inline-bold-subrule',
        descriptionHtml: '<p>Uma vez por descanso, você ergue um escudo arcano.</p>',
        text: 'Uma vez por descanso, você ergue um escudo arcano.',
        textPreview: 'Uma vez por descanso, você ergue um escudo arcano.',
        textLength: 54,
        immediateBody: true,
      },
    ]

    const { selectedCandidate } = selectBonfireSectionCandidate(rule, candidates)
    expect(selectedCandidate).toBeNull()
  })
})
