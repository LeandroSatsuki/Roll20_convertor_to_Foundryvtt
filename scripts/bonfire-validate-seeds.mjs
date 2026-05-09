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
const coverage = existsSync(path.join(reviewDir, 'coverage-report.json')) ? readJson(path.join(reviewDir, 'coverage-report.json')) : null
const needsReview = existsSync(path.join(reviewDir, 'needs-review.json')) ? readJson(path.join(reviewDir, 'needs-review.json')) : null
const missingRules = existsSync(path.join(reviewDir, 'missing-rules.json')) ? readJson(path.join(reviewDir, 'missing-rules.json')) : null

const errors = []
const warnings = []
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
  if (classSeed.descriptionStatus === 'complete' && !classSeed.descriptionText) warnings.push(`${canonical.name}: complete description missing descriptionText`)
  if (!classSeed.hitDie && classSeed.hitDieStatus !== 'needs-review') warnings.push(`${canonical.name}: hitDie missing without needs-review`)
  if (!classSeed.savingThrows?.length && classSeed.savingThrowsStatus !== 'needs-review') warnings.push(`${canonical.name}: savingThrows missing without needs-review`)
  if (!classSeed.spellcasting?.type) warnings.push(`${canonical.name}: spellcasting.type needs review`)
  if (classSeed.spellcasting?.type && !['none', 'custom', 'needs-review'].includes(classSeed.spellcasting.type) && !classSeed.spellcasting.ability) {
    warnings.push(`${canonical.name}: spellcasting ability needs review`)
  }
  const featureCount = classFeatures.filter((feature) => slug(feature.className) === canonical.id).length
  if (!featureCount) warnings.push(`${canonical.name}: no generated class features`)
}

if (!coverage?.classes || coverage.classes.length !== classIndex.length) errors.push('coverage-report.json does not cover every canonical class')
if (!needsReview?.items) errors.push('needs-review.json missing items array')
if (!missingRules?.missingRules) errors.push('missing-rules.json missing missingRules array')

const report = {
  generatedAt: new Date().toISOString(),
  ok: errors.length === 0,
  errors,
  warnings,
  totalClasses: classIndex.length,
  coveredClasses: coverage?.summary?.coveredClasses ?? 0,
  needsReviewCount: needsReview?.items?.length ?? 0,
  missingRulesCount: missingRules?.missingRules?.length ?? 0,
}

writeFileSync(path.join(reviewDir, 'validation-report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8')
console.log(JSON.stringify(report, null, 2))

if (errors.length) process.exit(1)

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
