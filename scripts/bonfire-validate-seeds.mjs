import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dataDir = path.join(repoRoot, 'data', 'bonfire')
const generatedDir = path.join(dataDir, 'generated')
const reviewDir = path.join(dataDir, 'review')
const classIndex = readJson(path.join(dataDir, 'class-index.json'))

const generatedFiles = [
  'classes.seed.json',
  'class-features.seed.json',
  'races.seed.json',
  'race-features.seed.json',
  'backgrounds.seed.json',
  'background-features.seed.json',
  'feats.seed.json',
  'subclasses.seed.json',
  'subclass-features.seed.json',
  'spell-overrides.seed.json',
]

const missingGeneratedFiles = generatedFiles.filter((file) => !existsSync(path.join(generatedDir, file)))
if (missingGeneratedFiles.length) {
  console.error(`Missing generated seed files: ${missingGeneratedFiles.join(', ')}`)
  process.exit(1)
}

const classes = readJson(path.join(generatedDir, 'classes.seed.json'))
const classFeatures = readJson(path.join(generatedDir, 'class-features.seed.json'))
const races = readJson(path.join(generatedDir, 'races.seed.json'))
const raceFeatures = readJson(path.join(generatedDir, 'race-features.seed.json'))
const backgrounds = readJson(path.join(generatedDir, 'backgrounds.seed.json'))
const backgroundFeatures = readJson(path.join(generatedDir, 'background-features.seed.json'))
const feats = readJson(path.join(generatedDir, 'feats.seed.json'))
const subclasses = readJson(path.join(generatedDir, 'subclasses.seed.json'))
const subclassFeatures = readJson(path.join(generatedDir, 'subclass-features.seed.json'))
const spellOverrides = readJson(path.join(generatedDir, 'spell-overrides.seed.json'))
const coverage = existsSync(path.join(reviewDir, 'coverage-report.json')) ? readJson(path.join(reviewDir, 'coverage-report.json')) : null
const needsReview = existsSync(path.join(reviewDir, 'needs-review.json')) ? readJson(path.join(reviewDir, 'needs-review.json')) : null
const missingRules = existsSync(path.join(reviewDir, 'missing-rules.json')) ? readJson(path.join(reviewDir, 'missing-rules.json')) : null
const missingSourcePages = existsSync(path.join(reviewDir, 'missing-source-pages.json')) ? readJson(path.join(reviewDir, 'missing-source-pages.json')) : null
const subrulesReview = existsSync(path.join(reviewDir, 'subrules-review.json')) ? readJson(path.join(reviewDir, 'subrules-review.json')) : null

const errors = []
const warnings = []
const allSeeds = [
  ...classes,
  ...classFeatures,
  ...races,
  ...raceFeatures,
  ...backgrounds,
  ...backgroundFeatures,
  ...feats,
  ...subclasses,
  ...subclassFeatures,
  ...spellOverrides,
]
const classByKey = new Map()
for (const classSeed of classes) {
  for (const value of [classSeed.id, classSeed.name, ...(classSeed.aliases ?? [])]) classByKey.set(slug(value), classSeed)
}

for (const canonical of classIndex) {
  const classSeed = [canonical.id, canonical.name, ...(canonical.aliases ?? [])].map(slug).map((key) => classByKey.get(key)).find(Boolean)
  if (!classSeed) {
    errors.push(`Missing class seed for ${canonical.name}`)
    continue
  }
  if (!classSeed.sourceUrl) warnings.push(`${canonical.name}: sourceUrl needs review`)
  if (!classSeed.descriptionStatus) errors.push(`${canonical.name}: missing descriptionStatus`)
  if (!classSeed.descriptionSource) warnings.push(`${canonical.name}: descriptionSource needs review`)
  if (classSeed.descriptionStatus === 'complete' && !classSeed.descriptionText) warnings.push(`BONFIRE_DESCRIPTION_FULL_TEXT_MISSING: ${canonical.name}: complete description missing descriptionText`)
  if (classSeed.descriptionStatus === 'complete' && !isAllowedCompleteDescriptionSource(classSeed.descriptionSource)) {
    errors.push(`BONFIRE_DESCRIPTION_SOURCE_NOT_ALLOWED_FOR_COMPLETE: ${canonical.name}: complete description cannot come from ${classSeed.descriptionSource}`)
  }
  if (classSeed.descriptionStatus === 'complete' && classSeed.descriptionText && classSeed.shortDescription && classSeed.descriptionText === classSeed.shortDescription) {
    warnings.push(`BONFIRE_DESCRIPTION_PREVIEW_REJECTED: ${canonical.name}: complete description matches preview text`)
  }
  if (classSeed.descriptionStatus === 'complete' && classSeed.descriptionText && !looksLikeCompleteRuleText(classSeed.descriptionText, classSeed.descriptionSource)) {
    warnings.push(`BONFIRE_DESCRIPTION_EXACT_TEXT_REQUIRED: ${canonical.name}: complete description looks too short or non-mechanical for a final rule text`)
  }
  if (!classSeed.hitDie && classSeed.hitDieStatus !== 'needs-review') warnings.push(`${canonical.name}: hitDie missing without needs-review`)
  if (!classSeed.savingThrows?.length && classSeed.savingThrowsStatus !== 'needs-review') warnings.push(`${canonical.name}: savingThrows missing without needs-review`)
  if (!classSeed.spellcasting?.type) warnings.push(`${canonical.name}: spellcasting.type needs review`)
  if (classSeed.spellcasting?.type && !['none', 'custom', 'needs-review'].includes(classSeed.spellcasting.type) && !classSeed.spellcasting.ability) {
    warnings.push(`${canonical.name}: spellcasting ability needs review`)
  }
  const featureCount = classFeatures.filter((feature) => slug(feature.className) === canonical.id).length
  if (!featureCount) warnings.push(`${canonical.name}: no generated class features`)
}

