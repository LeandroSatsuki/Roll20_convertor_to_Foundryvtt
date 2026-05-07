export type ProgressionFeatureSource = 'class' | 'subclass' | 'race' | 'background' | 'feat'

export type PendingProgressionFeature = {
  source: ProgressionFeatureSource
  ruleId?: string
  displayName: string
  level?: number
  customBonfire?: boolean
}

export type PendingClassFeatureProgression = {
  className: string
  classLevel: number
  subclassName?: string
  officialFeatures: PendingProgressionFeature[]
  customBonfireFeatures: PendingProgressionFeature[]
}

export type PendingSpeciesFeatureSet = {
  speciesName: string
  features: PendingProgressionFeature[]
}

export type PendingBackgroundFeatSet = {
  backgroundName: string
  grantedFeatures: PendingProgressionFeature[]
}

export type PendingFeatResolution = {
  requestedName: string
  requestedType: 'feat' | 'classFeature' | 'subclassFeature' | 'raceFeature' | 'backgroundFeature'
  resolvedRuleId?: string
  customBonfire?: boolean
}
