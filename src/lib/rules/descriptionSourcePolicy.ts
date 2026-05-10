export const allowedCompleteDescriptionSources = [
  'article-body',
  'section-body',
  'inline-bold-subrule',
  'table-rule-body',
] as const

export type AllowedCompleteDescriptionSource = (typeof allowedCompleteDescriptionSources)[number]

export function isAllowedCompleteDescriptionSource(source: string | undefined | null): source is AllowedCompleteDescriptionSource {
  return allowedCompleteDescriptionSources.includes(source as AllowedCompleteDescriptionSource)
}

