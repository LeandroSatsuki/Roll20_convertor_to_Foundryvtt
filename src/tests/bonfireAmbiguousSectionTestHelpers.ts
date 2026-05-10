// @ts-ignore -- test-only bridge to the seed builder helper implemented as .mjs
import * as resolver from '../../scripts/bonfire/resolveAmbiguousSections.mjs'

export type SectionCandidate = {
  heading: string
  headingLevel: string
  parentHeading: string | null
  nearestArticleTitle: string
  pageTitle: string
  pageH1: string
  sourceUrl: string
  sourceFile: string
  descriptionSource: string
  descriptionHtml: string
  text: string
  textPreview: string
  textLength: number
  immediateBody: boolean
}

export const scoreBonfireSectionCandidate = resolver.scoreBonfireSectionCandidate as (
  rule: Record<string, unknown>,
  candidate: SectionCandidate,
) => SectionCandidate & { score: number; reasons: string[] }

export const selectBonfireSectionCandidate = resolver.selectBonfireSectionCandidate as (
  rule: Record<string, unknown>,
  candidates: SectionCandidate[],
) => {
  selectedCandidate: (SectionCandidate & { score: number; reasons: string[] }) | null
  scoredCandidates: Array<SectionCandidate & { score: number; reasons: string[] }>
}

export const extractSectionBodyCandidates = resolver.extractSectionBodyCandidates as (input: {
  html: string
  pageTitle: string
  pageH1: string
  sourceUrl: string
  sourceFile: string
  rule: Record<string, unknown>
}) => SectionCandidate[]