for (const seed of allSeeds) validateEntitySeed(seed, errors, warnings)

if (!coverage?.classes || coverage.classes.length !== classIndex.length) errors.push('coverage-report.json does not cover every canonical class')
if (!needsReview?.items) errors.push('needs-review.json missing items array')
if (!missingRules?.missingRules) errors.push('missing-rules.json missing missingRules array')
if (!missingSourcePages?.items) errors.push('missing-source-pages.json missing items array')
if (!subrulesReview?.items) errors.push('subrules-review.json missing items array')

const report = {
  generatedAt: new Date().toISOString(),
  ok: errors.length === 0,
  errors,
  warnings,
  totalClasses: classIndex.length,
  coveredClasses: coverage?.summary?.coveredClasses ?? 0,
  needsReviewCount: needsReview?.items?.length ?? 0,
  missingRulesCount: missingRules?.missingRules?.length ?? 0,
  missingSourcePagesCount: missingSourcePages?.items?.length ?? 0,
  subRulesCount: subrulesReview?.items?.filter((entry) => entry.reason === null)?.length ?? 0,
}

writeFileSync(path.join(reviewDir, 'validation-report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8')
console.log(JSON.stringify(report, null, 2))

if (errors.length) process.exit(1)

function validateEntitySeed(seed, errors, warnings) {
  if (!seed || typeof seed !== 'object') return
  if (seed.descriptionStatus === 'complete' && !isAllowedCompleteDescriptionSource(seed.descriptionSource)) {
    errors.push(`BONFIRE_DESCRIPTION_SOURCE_NOT_ALLOWED_FOR_COMPLETE: ${seed.name}: complete description cannot come from ${seed.descriptionSource}`)
  }
  if (seed.descriptionStatus === 'complete' && !seed.descriptionText) {
    warnings.push(`BONFIRE_DESCRIPTION_FULL_TEXT_MISSING: ${seed.name}: complete description missing descriptionText`)
  }
  if (seed.descriptionStatus === 'complete' && seed.descriptionText && seed.shortDescription && seed.descriptionText === seed.shortDescription) {
    warnings.push(`BONFIRE_DESCRIPTION_PREVIEW_REJECTED: ${seed.name}: complete description matches preview text`)
  }
  if ((seed.descriptionStatus === 'summary-only' || seed.descriptionStatus === 'needs-review') && !seed.descriptionText && !seed.shortDescription) {
    warnings.push(`BONFIRE_DESCRIPTION_SUMMARY_ONLY: ${seed.name}: unresolved seed has no preview or full text`)
  }
  if (seed.descriptionStatus === 'complete' && seed.descriptionText && !looksLikeCompleteRuleText(seed.descriptionText, seed.descriptionSource)) {
    warnings.push(`BONFIRE_DESCRIPTION_EXACT_TEXT_REQUIRED: ${seed.name}: complete description looks too short or non-mechanical for a final rule text`)
  }
}

function isAllowedCompleteDescriptionSource(source) {
  return source === 'article-body' || source === 'section-body' || source === 'inline-bold-subrule' || source === 'table-rule-body'
}

function looksLikeCompleteRuleText(text, source) {
  if (!text) return false
  if (source === 'inline-bold-subrule') return text.length >= 24
  if (text.length >= 180) return true
  return /\b(vantagem|desvantagem|teste(?:s)? de resist[eê]ncia|a[cç][aã]o|a[cç][aã]o b[oô]nus|rea[cç][aã]o|descanso longo|descanso curto|profici[eê]ncia|dano|alcance|metro|p[eé]s)\b/i.test(text)
}

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'))
}

function slug(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-')
    .toLowerCase()
}
