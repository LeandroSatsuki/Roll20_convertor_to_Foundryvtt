import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { extractInlineSubRules } from './bonfire/extractInlineSubRules.mjs'
import { extractSectionBodyCandidates, selectBonfireSectionCandidate } from './bonfire/resolveAmbiguousSections.mjs'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dataDir = path.join(repoRoot, 'data')
const classIndexPath = path.join(dataDir, 'bonfire', 'class-index.json')
const generatedDir = path.join(dataDir, 'bonfire', 'generated')
const reviewDir = path.join(dataDir, 'bonfire', 'review')
const docsDir = path.join(repoRoot, 'docs')

const classDefaults = {
  artificer: { hitDie: 'd8', savingThrows: ['con', 'int'], spellcasting: { type: 'half', ability: 'int' } },
  barbaro: { hitDie: 'd12', savingThrows: ['str', 'con'], spellcasting: { type: 'none' } },
  bardo: { hitDie: 'd8', savingThrows: ['dex', 'cha'], spellcasting: { type: 'full', ability: 'cha' } },
  cacador: { hitDie: 'd10', savingThrows: ['str', 'dex'], spellcasting: { type: 'half', ability: 'wis' } },
  clerigo: { hitDie: 'd8', savingThrows: ['wis', 'cha'], spellcasting: { type: 'full', ability: 'wis' } },
  druida: { hitDie: 'd8', savingThrows: ['int', 'wis'], spellcasting: { type: 'full', ability: 'wis' } },
  feiticeiro: { hitDie: 'd6', savingThrows: ['con', 'cha'], spellcasting: { type: 'full', ability: 'cha' } },
  guerreiro: { hitDie: 'd10', savingThrows: ['str', 'con'], spellcasting: { type: 'none' } },
  ladino: { hitDie: 'd8', savingThrows: ['dex', 'int'], spellcasting: { type: 'none' } },
  mago: { hitDie: 'd6', savingThrows: ['int', 'wis'], spellcasting: { type: 'full', ability: 'int' } },
  mistico: { hitDie: 'd8', savingThrows: ['wis', 'cha'], spellcasting: { type: 'custom', ability: 'cha' } },
  monge: { hitDie: 'd8', savingThrows: ['str', 'dex'], spellcasting: { type: 'none' } },
  paladino: { hitDie: 'd10', savingThrows: ['wis', 'cha'], spellcasting: { type: 'half', ability: 'cha' } },
}

const categorySources = [
  { type: 'classes', generatedKind: 'class', paths: ['bonfire/raw/classes', 'HTML BONFIRE/classes'] },
  { type: 'races', generatedKind: 'race', paths: ['bonfire/raw/races', 'HTML BONFIRE/racas'] },
  { type: 'backgrounds', generatedKind: 'background', paths: ['bonfire/raw/backgrounds', 'HTML BONFIRE/antecedentes'] },
  { type: 'feats', generatedKind: 'feat', paths: ['bonfire/raw/feats', 'HTML BONFIRE/talentos'] },
  { type: 'subclasses', generatedKind: 'subclass', paths: ['bonfire/raw/subclasses'] },
  { type: 'spell-overrides', generatedKind: 'spellOverride', paths: ['bonfire/raw/spell-overrides', 'HTML BONFIRE/ajustes'] },
  { type: 'essences', generatedKind: 'essence', paths: ['HTML BONFIRE/essencia'] },
]

const headingNoise = new Set([
  'mapas',
  'linhas do tempo',
  'caracteristicas de classe',
  'características de classe',
  'caracteristicas principais',
  'características principais',
  'proficiencias',
  'proficiências',
  'equipamento inicial',
  'equipamentos',
  'multiclasse',
  'proficiencias de multiclasse',
  'proficiências de multiclasse',
  'habilidades de classe',
  'interpretando um elfo',
  'sociedade e cultura',
  'caracteristicas fisicas',
  'características físicas',
  'tracos da raca base',
  'traços da raça base',
  'divergencia ancestral',
  'divergência ancestral',
  'evolucao racial',
  'evolução racial',
  'talentos',
  'talentos de origem',
  'marcas misticas em cineria',
  'marcas místicas em cineria',
  'como as marcas funcionam no servidor',
  'sumario',
  'sumário',
  'navegacao',
  'navegação',
  'indice',
  'índice',
  'conteudo',
  'conteúdo',
  'artigos relacionados',
  'proximo',
  'próximo',
  'anterior',
  'categoria',
  'categorias',
  'tags',
  'compartilhar',
  'world anvil',
  'bonfire tales',
  'jogadores',
  'pagina inicial',
  'página inicial',
  'comentarios',
  'comentários',
  'table of contents',
  'related articles',
  'back to top',
  'navigation',
  'search',
  'find your way',
  'find your way!',
  'get the news',
  'legal',
  'partnered',
  'entry for worldember 2025',
  'linha do tempo de cineria',
].map((value) => slug(value)))

const classIndex = readJson(classIndexPath)
const canonicalByKey = new Map()
for (const entry of classIndex) {
  for (const value of [entry.id, entry.name, ...(entry.aliases ?? [])]) canonicalByKey.set(slug(value), entry)
}

ensureDir(generatedDir)
ensureDir(reviewDir)
ensureDir(docsDir)
ensureDir(path.join(dataDir, 'bonfire', 'raw'))

const htmlFiles = collectHtmlFiles(dataDir)
const sourceIndex = buildSourceIndex(htmlFiles)
const sourceFileCandidateCache = new Map()
const categoryFiles = discoverCategoryFiles()
const parseErrors = []
const missingSourcePages = []
const subrulesReview = []
const previousValidationReport = existsSync(path.join(reviewDir, 'validation-report.json')) ? readJson(path.join(reviewDir, 'validation-report.json')) : null
const previousDescriptionCoverageReport = existsSync(path.join(reviewDir, 'description-coverage-report.json')) ? readJson(path.join(reviewDir, 'description-coverage-report.json')) : null

const classes = []
const classFeatures = []
const races = []
const raceFeatures = []
const backgrounds = []
const backgroundFeatures = []
const feats = []
const subclasses = []
const subclassFeatures = []
const spellOverrides = []
const essenceFeatures = []

console.log(`[bonfire] HTMLs indexados: ${htmlFiles.length}`)

for (const file of categoryFiles.classes) {
  try {
    const parsed = parseClassFile(file)
    classes.push(parsed.classSeed)
    classFeatures.push(...parsed.features.filter((feature) => !feature.subclassName))
    subclassFeatures.push(...parsed.features.filter((feature) => feature.subclassName))
    subclasses.push(...parsed.subclasses)
  } catch (error) {
    parseErrors.push(errorEntry(file, error))
  }
}

for (const file of categoryFiles.races) {
  try {
    const parsed = parseRaceFile(file)
    races.push(parsed.raceSeed)
    raceFeatures.push(...parsed.features)
  } catch (error) {
    parseErrors.push(errorEntry(file, error))
  }
}

for (const file of categoryFiles.backgrounds) {
  try {
    const parsed = parseBackgroundFile(file)
    backgrounds.push(...parsed.backgrounds)
    backgroundFeatures.push(...parsed.features)
  } catch (error) {
    parseErrors.push(errorEntry(file, error))
  }
}

for (const file of categoryFiles.feats) {
  try {
    feats.push(...parseFeatFile(file))
  } catch (error) {
    parseErrors.push(errorEntry(file, error))
  }
}

for (const file of categoryFiles['spell-overrides']) {
  try {
    spellOverrides.push(...parseSpellOverrideFile(file))
  } catch (error) {
    parseErrors.push(errorEntry(file, error))
  }
}

for (const file of categoryFiles.essences) {
  try {
    essenceFeatures.push(...parseEssenceFile(file))
  } catch (error) {
    parseErrors.push(errorEntry(file, error))
  }
}

const deduped = {
  classes: dedupeById(classes),
  classFeatures: dedupeById(classFeatures),
  races: dedupeById(races),
  raceFeatures: dedupeById([...raceFeatures, ...essenceFeatures]),
  backgrounds: dedupeById(backgrounds),
  backgroundFeatures: dedupeById(backgroundFeatures),
  feats: dedupeById(feats),
  subclasses: dedupeById(subclasses),
  subclassFeatures: dedupeById(subclassFeatures),
  spellOverrides: dedupeById(spellOverrides),
}

const coverage = buildCoverageReport(deduped)
const needsReview = collectNeedsReview(deduped, coverage, parseErrors)
const missingRules = collectMissingRules(coverage)
const missingClassFixtures = collectMissingClassFixtures()
const descriptionCoverageReport = collectDescriptionCoverageReport(deduped, sourceIndex, {
  previousValidationReport,
  previousDescriptionCoverageReport,
})
const remainingDescriptionWarnings = collectRemainingDescriptionWarnings(deduped, descriptionCoverageReport)
const missingSourceAcquisitionPlan = collectMissingSourceAcquisitionPlan(remainingDescriptionWarnings)
const missingSourcePlanQualityReport = collectMissingSourcePlanQualityReport(missingSourceAcquisitionPlan, remainingDescriptionWarnings)

writeJson(path.join(generatedDir, 'classes.seed.json'), deduped.classes)
writeJson(path.join(generatedDir, 'class-features.seed.json'), deduped.classFeatures)
writeJson(path.join(generatedDir, 'races.seed.json'), deduped.races)
writeJson(path.join(generatedDir, 'race-features.seed.json'), deduped.raceFeatures)
writeJson(path.join(generatedDir, 'backgrounds.seed.json'), deduped.backgrounds)
writeJson(path.join(generatedDir, 'background-features.seed.json'), deduped.backgroundFeatures)
writeJson(path.join(generatedDir, 'feats.seed.json'), deduped.feats)
writeJson(path.join(generatedDir, 'subclasses.seed.json'), deduped.subclasses)
writeJson(path.join(generatedDir, 'subclass-features.seed.json'), deduped.subclassFeatures)
writeJson(path.join(generatedDir, 'spell-overrides.seed.json'), deduped.spellOverrides)

writeJson(path.join(reviewDir, 'coverage-report.json'), coverage)
writeJson(path.join(reviewDir, 'needs-review.json'), needsReview)
writeJson(path.join(reviewDir, 'missing-rules.json'), missingRules)
writeJson(path.join(reviewDir, 'description-coverage-report.json'), descriptionCoverageReport)
writeJson(path.join(reviewDir, 'remaining-description-warnings.json'), remainingDescriptionWarnings)
writeJson(path.join(reviewDir, 'missing-source-acquisition-plan.json'), missingSourceAcquisitionPlan)
writeJson(path.join(reviewDir, 'missing-source-plan-quality-report.json'), missingSourcePlanQualityReport)
writeJson(path.join(reviewDir, 'missing-source-pages.json'), {
  generatedAt: new Date().toISOString(),
  items: dedupeMissingSourcePages(missingSourcePages),
})
writeJson(path.join(reviewDir, 'subrules-review.json'), {
  generatedAt: new Date().toISOString(),
  items: dedupeSubrulesReview(subrulesReview),
})
writeJson(path.join(reviewDir, 'source-index.json'), { generatedAt: new Date().toISOString(), entries: sourceIndex })
writeText(path.join(reviewDir, 'missing-source-acquisition-plan.csv'), renderMissingSourceAcquisitionPlanCsv(missingSourcePlanQualityReport))
writeText(path.join(docsDir, 'bonfire-missing-source-acquisition-plan.md'), renderMissingSourceAcquisitionPlanMarkdown(missingSourcePlanQualityReport))
writeJson(path.join(reviewDir, 'missing-from-current-sheet.json'), {
  generatedAt: new Date().toISOString(),
  note: 'Runtime sheet-specific missing rules are appended by the UI/export flow. Seed generation does not patch by character.',
  missingRules: [],
})
writeJson(path.join(reviewDir, 'missing-class-fixtures.json'), missingClassFixtures)
writeJson(path.join(reviewDir, 'generation-summary.json'), {
  generatedAt: new Date().toISOString(),
  sourceRoots: categorySources.flatMap((source) => source.paths.map((relative) => path.join('data', relative))).filter((relative) => existsSync(path.join(repoRoot, relative))),
  htmlFilesFound: htmlFiles.length,
  htmlFilesProcessed: Object.values(categoryFiles).reduce((total, files) => total + files.length, 0),
  parseErrorCount: parseErrors.length,
  parseErrors,
  seedCounts: seedCounts(deduped),
  classCoverage: {
    total: classIndex.length,
    covered: coverage.classes.filter((entry) => entry.status === 'covered').length,
    needsReview: coverage.classes.filter((entry) => entry.status === 'needs-review').length,
    missing: coverage.classes.filter((entry) => entry.status === 'missing').length,
  },
  reviewCounts: {
    needsReview: needsReview.items.length,
    missingRules: missingRules.missingRules.length,
    missingSourcePages: dedupeMissingSourcePages(missingSourcePages).length,
    missingClassFixtures: missingClassFixtures.missingFixtures.length,
    subRules: summarizeSubrulesReview(subrulesReview).bonfireSubRulesExtractedCount,
    previewRejectedOpportunities: descriptionCoverageReport.summary.after.previewRejectedWarningCount,
  },
  subRuleCounts: summarizeSubrulesReview(subrulesReview),
  descriptionCoverage: descriptionCoverageReport.summary,
  remainingDescriptionWarnings: remainingDescriptionWarnings.summary,
})

console.log(JSON.stringify({
  htmlFilesFound: htmlFiles.length,
  htmlFilesProcessed: Object.values(categoryFiles).reduce((total, files) => total + files.length, 0),
  seedCounts: seedCounts(deduped),
  classCoverage: {
    total: classIndex.length,
    covered: coverage.classes.filter((entry) => entry.status === 'covered').length,
  },
  needsReview: needsReview.items.length,
  missingRules: missingRules.missingRules.length,
  missingSourcePages: dedupeMissingSourcePages(missingSourcePages).length,
  subRules: summarizeSubrulesReview(subrulesReview).bonfireSubRulesExtractedCount,
  descriptionCoverage: descriptionCoverageReport.summary,
  remainingDescriptionWarnings: remainingDescriptionWarnings.summary,
  parseErrors: parseErrors.length,
}, null, 2))

function parseClassFile(file) {
  const html = readFileSync(file, 'utf8')
  const article = cleanHtml(html)
  const title = cleanTitle(extractTitle(html) || titleFromFile(file))
  const canonical = canonicalClass(title) ?? canonicalClass(titleFromFile(file))
  const className = canonical?.name ?? title
  const classId = canonical?.id ?? slug(className)
  const text = htmlToText(article)
  const defaults = classDefaults[classId] ?? {}
  const hitDie = extractHitDie(text) ?? defaults.hitDie ?? null
  const savingThrows = extractSavingThrows(article) ?? defaults.savingThrows ?? []
  const spellcasting = extractSpellcasting(article, classId) ?? defaults.spellcasting ?? { type: 'needs-review' }
  const headings = extractHeadings(article)
  const firstMeaningful = meaningfulParagraph(article)
  const classSeed = entity({
    id: classId,
    name: className,
    aliases: canonical?.aliases ?? [],
    kind: 'class',
    sourceUrl: extractSourceUrl(html),
    descriptionHtml: extractDescriptionHtml(article, 2400),
    description: firstMeaningful,
    descriptionSource: 'article-body',
    sourceFile: file,
    tags: ['class', classId],
    foundry: { preferredType: 'class' },
    extra: {
      hitDie: hitDie ?? undefined,
      hitDieStatus: hitDie ? 'complete' : 'needs-review',
      savingThrows,
      savingThrowsStatus: savingThrows.length ? 'complete' : 'needs-review',
      spellcasting,
      progression: buildClassProgression(headings),
    },
  })

  const parsedFeatures = []
  const parsedSubclasses = []
  let currentLevel = null
  let currentSubclass = null
  for (const heading of headings) {
    const headingText = cleanFeatureName(heading.text)
    if (isNoiseHeading(headingText)) continue
    const levelMatch = headingText.match(/^(?:n[ií]vel|level)\s+(\d+)\s*[:\-–—]\s*(.+)$/i)
    const level = levelMatch ? Number(levelMatch[1]) : currentLevel
    const name = levelMatch ? cleanFeatureName(levelMatch[2]) : headingText
    if (levelMatch) currentLevel = level
    if (!name || isNoiseHeading(name) || /^n[ií]vel\s+\d+$/i.test(name)) continue

    if (heading.level <= 2 && looksLikeSubclassName(name)) {
      currentSubclass = name
      const subclassDescriptionHtml = sectionHtml(article, heading, headings)
      const subclassSeed = entity({
        id: `${classId}-${slug(name)}`,
        name,
        aliases: [],
        kind: 'subclass',
        sourceUrl: extractSourceUrl(html),
        descriptionHtml: subclassDescriptionHtml,
        description: htmlToRuleText(subclassDescriptionHtml),
        descriptionSource: 'section-body',
        sourceFile: file,
        tags: ['subclass', classId],
        extra: { className },
        foundry: { preferredType: 'subclass' },
      })
      parsedSubclasses.push(subclassSeed)
      parsedFeatures.push(
        ...captureInlineSubRules({
          htmlNode: subclassDescriptionHtml,
          parentRule: {
            id: subclassSeed.id,
            name,
            className,
            subclassName: name,
            parentDisplayName: name,
          },
          parentKind: 'subclass',
          sourceUrl: extractSourceUrl(html),
          sourceFile: file,
          extraTags: ['subrule'],
        }),
      )
      continue
    }

    if (!level && heading.level > 4) continue
    if (heading.level > 4 && !/surto|manifestacao|manifestação|segredo|op[cç][aã]o|ordem|forma|dom[ií]nio|circulo|círculo/i.test(name)) continue

    const descriptionHtml = sectionHtml(article, heading, headings)
    const featureName = currentSubclass && heading.level >= 3 && level ? name : name
    const featureKind = currentSubclass && heading.level >= 3 ? 'subclassFeature' : featureKindFromName(featureName)
    const featureSeed = entity({
      id: `${classId}-${slug(featureName)}${level ? `-l${level}` : ''}${currentSubclass ? `-${slug(currentSubclass)}` : ''}`,
      name: featureName,
      aliases: level ? [`Nível ${level}: ${featureName}`, `Nivel ${level}: ${featureName}`] : [],
      kind: featureKind,
      sourceUrl: extractSourceUrl(html),
      descriptionHtml,
      description: htmlToRuleText(descriptionHtml),
      descriptionSource: 'section-body',
      sourceFile: file,
      tags: ['feature', classId, currentSubclass ? 'subclassFeature' : 'classFeature'],
      foundry: { preferredType: 'feat' },
      extra: {
        className,
        subclassName: currentSubclass ?? undefined,
        level: level ?? undefined,
      },
    })
    parsedFeatures.push(featureSeed)
    parsedFeatures.push(
      ...captureInlineSubRules({
        htmlNode: descriptionHtml,
        parentRule: {
          id: featureSeed.id,
          name: featureName,
          className,
          subclassName: currentSubclass ?? undefined,
          parentDisplayName: featureName,
        },
        parentKind: featureKind,
        sourceUrl: extractSourceUrl(html),
        sourceFile: file,
        extraTags: ['subrule'],
      }),
    )
  }

  return { classSeed, features: parsedFeatures, subclasses: parsedSubclasses }
}

function parseRaceFile(file) {
  const html = readFileSync(file, 'utf8')
  const article = cleanHtml(html)
  const title = cleanTitle(extractTitle(html) || titleFromFile(file))
  const raceName = normalizeRaceTitle(title)
  const sourceUrl = extractSourceUrl(html)
  const headings = extractHeadings(article)
  const raceSeed = entity({
    id: slug(raceName),
    name: raceName,
    aliases: raceName === title ? [] : [title],
    kind: 'race',
    sourceUrl,
    descriptionHtml: extractDescriptionHtml(article, 1800),
    description: meaningfulParagraph(article),
    descriptionSource: 'article-body',
    sourceFile: file,
    tags: ['race'],
    foundry: { preferredType: 'feat' },
    extra: {
      speed: extractSpeed(htmlToText(article)) ?? null,
      speedStatus: extractSpeed(htmlToText(article)) ? 'complete' : 'needs-review',
    },
  })
  const features = []
  for (const heading of headings.filter((entry) => [3, 4, 5].includes(entry.level))) {
    const name = cleanFeatureName(heading.text)
    if (!name || isNoiseHeading(name) || looksLikeOnlyLevel(name)) continue
    const descriptionHtml = sectionHtml(article, heading, headings)
    const featureSeed = entity({
      id: `${slug(raceName)}-${slug(name)}`,
      name,
      aliases: [],
      kind: 'raceFeature',
      sourceUrl,
      descriptionHtml,
      description: htmlToRuleText(descriptionHtml),
      descriptionSource: 'section-body',
      sourceFile: file,
      tags: ['raceFeature', slug(raceName)],
      foundry: { preferredType: 'feat' },
      extra: { raceName },
    })
    features.push(featureSeed)
    features.push(
      ...captureInlineSubRules({
        htmlNode: descriptionHtml,
        parentRule: {
          id: featureSeed.id,
          name,
          raceName,
          parentDisplayName: name,
        },
        parentKind: 'raceFeature',
        sourceUrl,
        sourceFile: file,
        extraTags: ['subrule'],
      }),
    )
  }
  features.push(
    ...captureInlineSubRules({
      htmlNode: article,
      parentRule: {
        id: raceSeed.id,
        name: raceName,
        raceName,
        parentDisplayName: raceName,
      },
      parentKind: 'race',
      sourceUrl,
      sourceFile: file,
      extraTags: ['subrule'],
    }),
  )
  return { raceSeed, features }
}

function parseBackgroundFile(file) {
  const html = readFileSync(file, 'utf8')
  const sourceUrl = extractSourceUrl(html)
  const rows = [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)]
  const backgrounds = []
  const features = []
  for (const row of rows) {
    const cells = [...row[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((match) => match[1])
    if (cells.length < 2) continue
    const name = cleanFeatureName(htmlToText(cells[0]))
    if (!name || isNoiseHeading(name) || name.toLowerCase() === 'nome') continue
    const featureName = cleanFeatureName(htmlToText(cells[1])) || `Habilidade de ${name}`
    const descriptionHtml = cells[2] ?? cells[1]
    backgrounds.push(
      entity({
        id: slug(name),
        name,
        aliases: [],
        kind: 'background',
        sourceUrl,
        descriptionHtml,
        description: htmlToRuleText(descriptionHtml),
        descriptionSource: 'table-rule-body',
        sourceFile: file,
        tags: ['background'],
        foundry: { preferredType: 'background' },
      }),
    )
    features.push(
      entity({
        id: `${slug(name)}-${slug(featureName)}`,
        name: featureName,
        aliases: [],
        kind: 'backgroundFeature',
        sourceUrl,
        descriptionHtml,
        description: htmlToRuleText(descriptionHtml),
        descriptionSource: 'table-rule-body',
        sourceFile: file,
        tags: ['backgroundFeature', slug(name)],
        foundry: { preferredType: 'feat' },
        extra: { backgroundName: name },
      }),
    )
    features.push(
      ...captureInlineSubRules({
        htmlNode: descriptionHtml,
        parentRule: {
          id: slug(name),
          name: featureName,
          backgroundName: name,
          parentDisplayName: `${name}: ${featureName}`,
        },
        parentKind: 'backgroundFeature',
        sourceUrl,
        sourceFile: file,
        extraTags: ['subrule'],
      }),
    )
  }
  return { backgrounds, features }
}

function parseFeatFile(file) {
  const html = readFileSync(file, 'utf8')
  const article = cleanHtml(html)
  const sourceUrl = extractSourceUrl(html)
  return extractHeadings(article)
    .filter((heading) => [3, 4, 5].includes(heading.level))
    .map((heading) => ({ heading, name: cleanFeatureName(heading.text) }))
    .filter(({ name }) => name && !isNoiseHeading(name) && !looksLikeOnlyLevel(name) && !/^(combate|conjura[cç][aã]o|explora[cç][aã]o|marcas|sobreviv[eê]ncia)$/i.test(name))
    .flatMap(({ heading, name }) => {
      const descriptionHtml = sectionHtml(article, heading, extractHeadings(article))
      const featSeed = entity({
        id: slug(name),
        name,
        aliases: [],
        kind: 'feat',
        sourceUrl,
        descriptionHtml,
        description: htmlToRuleText(descriptionHtml),
        descriptionSource: 'section-body',
        sourceFile: file,
        tags: ['feat'],
        foundry: { preferredType: 'feat' },
        extra: {
          prerequisite: extractPrerequisite(descriptionHtml),
          prerequisiteStatus: extractPrerequisite(descriptionHtml) ? 'complete' : 'needs-review',
        },
      })
      return [
        featSeed,
        ...captureInlineSubRules({
          htmlNode: descriptionHtml,
          parentRule: {
            id: featSeed.id,
            name,
            parentDisplayName: name,
          },
          parentKind: 'feat',
          sourceUrl,
          sourceFile: file,
          extraTags: ['subrule'],
        }),
      ]
    })
}

function parseSpellOverrideFile(file) {
  const html = readFileSync(file, 'utf8')
  const article = cleanHtml(html)
  const sourceUrl = extractSourceUrl(html)
  return extractHeadings(article)
    .filter((heading) => [3, 4, 5].includes(heading.level))
    .map((heading) => ({ heading, name: cleanFeatureName(heading.text) }))
    .filter(({ name }) => name && !isNoiseHeading(name) && !looksLikeOnlyLevel(name))
    .slice(0, 250)
    .map(({ heading, name }) => {
      const descriptionHtml = sectionHtml(article, heading, extractHeadings(article))
      return entity({
        id: `spell-override-${slug(name)}`,
        name,
        aliases: [],
        kind: 'spellOverride',
        sourceUrl,
        descriptionHtml,
        description: htmlToRuleText(descriptionHtml),
        descriptionSource: 'section-body',
        sourceFile: file,
        tags: ['spellOverride'],
        foundry: { preferredType: 'spell' },
        extra: { status: 'needs-review' },
      })
    })
}

function parseEssenceFile(file) {
  const html = readFileSync(file, 'utf8')
  const article = cleanHtml(html)
  const title = cleanTitle(extractTitle(html) || titleFromFile(file))
  const sourceUrl = extractSourceUrl(html)
  const features = extractHeadings(article)
    .filter((heading) => [3, 4, 5].includes(heading.level))
    .map((heading) => ({ heading, name: cleanFeatureName(heading.text) }))
    .filter(({ name }) => name && !isNoiseHeading(name) && !looksLikeOnlyLevel(name))
    .flatMap(({ heading, name }) => {
      const descriptionHtml = sectionHtml(article, heading, extractHeadings(article))
      const featureSeed = entity({
        id: `${slug(title)}-${slug(name)}`,
        name,
        aliases: [],
        kind: 'raceFeature',
        sourceUrl,
        descriptionHtml,
        description: htmlToRuleText(descriptionHtml),
        descriptionSource: 'section-body',
        sourceFile: file,
        tags: ['essence', slug(title)],
        foundry: { preferredType: 'feat' },
        extra: { raceName: title },
      })
      return [
        featureSeed,
        ...captureInlineSubRules({
          htmlNode: descriptionHtml,
          parentRule: {
            id: featureSeed.id,
            name,
            raceName: title,
            parentDisplayName: name,
          },
          parentKind: 'raceFeature',
          sourceUrl,
          sourceFile: file,
          extraTags: ['essence', 'subrule'],
        }),
      ]
    })
  features.push(
    ...captureInlineSubRules({
      htmlNode: article,
      parentRule: {
        id: slug(title),
        name: title,
        raceName: title,
        parentDisplayName: title,
      },
      parentKind: 'race',
      sourceUrl,
      sourceFile: file,
      extraTags: ['essence', 'subrule'],
    }),
  )
  return features
}

function entity({ id, name, aliases, kind, sourceUrl, descriptionHtml, description, shortDescription: previewText, descriptionSource = 'unknown', sourceFile, tags, foundry, extra = {} }) {
  const descriptionMeta = buildSeedDescription({
    name,
    kind,
    descriptionHtml,
    descriptionText: description || htmlToRuleText(descriptionHtml),
    shortDescription: previewText,
    descriptionSource,
    sourceUrl,
    sourceFile,
    context: extra,
  })
  return {
    id: slug(id || name),
    identifier: slug(id || name),
    name,
    aliases: Array.from(new Set((aliases ?? []).filter(Boolean))),
    kind,
    source: 'bonfire',
    sourceUrl: sourceUrl ?? null,
    descriptionHtml: descriptionMeta.descriptionHtml ?? undefined,
    descriptionText: descriptionMeta.descriptionText ?? undefined,
    description: descriptionMeta.descriptionText ?? undefined,
    shortDescription: descriptionMeta.shortDescription ?? undefined,
    descriptionStatus: descriptionMeta.descriptionStatus,
    descriptionSource: descriptionMeta.descriptionSource,
    needsReviewReasons: descriptionMeta.needsReviewReasons,
    tags: Array.from(new Set((tags ?? []).filter(Boolean))),
    foundry,
    sourceFileName: sourceFile ? path.relative(repoRoot, sourceFile) : undefined,
    ...extra,
  }
}

function captureInlineSubRules({ htmlNode, parentRule, parentKind, sourceUrl, sourceFile, extraTags = [] }) {
  const { subRules, review } = extractInlineSubRules({
    htmlNode,
    parentRule,
    parentKind,
    sourceUrl,
  })

  subrulesReview.push(
    ...review.map((entry) => ({
      ...entry,
      sourceFileName: sourceFile ? path.relative(repoRoot, sourceFile) : undefined,
    })),
  )

  return subRules.map((subRule) =>
    entity({
      id: subRule.id,
      name: subRule.name,
      aliases: subRule.aliases,
      kind: subRule.kind,
      sourceUrl: subRule.sourceUrl,
      descriptionHtml: subRule.descriptionHtml,
      description: subRule.descriptionText,
      descriptionSource: subRule.descriptionSource,
      sourceFile,
      tags: [...(subRule.tags ?? []), ...extraTags],
      foundry: { preferredType: 'feat' },
      extra: {
        parentRuleId: subRule.parentRuleId,
        parentName: subRule.parentName,
        parentDisplayName: subRule.parentDisplayName,
        raceName: subRule.raceName,
        className: subRule.className,
        subclassName: subRule.subclassName,
        backgroundName: subRule.backgroundName,
      },
    }),
  )
}

function discoverCategoryFiles() {
  const result = {}
  for (const source of categorySources) {
    result[source.type] = []
    for (const relative of source.paths) {
      const absolute = path.join(dataDir, relative.replace(/^bonfire[\\/]/, 'bonfire/'))
      if (!existsSync(absolute)) continue
      result[source.type].push(...walkHtml(absolute))
    }
  }
  return result
}

function collectHtmlFiles(root) {
  return walkHtml(root)
}

function walkHtml(root) {
  if (!existsSync(root)) return []
  const files = []
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const absolute = path.join(root, entry.name)
    if (entry.isDirectory()) {
      if (entry.name.endsWith('_files')) continue
      files.push(...walkHtml(absolute))
    } else if (/\.(html?|HTML?)$/.test(entry.name)) {
      files.push(absolute)
    }
  }
  return files
}

function extractHeadings(html) {
  const headings = []
  const regex = /<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi
  let match
  while ((match = regex.exec(html))) {
    headings.push({
      level: Number(match[1]),
      text: htmlToText(match[2]),
      start: match.index,
      end: regex.lastIndex,
    })
  }
  return headings
}

function sectionHtml(html, heading, headings) {
  if (!heading) return ''
  const next = headings.find((candidate) => candidate.start > heading.start && candidate.level <= heading.level)
  return html.slice(heading.end, next?.start ?? Math.min(html.length, heading.end + 6000))
}

function buildClassProgression(headings) {
  const levels = {}
  for (let level = 1; level <= 20; level++) levels[String(level)] = []
  for (const heading of headings) {
    const match = cleanFeatureName(heading.text).match(/^(?:n[ií]vel|level)\s+(\d+)\s*[:\-–—]\s*(.+)$/i)
    if (!match) continue
    const level = match[1]
    levels[level] ??= []
    levels[level].push(cleanFeatureName(match[2]))
  }
  return {
    status: Object.values(levels).some((entries) => entries.length) ? 'extracted-partial' : 'needs-review',
    levels,
  }
}

function buildCoverageReport(seeds) {
  const classSeedsByKey = new Map()
  for (const classSeed of seeds.classes) {
    for (const value of [classSeed.id, classSeed.name, ...(classSeed.aliases ?? [])]) classSeedsByKey.set(slug(value), classSeed)
  }
  const classes = classIndex.map((entry) => {
    const classSeed = [entry.id, entry.name, ...(entry.aliases ?? [])].map(slug).map((key) => classSeedsByKey.get(key)).find(Boolean)
    const features = seeds.classFeatures.filter((feature) => slug(feature.className) === entry.id)
    const missing = []
    if (!classSeed) missing.push('class rule')
    if (classSeed && !classSeed.hitDie) missing.push('hitDie')
    if (classSeed && !classSeed.spellcasting?.type) missing.push('spellcasting.type')
    if (classSeed && classSeed.spellcasting?.type && !['none', 'needs-review'].includes(classSeed.spellcasting.type) && !classSeed.spellcasting.ability) missing.push('spellcasting.ability')
    if (classSeed && !classSeed.savingThrows?.length) missing.push('savingThrows')
    if (classSeed && classSeed.progression?.status === 'needs-review') missing.push('progression')
    if (!features.length) missing.push('class features')
    if (classSeed && !classSeed.sourceUrl) missing.push('sourceUrl')
    if (classSeed && !classSeed.descriptionStatus) missing.push('descriptionStatus')
    return {
      classId: entry.id,
      className: entry.name,
      expectedCoverage: entry.expectedCoverage,
      status: !classSeed ? 'missing' : missing.length ? 'needs-review' : 'covered',
      missing,
      featureCount: features.length,
      sourceFileName: classSeed?.sourceFileName,
      sourceUrl: classSeed?.sourceUrl ?? null,
      descriptionStatus: classSeed?.descriptionStatus ?? 'missing',
    }
  })
  return {
    generatedAt: new Date().toISOString(),
    policy: 'coverage-by-class-not-character',
    classes,
    summary: {
      totalClasses: classes.length,
      coveredClasses: classes.filter((entry) => entry.status === 'covered').length,
      needsReviewClasses: classes.filter((entry) => entry.status === 'needs-review').length,
      missingClasses: classes.filter((entry) => entry.status === 'missing').length,
    },
  }
}

function collectNeedsReview(seeds, coverage, parseErrors) {
  const allSeeds = Object.entries(seeds).flatMap(([type, entries]) => entries.map((entry) => ({ type, entry })))
  const items = allSeeds
    .filter(({ entry }) => entry.descriptionStatus !== 'complete')
    .map(({ type, entry }) => ({
      type,
      id: entry.id,
      name: entry.name,
      kind: entry.kind,
      descriptionStatus: entry.descriptionStatus,
      reason: Array.isArray(entry.needsReviewReasons) && entry.needsReviewReasons.length ? entry.needsReviewReasons.join(', ') : 'description-needs-review',
      sourceUrl: entry.sourceUrl,
      descriptionSource: entry.descriptionSource ?? 'unknown',
    }))
  for (const classCoverage of coverage.classes.filter((entry) => entry.status !== 'covered')) {
    items.push({
      type: 'classCoverage',
      id: classCoverage.classId,
      name: classCoverage.className,
      kind: 'class',
      descriptionStatus: classCoverage.descriptionStatus,
      reason: `missing: ${classCoverage.missing.join(', ')}`,
      sourceUrl: classCoverage.sourceUrl,
    })
  }
  return { generatedAt: new Date().toISOString(), items, parseErrors }
}

function collectDescriptionCoverageReport(seeds, index, previous = {}) {
  const allSeeds = Object.entries(seeds)
    .flatMap(([group, entries]) => entries.map((entry) => ({ group, entry })))
    .filter(({ entry }) => entry?.source === 'bonfire')

  const items = allSeeds
    .filter(({ entry }) => entry.descriptionStatus !== 'complete')
    .map(({ group, entry }) => {
      const candidates = findCandidateSourceEntries(entry, index)
      return {
        name: entry.name,
        kind: entry.kind,
        parentName: entry.parentName ?? entry.className ?? entry.subclassName ?? entry.raceName ?? entry.backgroundName ?? null,
        className: entry.className ?? null,
        raceName: entry.raceName ?? null,
        subclassName: entry.subclassName ?? null,
        backgroundName: entry.backgroundName ?? null,
        sourceUrl: entry.sourceUrl ?? null,
        sourceFile: entry.sourceFileName ?? null,
        currentDescriptionSource: entry.descriptionSource ?? 'unknown',
        currentStatus: entry.descriptionStatus ?? 'missing',
        shortDescription: entry.shortDescription ?? null,
        candidateHtmlFiles: candidates.slice(0, 5).map((candidate) => candidate.relativePath),
        candidateSections: Array.from(
          new Set(
            candidates
              .flatMap((candidate) => candidate.sectionMatches)
              .filter(Boolean),
          ),
        ).slice(0, 8),
        reason: inferCoverageReason(entry),
        nextAction: candidates.length ? 'inspect-candidate-html-sections' : 'find-full-html-source',
        group,
      }
    })

  const grouped = new Map()
  for (const item of items) {
    const key = `${item.kind}::${item.parentName ?? ''}::${item.sourceUrl ?? ''}::${item.sourceFile ?? ''}::${item.currentDescriptionSource}::${item.reason}`
    const existing = grouped.get(key) ?? {
      kind: item.kind,
      parentName: item.parentName,
      sourceUrl: item.sourceUrl,
      sourceFile: item.sourceFile,
      currentDescriptionSource: item.currentDescriptionSource,
      reason: item.reason,
      count: 0,
      examples: [],
    }
    existing.count += 1
    if (existing.examples.length < 3) existing.examples.push(item.name)
    grouped.set(key, existing)
  }

  const beforeSummary = previous.previousDescriptionCoverageReport?.summary?.after
    ?? buildDescriptionCoverageSummaryFromValidation(previous.previousValidationReport)
  const afterSummary = buildDescriptionCoverageSummary(allSeeds.map(({ entry }) => entry))

  return {
    generatedAt: new Date().toISOString(),
    before: beforeSummary,
    after: afterSummary,
    items: items.sort((left, right) => left.name.localeCompare(right.name)),
    topPendingGroups: Array.from(grouped.values()).sort((left, right) => right.count - left.count).slice(0, 20),
    summary: {
      before: beforeSummary,
      after: afterSummary,
    },
  }
}

function collectRemainingDescriptionWarnings(seeds, descriptionCoverageReport) {
  const coverageItems = Array.isArray(descriptionCoverageReport?.items) ? descriptionCoverageReport.items : []
  const exactTextRequiredEntries = Object.entries(seeds)
    .flatMap(([group, entries]) => entries
      .filter((entry) => entry?.source === 'bonfire' && entry.descriptionStatus === 'complete' && shouldWarnExactTextRequired(entry))
      .map((entry) => ({
        name: entry.name,
        kind: entry.kind,
        parentName: entry.parentName ?? entry.className ?? entry.subclassName ?? entry.raceName ?? entry.backgroundName ?? null,
        sourceUrl: entry.sourceUrl ?? null,
        sourceFile: entry.sourceFileName ?? null,
        currentDescriptionSource: entry.descriptionSource ?? 'unknown',
        currentStatus: entry.descriptionStatus ?? 'complete',
        candidateHtmlFiles: entry.sourceFileName ? [entry.sourceFileName] : [],
        candidateSections: [],
        reason: 'exact-text-required',
        nextAction: 'review-manually',
        group,
        warningCode: 'BONFIRE_DESCRIPTION_EXACT_TEXT_REQUIRED',
      })))

  const allItems = [...coverageItems, ...exactTextRequiredEntries]
  const entries = []
  let autoResolvedCount = 0
  let manualReviewCount = 0
  for (let index = 0; index < allItems.length; index += 1) {
    if (index > 0 && index % 100 === 0) console.log(`[bonfire] ambiguous sections analisadas: ${index}/${allItems.length}`)
    const classified = classifyRemainingDescriptionWarning(allItems[index])
    if (!classified) continue
    if (classified.nextAction === 'auto-resolved') autoResolvedCount += 1
    if (classified.nextAction === 'review-manually') manualReviewCount += 1
    entries.push(classified)
  }
  entries.sort((left, right) => left.name.localeCompare(right.name))

  const summary = {
    totalWarnings: entries.length,
    structuralSiteNoiseCount: entries.filter((entry) => entry.classification === 'structural-site-noise').length,
    missingFullRuleSourceCount: entries.filter((entry) => entry.classification === 'missing-full-rule-source').length,
    ambiguousSectionCount: entries.filter((entry) => entry.classification === 'ambiguous-section').length,
    exactTextRequiredCount: entries.filter((entry) => entry.classification === 'exact-text-required').length,
    validPlaceholderCount: entries.filter((entry) => entry.classification === 'valid-placeholder').length,
    autoResolvedCount,
    manualReviewCount,
  }

  return {
    generatedAt: new Date().toISOString(),
    summary,
    entries,
  }
}

function collectMissingSourceAcquisitionPlan(remainingDescriptionWarnings) {
  const entries = Array.isArray(remainingDescriptionWarnings?.entries) ? remainingDescriptionWarnings.entries : []
  const fixtureContext = collectFixtureContext()
  const coverageReport = existsSync(path.join(reviewDir, 'coverage-report.json')) ? readJson(path.join(reviewDir, 'coverage-report.json')) : null
  const fixtureSourceUrls = new Set(
    (coverageReport?.classes ?? [])
      .filter((entry) => fixtureContext.fixtureClassIds.has(slug(entry.classId)) || fixtureContext.fixtureClassIds.has(slug(entry.className)))
      .map((entry) => entry.sourceUrl)
      .filter(Boolean),
  )
  const missingEntries = entries.filter((entry) => entry.classification === 'missing-full-rule-source')
  const ambiguousEntries = entries.filter((entry) => entry.classification === 'ambiguous-section')
  const exactTextRequiredEntries = parseValidationExactTextWarnings(previousValidationReport)

  const grouped = new Map()
  for (const entry of missingEntries) {
    const groupKey = buildAcquisitionGroupKey(entry)
    const existing = grouped.get(groupKey) ?? {
      priority: 'low',
      reason: 'single-rule-missing-source',
      sourceUrl: entry.sourceUrl ?? null,
      suggestedLocalPath: inferSuggestedLocalPath(entry),
      sourceFile: entry.sourceFile ?? null,
      pageKind: inferPlanPageKind(entry),
      parentName: entry.parentName ?? null,
      className: entry.className ?? null,
      raceName: entry.raceName ?? null,
      subclassName: entry.subclassName ?? null,
      backgroundName: entry.backgroundName ?? null,
      affectedRulesCount: 0,
      affectedRules: [],
    }

    existing.affectedRules.push({
      name: entry.name,
      kind: entry.kind ?? 'unknown',
      parentName: entry.parentName ?? null,
      className: entry.className ?? null,
      raceName: entry.raceName ?? null,
      subclassName: entry.subclassName ?? null,
      backgroundName: entry.backgroundName ?? null,
      reason: entry.reason ?? 'missing-full-rule-source',
    })
    existing.affectedRulesCount += 1
    grouped.set(groupKey, existing)
  }

  const byPriority = Array.from(grouped.values())
    .map((group) => {
      group.affectedRules.sort((left, right) =>
        (left.parentName ?? '').localeCompare(right.parentName ?? '')
        || left.name.localeCompare(right.name))

      const affectsFixtures = group.affectedRules.some((rule) => ruleTouchesFixtureContext(rule, fixtureContext, fixtureSourceUrls, group))
      const priority = group.affectedRulesCount >= 5 || affectsFixtures
        ? 'high'
        : group.affectedRulesCount >= 2
          ? 'medium'
          : 'low'

      const reason = affectsFixtures
        ? 'appears-in-current-fixtures-or-many-rules'
        : group.affectedRulesCount >= 5
          ? 'affects-many-rules'
          : group.affectedRulesCount >= 2
            ? 'resolves-multiple-rules'
            : 'single-rule-missing-source'

      return {
        ...group,
        priority,
        reason,
      }
    })
    .sort(compareAcquisitionPlanEntries)

  const topStillAmbiguous = ambiguousEntries
    .slice()
    .sort((left, right) =>
      (right.candidateSections?.[0]?.score ?? -Infinity) - (left.candidateSections?.[0]?.score ?? -Infinity)
      || left.name.localeCompare(right.name))
    .slice(0, 20)
    .map((entry) => ({
      name: entry.name,
      kind: entry.kind ?? 'unknown',
      parentName: entry.parentName ?? null,
      sourceUrl: entry.sourceUrl ?? null,
      sourceFile: entry.sourceFile ?? null,
      warningCode: entry.warningCode ?? 'BONFIRE_DESCRIPTION_SUMMARY_ONLY',
      reason: entry.reason ?? 'candidate-section-found-but-exactness-not-proven',
      nextAction: 'manual-review',
      topCandidateScore: entry.candidateSections?.[0]?.score ?? null,
      topCandidateHeading: entry.candidateSections?.[0]?.heading ?? null,
    }))

  const exactTextRequired = exactTextRequiredEntries
    .slice()
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((entry) => ({
      name: entry.name,
      kind: entry.kind ?? 'unknown',
      parentName: entry.parentName ?? null,
      sourceUrl: entry.sourceUrl ?? null,
      sourceFile: entry.sourceFile ?? null,
      warningCode: entry.warningCode ?? 'BONFIRE_DESCRIPTION_EXACT_TEXT_REQUIRED',
      reason: entry.reason ?? 'exact-text-required',
      nextAction: 'review-manually',
    }))

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      missingFullRuleSourceCount: missingEntries.length,
      ambiguousSectionCount: ambiguousEntries.length,
      exactTextRequiredCount: exactTextRequiredEntries.length,
      uniqueMissingUrlsCount: new Set(byPriority.map((entry) => entry.sourceUrl).filter(Boolean)).size,
      uniqueParentPagesCount: new Set(byPriority.map((entry) => entry.suggestedLocalPath).filter(Boolean)).size,
    },
    byPriority,
    topStillAmbiguous,
    exactTextRequired,
  }
}

function collectMissingSourcePlanQualityReport(plan, remainingDescriptionWarnings) {
  const entries = []

  for (const planEntry of plan.byPriority ?? []) {
    const localSources = resolvePlanLocalSources(planEntry)
    const actionableRules = []
    const noiseRules = []

    for (const rule of planEntry.affectedRules ?? []) {
      if (isPlanStructuralNoiseRuleName(rule.name)) noiseRules.push(rule)
      else actionableRules.push(rule)
    }

    if (noiseRules.length) {
      entries.push({
        name: planEntry.parentName ?? planEntry.sourceUrl ?? 'structural-noise',
        sourceUrl: planEntry.sourceUrl ?? null,
        suggestedLocalPath: planEntry.suggestedLocalPath ?? null,
        currentSourceFile: localSources[0] ?? planEntry.sourceFile ?? null,
        affectedRulesCount: noiseRules.length,
        classification: 'structural-noise-ignore',
        reason: 'affected rules are structural site chrome or category labels',
        nextAction: 'ignore',
        affectedRules: noiseRules,
      })
    }

    if (!actionableRules.length) continue

    entries.push({
      name: planEntry.parentName ?? planEntry.sourceUrl ?? actionableRules[0]?.name ?? 'missing-source',
      sourceUrl: planEntry.sourceUrl ?? null,
      suggestedLocalPath: planEntry.suggestedLocalPath ?? null,
      currentSourceFile: localSources[0] ?? planEntry.sourceFile ?? null,
      affectedRulesCount: actionableRules.length,
      classification: localSources.length ? 'source-present-needs-parser-fix' : 'source-missing-user-action-required',
      reason: localSources.length
        ? 'local HTML already exists; exact section/body extraction still needs improvement'
        : 'no reliable local HTML found for this source URL',
      nextAction: localSources.length ? 'fix-parser' : 'save-html',
      affectedRules: actionableRules,
    })
  }

  const groupedAmbiguous = groupQualityEntries(
    (Array.isArray(remainingDescriptionWarnings?.entries) ? remainingDescriptionWarnings.entries : [])
      .filter((entry) => entry.classification === 'ambiguous-section')
      .map((entry) => {
        const localSources = resolvePlanLocalSources(entry)
        return {
          name: entry.parentName ?? entry.name,
          sourceUrl: entry.sourceUrl ?? null,
          suggestedLocalPath: inferSuggestedLocalPath(entry),
          currentSourceFile: localSources[0] ?? entry.sourceFile ?? null,
          affectedRulesCount: 1,
          classification: 'ambiguous-manual-review',
          reason: entry.reason ?? 'multiple plausible sections still need manual confirmation',
          nextAction: 'manual-review',
          affectedRules: [{
            name: entry.name,
            kind: entry.kind ?? 'unknown',
            parentName: entry.parentName ?? null,
            className: entry.className ?? null,
            raceName: entry.raceName ?? null,
            subclassName: entry.subclassName ?? null,
            backgroundName: entry.backgroundName ?? null,
            reason: entry.reason ?? 'candidate-section-found-but-exactness-not-proven',
          }],
        }
      }),
  )

  const groupedExact = groupQualityEntries(
    (plan.exactTextRequired ?? []).map((entry) => {
      const localSources = resolvePlanLocalSources(entry)
      return {
        name: entry.parentName ?? entry.name,
        sourceUrl: entry.sourceUrl ?? null,
        suggestedLocalPath: inferSuggestedLocalPath(entry),
        currentSourceFile: localSources[0] ?? entry.sourceFile ?? null,
        affectedRulesCount: 1,
        classification: 'exact-text-required-manual-check',
        reason: entry.reason ?? 'source exists but exact full text still needs confirmation',
        nextAction: 'manual-review',
        affectedRules: [{
          name: entry.name,
          kind: entry.kind ?? 'unknown',
          parentName: entry.parentName ?? null,
          className: null,
          raceName: null,
          subclassName: null,
          backgroundName: null,
          reason: entry.reason ?? 'exact-text-required',
        }],
      }
    }),
  )

  const combinedEntries = [
    ...entries,
    ...groupedAmbiguous,
    ...groupedExact,
  ]
    .sort(compareQualityReportEntries)

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      totalEntries: combinedEntries.length,
      sourcePresentNeedsParserFixCount: combinedEntries.filter((entry) => entry.classification === 'source-present-needs-parser-fix').length,
      sourceMissingUserActionRequiredCount: combinedEntries.filter((entry) => entry.classification === 'source-missing-user-action-required').length,
      structuralNoiseIgnoreCount: combinedEntries.filter((entry) => entry.classification === 'structural-noise-ignore').length,
      ambiguousManualReviewCount: combinedEntries.filter((entry) => entry.classification === 'ambiguous-manual-review').length,
      exactTextRequiredManualCheckCount: combinedEntries.filter((entry) => entry.classification === 'exact-text-required-manual-check').length,
    },
    entries: combinedEntries,
  }
}

function groupQualityEntries(entries) {
  const grouped = new Map()
  for (const entry of entries) {
    const key = [
      entry.classification,
      entry.sourceUrl ?? '',
      entry.currentSourceFile ?? '',
      entry.suggestedLocalPath ?? '',
      entry.name ?? '',
    ].join('::')
    const existing = grouped.get(key) ?? { ...entry, affectedRules: [], affectedRulesCount: 0 }
    existing.affectedRules.push(...(entry.affectedRules ?? []))
    existing.affectedRulesCount = existing.affectedRules.length
    grouped.set(key, existing)
  }
  return Array.from(grouped.values())
}

function resolvePlanLocalSources(entry) {
  const candidates = new Set()
  const addIfExists = (relativePath) => {
    if (!relativePath) return
    const resolved = path.resolve(repoRoot, String(relativePath).replaceAll('/', path.sep).replaceAll('\\', path.sep))
    if (existsSync(resolved)) candidates.add(path.relative(repoRoot, resolved).replaceAll('/', '\\'))
  }

  addIfExists(entry.currentSourceFile)
  addIfExists(entry.sourceFile)
  addIfExists(entry.suggestedLocalPath)

  const sourceUrl = entry.sourceUrl ? String(entry.sourceUrl) : null
  if (sourceUrl) {
    for (const indexed of sourceIndex) {
      if (indexed.sourceUrl === sourceUrl) {
        candidates.add(path.relative(repoRoot, indexed.file).replaceAll('/', '\\'))
      }
    }
  }

  const baseName = path.basename(String(entry.currentSourceFile ?? entry.sourceFile ?? entry.suggestedLocalPath ?? ''))
  if (baseName) {
    for (const indexed of sourceIndex) {
      if (path.basename(indexed.file) === baseName) {
        candidates.add(path.relative(repoRoot, indexed.file).replaceAll('/', '\\'))
      }
    }
  }

  return Array.from(candidates)
}

function isPlanStructuralNoiseRuleName(name) {
  const key = slug(name)
  if (!key) return true
  if (isStructuralSiteNoise(name) || looksLikeProgressionArtifactName(name)) return true
  const noiseKeys = new Set([
    'development',
    'events',
    'our-shop',
    'reaching-out',
    'resources',
    'who-we-are',
    'legal',
    'find-your-way',
    'find-your-way!',
    'get-the-news',
    'bestiario',
    'mercado',
    'mestres',
    'mundo',
    'sistema',
    'regras',
    'cineria',
    'comentarios',
    'tags',
    'search',
    'navigation',
    'table-of-contents',
    'related-articles',
  ])
  return noiseKeys.has(key)
}

function compareQualityReportEntries(left, right) {
  const rank = {
    'source-missing-user-action-required': 0,
    'source-present-needs-parser-fix': 1,
    'ambiguous-manual-review': 2,
    'exact-text-required-manual-check': 3,
    'structural-noise-ignore': 4,
  }
  return (rank[left.classification] ?? 9) - (rank[right.classification] ?? 9)
    || right.affectedRulesCount - left.affectedRulesCount
    || (left.sourceUrl ?? '').localeCompare(right.sourceUrl ?? '')
    || (left.name ?? '').localeCompare(right.name ?? '')
}

function parseValidationExactTextWarnings(validationReport) {
  const warnings = Array.isArray(validationReport?.warnings) ? validationReport.warnings : []
  return warnings
    .filter((warning) => String(warning).startsWith('BONFIRE_DESCRIPTION_EXACT_TEXT_REQUIRED: '))
    .map((warning) => {
      const text = String(warning)
      const name = text
        .replace(/^BONFIRE_DESCRIPTION_EXACT_TEXT_REQUIRED:\s*/, '')
        .replace(/: complete description looks too short or non-mechanical for a final rule text$/, '')
        .trim()
      return {
        name,
        kind: 'unknown',
        parentName: null,
        sourceUrl: null,
        sourceFile: null,
        warningCode: 'BONFIRE_DESCRIPTION_EXACT_TEXT_REQUIRED',
        reason: 'exact-text-required',
      }
    })
}

function collectFixtureContext() {
  const fixtureClassIds = new Set()
  const fixtureDir = path.join(repoRoot, 'tests', 'fixtures', 'characters', 'classes')
  if (!existsSync(fixtureDir)) return { fixtureClassIds, fixtureFileNames: [] }
  const fixtureFileNames = readdirSync(fixtureDir).filter((name) => /\.xlsx$/i.test(name))
  for (const name of fixtureFileNames) {
    const match = name.match(/^([^-]+)-level\d+/i)
    if (!match) continue
    fixtureClassIds.add(slug(match[1]))
  }
  return { fixtureClassIds, fixtureFileNames }
}

function buildAcquisitionGroupKey(entry) {
  return [
    entry.sourceUrl ?? '',
    inferSuggestedLocalPath(entry),
    inferPlanPageKind(entry),
  ].join('::')
}

function inferPlanPageKind(entry) {
  const kind = String(entry?.kind ?? '').toLowerCase()
  if (kind.includes('class') || kind.includes('subclass')) return 'class'
  if (kind.includes('race')) return 'race'
  if (kind.includes('background')) return 'background'
  if (kind.includes('feat')) return 'feat'
  if (kind.includes('spell')) return 'spell-override'
  return 'custom-bonfire'
}

function inferSuggestedLocalPath(entry) {
  const sourceFile = String(entry?.sourceFile ?? '')
  if (sourceFile) return sourceFile.replaceAll('/', '\\')

  const kind = inferPlanPageKind(entry)
  const baseDir = kind === 'class'
    ? 'data\\Classes'
    : kind === 'race'
      ? 'data\\Raças'
      : kind === 'background'
        ? 'data\\Antecedentes'
        : kind === 'feat'
          ? 'data\\Talentos'
          : 'data\\Ajustes Bonfire'
  const slugName = slug(entry?.parentName ?? entry?.name ?? 'missing-rule') || 'missing-rule'
  return `${baseDir}\\${slugName}.html`
}

function ruleTouchesFixtureContext(rule, fixtureContext, fixtureSourceUrls, group) {
  const contextualValues = [
    rule.className,
    rule.raceName,
    rule.subclassName,
    rule.backgroundName,
    rule.parentName,
    group.className,
    group.raceName,
    group.subclassName,
    group.backgroundName,
    group.parentName,
  ].filter(Boolean).map((value) => slug(value))

  if (contextualValues.some((value) => fixtureContext.fixtureClassIds.has(value))) return true
  if (group.sourceUrl && fixtureSourceUrls.has(group.sourceUrl)) return true
  if (group.sourceFile && contextualValues.some((value) => slug(group.sourceFile).includes(value))) return true
  return false
}

function compareAcquisitionPlanEntries(left, right) {
  const priorityRank = { high: 0, medium: 1, low: 2 }
  return (priorityRank[left.priority] ?? 9) - (priorityRank[right.priority] ?? 9)
    || right.affectedRulesCount - left.affectedRulesCount
    || (left.sourceUrl ?? '').localeCompare(right.sourceUrl ?? '')
    || (left.suggestedLocalPath ?? '').localeCompare(right.suggestedLocalPath ?? '')
}

function renderMissingSourceAcquisitionPlanMarkdown(report) {
  const lines = [
    '# Bonfire Missing Source Acquisition Plan',
    '',
    `Generated at: ${report.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Total entries: ${report.summary.totalEntries}`,
    `- Ação do usuário: ${report.summary.sourceMissingUserActionRequiredCount}`,
    `- Ação técnica: ${report.summary.sourcePresentNeedsParserFixCount}`,
    `- Revisão manual (ambiguous): ${report.summary.ambiguousManualReviewCount}`,
    `- Revisão manual (exact text): ${report.summary.exactTextRequiredManualCheckCount}`,
    `- Ignorados como ruído estrutural: ${report.summary.structuralNoiseIgnoreCount}`,
    '',
    'Instruction for user-action entries: open the page in a browser, press Ctrl+S, and save the full HTML at the suggested local path.',
    '',
  ]

  appendQualityMarkdownSection(lines, report.entries, 'source-missing-user-action-required', 'Ação do usuário: salvar HTML faltante')
  appendQualityMarkdownSection(lines, report.entries, 'source-present-needs-parser-fix', 'Ação técnica: parser precisa ler melhor HTML já existente')
  appendQualityMarkdownSection(lines, report.entries, 'ambiguous-manual-review', 'Revisão manual: seções ambíguas')
  appendQualityMarkdownSection(lines, report.entries, 'exact-text-required-manual-check', 'Revisão manual: texto exato ainda precisa confirmação')
  appendQualityMarkdownSection(lines, report.entries, 'structural-noise-ignore', 'Ignorados como ruído estrutural')

  return `${lines.join('\n').trim()}\n`
}

function appendQualityMarkdownSection(lines, entries, classification, title) {
  const filtered = entries.filter((entry) => entry.classification === classification)
  lines.push(`## ${title}`)
  lines.push('')
  if (!filtered.length) {
    lines.push('- None')
    lines.push('')
    return
  }

  for (const entry of filtered) {
    lines.push(`### ${entry.sourceUrl ?? entry.suggestedLocalPath ?? entry.name}`)
    lines.push('')
    lines.push(`- Classification: ${entry.classification}`)
    lines.push(`- Affected rules: ${entry.affectedRulesCount}`)
    lines.push(`- Reason: ${entry.reason}`)
    if (entry.currentSourceFile) lines.push(`- Current source file: ${entry.currentSourceFile}`)
    if (entry.suggestedLocalPath) lines.push(`- Suggested local path: ${entry.suggestedLocalPath}`)
    if (entry.sourceUrl) lines.push(`- Source URL: ${entry.sourceUrl}`)
    lines.push(`- Next action: ${entry.nextAction}`)
    const examples = entry.affectedRules.slice(0, 10).map((rule) => `${rule.name} (${rule.kind})`)
    if (examples.length) lines.push(`- Example rules: ${examples.join('; ')}`)
    lines.push('')
  }
}

function renderMissingSourceAcquisitionPlanCsv(report) {
  const lines = ['priority,sourceUrl,suggestedLocalPath,currentSourceFile,affectedRulesCount,exampleRules,classification,nextAction']
  for (const entry of report.entries) {
    const exampleRules = entry.affectedRules.slice(0, 5).map((rule) => rule.name).join(' | ')
    lines.push([
      csvCell(entry.priority ?? ''),
      csvCell(entry.sourceUrl ?? ''),
      csvCell(entry.suggestedLocalPath ?? ''),
      csvCell(entry.currentSourceFile ?? ''),
      csvCell(String(entry.affectedRulesCount)),
      csvCell(exampleRules),
      csvCell(entry.classification ?? ''),
      csvCell(entry.nextAction ?? ''),
    ].join(','))
  }
  return `${lines.join('\n')}\n`
}

function csvCell(value) {
  const text = String(value ?? '')
  return `"${text.replaceAll('"', '""')}"`
}

function classifyRemainingDescriptionWarning(entry) {
  if (!entry?.name) return null
  const name = String(entry.name)
  const rule = {
    name,
    kind: entry.kind ?? 'unknown',
    parentName: entry.parentName ?? null,
    className: entry.className ?? null,
    raceName: entry.raceName ?? null,
    subclassName: entry.subclassName ?? null,
    backgroundName: entry.backgroundName ?? null,
    sourceUrl: entry.sourceUrl ?? null,
    sourceFile: entry.sourceFile ?? null,
    shortDescription: entry.shortDescription ?? null,
  }
  const candidates = collectSectionCandidatesForRule(rule).slice(0, 20)
  const { selectedCandidate, scoredCandidates } = selectBonfireSectionCandidate(rule, candidates)
  const warningCode = entry.warningCode
    ?? (entry.reason === 'exact-text-required' ? 'BONFIRE_DESCRIPTION_EXACT_TEXT_REQUIRED' : 'BONFIRE_DESCRIPTION_SUMMARY_ONLY')

  let classification = 'valid-placeholder'
  let nextAction = 'keep-placeholder'
  let reason = entry.reason ?? 'needs-review'
  let resolutionStatus = 'still-ambiguous'

  if (isStructuralSiteNoise(name) || looksLikeProgressionArtifactName(name)) {
    classification = 'structural-site-noise'
    nextAction = 'ignore-noise'
    reason = looksLikeProgressionArtifactName(name) ? 'progression-or-table-artifact' : 'site-navigation-or-generic-heading'
    resolutionStatus = 'resolved'
  } else if (warningCode === 'BONFIRE_DESCRIPTION_EXACT_TEXT_REQUIRED') {
    classification = 'exact-text-required'
    nextAction = 'review-manually'
  } else if (selectedCandidate) {
    classification = 'ambiguous-section'
    nextAction = 'review-manually'
    reason = 'candidate-section-found-but-exactness-not-proven'
    resolutionStatus = 'still-ambiguous'
  } else if (String(entry.currentStatus) === 'missing' || String(entry.reason).includes('missing-full')) {
    classification = 'missing-full-rule-source'
    nextAction = 'provide-html'
    reason = entry.reason ?? 'missing-full-rule-source'
    resolutionStatus = 'missing-source'
  } else if (scoredCandidates.length > 1) {
    classification = 'ambiguous-section'
    nextAction = 'review-manually'
    reason = 'multiple-candidate-sections'
  }

  return {
    name,
    kind: entry.kind ?? 'unknown',
    parentName: entry.parentName ?? null,
    className: entry.className ?? null,
    raceName: entry.raceName ?? null,
    subclassName: entry.subclassName ?? null,
    backgroundName: entry.backgroundName ?? null,
    sourceUrl: entry.sourceUrl ?? null,
    sourceFile: entry.sourceFile ?? null,
    warningCode,
    classification,
    reason,
    candidateSections: scoredCandidates.map((candidate) => ({
      heading: candidate.heading,
      headingLevel: candidate.headingLevel,
      parentHeading: candidate.parentHeading ?? null,
      nearestArticleTitle: candidate.nearestArticleTitle ?? null,
      textPreview: candidate.textPreview ?? '',
      textLength: candidate.textLength ?? 0,
      score: candidate.score,
      reasons: candidate.reasons ?? [],
    })),
    selectedCandidate: selectedCandidate
      ? {
          heading: selectedCandidate.heading,
          headingLevel: selectedCandidate.headingLevel,
          parentHeading: selectedCandidate.parentHeading ?? null,
          nearestArticleTitle: selectedCandidate.nearestArticleTitle ?? null,
          textPreview: selectedCandidate.textPreview ?? '',
          textLength: selectedCandidate.textLength ?? 0,
          score: selectedCandidate.score,
          reasons: selectedCandidate.reasons ?? [],
        }
      : null,
    resolutionStatus,
    nextAction,
  }
}

function buildDescriptionCoverageSummary(entries) {
  const bonfireEntries = entries.filter((entry) => entry?.source === 'bonfire')
  return {
    totalBonfireRules: bonfireEntries.length,
    completeCount: bonfireEntries.filter((entry) => entry.descriptionStatus === 'complete').length,
    summaryOnlyCount: bonfireEntries.filter((entry) => entry.descriptionStatus === 'summary-only').length,
    needsReviewCount: bonfireEntries.filter((entry) => entry.descriptionStatus === 'needs-review').length,
    missingCount: bonfireEntries.filter((entry) => entry.descriptionStatus === 'missing').length,
    previewRejectedWarningCount: bonfireEntries.filter((entry) => shouldWarnPreviewRejected(entry)).length,
  }
}

function buildDescriptionCoverageSummaryFromValidation(report) {
  if (!report?.warnings) return null
  const previewRejectedWarningCount = report.warnings.filter((warning) => String(warning).startsWith('BONFIRE_DESCRIPTION_PREVIEW_REJECTED:')).length
  const exactTextRequiredCount = report.warnings.filter((warning) => String(warning).startsWith('BONFIRE_DESCRIPTION_EXACT_TEXT_REQUIRED:')).length
  return {
    totalBonfireRules: null,
    completeCount: null,
    summaryOnlyCount: null,
    needsReviewCount: null,
    missingCount: null,
    previewRejectedWarningCount,
    exactTextRequiredCount,
  }
}

function collectSectionCandidatesForRule(rule) {
  const files = new Set()
  if (rule.sourceFile) files.add(path.resolve(repoRoot, rule.sourceFile))
  for (const candidate of findCandidateSourceEntries(rule, sourceIndex).slice(0, 8)) files.add(candidate.file)

  const candidates = []
  const nameKey = slug(rule.name)
  const parentKey = slug(rule.parentName ?? '')
  for (const file of files) {
    if (!existsSync(file)) continue
    const bundle = getSourceFileCandidateBundle(file)
    if (slug(bundle.pageTitle) === nameKey || slug(bundle.pageH1) === nameKey) {
      candidates.push(buildArticleBodyCandidate(bundle))
    }
    const directMatches = bundle.candidatesByHeading.get(nameKey) ?? []
    const parentMatches = parentKey ? (bundle.candidatesByParent.get(parentKey) ?? []) : []
    const selected = directMatches.length ? directMatches : parentMatches.length ? parentMatches : bundle.candidates.slice(0, 12)
    candidates.push(...selected)
  }

  return candidates
}

function getSourceFileCandidateBundle(file) {
  const resolved = path.resolve(file)
  const cached = sourceFileCandidateCache.get(resolved)
  if (cached) return cached

  const html = readFileSync(resolved, 'utf8')
  const article = cleanHtml(html)
  const pageTitle = cleanTitle(extractTitle(html) || titleFromFile(resolved))
  const pageH1 = htmlToText(attr(article, /<h1\b[^>]*>([\s\S]*?)<\/h1>/i) ?? '')
  const sourceUrl = extractSourceUrl(html) ?? null
  const sourceFile = path.relative(repoRoot, resolved)
  const candidates = extractSectionBodyCandidates({
    html: article,
    pageTitle,
    pageH1,
    sourceUrl,
    sourceFile,
    rule: { name: '__no-article-candidate__' },
  })
  const candidatesByHeading = new Map()
  const candidatesByParent = new Map()
  for (const candidate of candidates) {
    const headingKey = slug(candidate.heading)
    if (!candidatesByHeading.has(headingKey)) candidatesByHeading.set(headingKey, [])
    candidatesByHeading.get(headingKey).push(candidate)
    const parentKey = slug(candidate.parentHeading ?? '')
    if (parentKey) {
      if (!candidatesByParent.has(parentKey)) candidatesByParent.set(parentKey, [])
      candidatesByParent.get(parentKey).push(candidate)
    }
  }

  const bundle = {
    html,
    article,
    pageTitle,
    pageH1,
    sourceUrl,
    sourceFile,
    candidates,
    candidatesByHeading,
    candidatesByParent,
  }
  sourceFileCandidateCache.set(resolved, bundle)
  return bundle
}

function buildArticleBodyCandidate(bundle) {
  const headings = extractHeadings(bundle.article)
  const bodyHtml = sanitizeDescriptionHtml(bundle.article.slice((headings.find((heading) => heading.level === 1)?.end) ?? 0, ((headings.find((heading) => heading.level === 1)?.end) ?? 0) + 6000))
  const text = cleanText(htmlToText(bodyHtml))
  return {
    heading: bundle.pageTitle || bundle.pageH1,
    headingLevel: 'article',
    parentHeading: null,
    nearestArticleTitle: bundle.pageTitle || bundle.pageH1 || '',
    pageTitle: bundle.pageTitle,
    pageH1: bundle.pageH1,
    sourceUrl: bundle.sourceUrl,
    sourceFile: bundle.sourceFile,
    descriptionSource: 'article-body',
    descriptionHtml: bodyHtml,
    text,
    textPreview: text.length > 180 ? `${text.slice(0, 177)}...` : text,
    textLength: text.length,
    immediateBody: true,
  }
}

function inferCoverageReason(entry) {
  if (entry.descriptionSource === 'card-summary' || entry.descriptionSource === 'category-preview' || entry.descriptionSource === 'local-preview') return 'preview-rejected'
  if (entry.descriptionSource === 'manual-review') return 'manual-review-not-accepted'
  if (Array.isArray(entry.needsReviewReasons) && entry.needsReviewReasons.includes('missing-full-rule-page')) return 'missing-full-page'
  if (Array.isArray(entry.needsReviewReasons) && entry.needsReviewReasons.includes('missing-full-rule-description')) return 'missing-full-description'
  return 'needs-review'
}

function collectMissingRules(coverage) {
  return {
    generatedAt: new Date().toISOString(),
    missingRules: coverage.classes
      .filter((entry) => entry.status !== 'covered')
      .map((entry) => ({
        className: entry.className,
        missing: entry.missing,
        reason: entry.status === 'missing' ? 'not-found-in-bonfire-html' : 'incomplete-generated-rule',
      })),
  }
}

function collectMissingClassFixtures() {
  const fixtureDir = path.join(repoRoot, 'tests', 'fixtures', 'characters', 'classes')
  const files = existsSync(fixtureDir) ? readdirSync(fixtureDir) : []
  return {
    generatedAt: new Date().toISOString(),
    expectedDirectory: 'tests/fixtures/characters/classes',
    missingFixtures: classIndex
      .map((entry) => `${entry.id}-level3.bonfire.xlsx`)
      .filter((fileName) => !files.includes(fileName))
      .map((fileName) => ({ fileName, reason: 'fixture-not-yet-added' })),
  }
}

function seedCounts(seeds) {
  return Object.fromEntries(Object.entries(seeds).map(([key, value]) => [key, value.length]))
}

function dedupeById(entries) {
  const seen = new Map()
  for (const entry of entries.filter((candidate) => shouldKeepBonfireSeed(candidate))) {
    const existing = seen.get(entry.id)
    if (!existing || descriptionRank(entry.descriptionStatus) > descriptionRank(existing.descriptionStatus)) seen.set(entry.id, entry)
  }
  return Array.from(seen.values()).sort((a, b) => a.id.localeCompare(b.id))
}

function dedupeMissingSourcePages(entries) {
  const seen = new Map()
  for (const entry of entries) {
    const key = `${slug(entry.name)}::${entry.kind || 'unknown'}::${entry.expectedSourceUrl || ''}::${entry.reason}`
    if (!seen.has(key)) seen.set(key, entry)
  }
  return Array.from(seen.values()).sort((a, b) => String(a.name).localeCompare(String(b.name)))
}

function dedupeSubrulesReview(entries) {
  const seen = new Map()
  for (const entry of entries) {
    const key = `${slug(entry.name)}::${slug(entry.parentName ?? '')}::${entry.kind}::${entry.reason ?? ''}`
    if (!seen.has(key)) seen.set(key, entry)
  }
  return Array.from(seen.values()).sort((a, b) => String(a.name).localeCompare(String(b.name)))
}

function summarizeSubrulesReview(entries) {
  const deduped = dedupeSubrulesReview(entries)
  return {
    bonfireSubRulesExtractedCount: deduped.filter((entry) => entry.reason === null).length,
    bonfireInlineBoldSubRulesCount: deduped.filter((entry) => entry.reason === null).length,
    bonfireSubRulesWithParentCount: deduped.filter((entry) => entry.reason === null && entry.parentName).length,
    bonfireSubRulesMissingDescriptionCount: deduped.filter((entry) => entry.reason === 'inline-bold-title-without-description').length,
  }
}

function descriptionRank(status) {
  return status === 'complete' ? 5 : status === 'needs-review' ? 3 : status === 'summary-only' ? 2 : 1
}

function cleanHtml(html) {
  const bodyStart = html.search(/<body\b/i)
  const body = bodyStart >= 0 ? html.slice(bodyStart) : html
  return body
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<svg\b[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<nav\b[\s\S]*?<\/nav>/gi, ' ')
}

function sanitizeDescriptionHtml(html) {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[\s\S]*?<\/style>/gi, '')
    .replace(/\s(?:class|style|id|data-[a-z-]+|href)="[^"]*"/gi, '')
    .trim()
}

function extractDescriptionHtml(html, maxLength) {
  const h1 = extractHeadings(html).find((heading) => heading.level === 1)
  const start = h1?.end ?? 0
  return sanitizeDescriptionHtml(html.slice(start, start + maxLength))
}

function htmlToText(html) {
  return decodeEntities(String(html ?? '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|li|tr|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim()
}

function htmlToRuleText(html) {
  return decodeEntities(String(html ?? '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|li|tr|h[1-6]|ul|ol|table)>/gi, '\n')
    .replace(/<[^>]+>/g, ' '))
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function cleanText(value) {
  return decodeEntities(String(value ?? '')).replace(/\s+/g, ' ').trim()
}

function cleanFeatureName(value) {
  return cleanText(value)
    .replace(/^\s*(?:•|-)\s*/, '')
    .replace(/^\s*\d+\s*[.)]\s*/, '')
    .replace(/\s+/g, ' ')
    .replace(/[.:]\s*$/, '')
    .trim()
}

function cleanTitle(value) {
  return cleanText(value)
    .replace(/\s+in\s+Bonfire Tales RPG.*$/i, '')
    .replace(/\s+Species$/i, '')
    .trim()
}

function normalizeRaceTitle(title) {
  return cleanTitle(title)
    .replace(/\s*-\s*Bonfire Tales RPG$/i, '')
    .replace(/\s+Species$/i, '')
    .trim()
}

function titleFromFile(file) {
  return path.basename(file).replace(/\.(html?|HTML?)$/, '').replace(/\s+_\s+World Anvil$/i, '')
}

function extractTitle(html) {
  return attr(html, /<meta\s+(?:property|name)="(?:og:title|twitter:title)"\s+content="([^"]+)"/i)
    ?? attr(html, /<title[^>]*>([\s\S]*?)<\/title>/i)
    ?? htmlToText(attr(html, /<h1\b[^>]*>([\s\S]*?)<\/h1>/i) ?? '')
}

function extractSourceUrl(html) {
  return attr(html, /saved from url=\(\d+\)([^ ]+)\s*-->/i)
    ?? attr(html, /<meta\s+(?:property|name)="(?:og:url|twitter:url)"\s+content="([^"]+)"/i)
}

function attr(html, regex) {
  const match = html.match(regex)
  return match ? decodeEntities(match[1]).trim() : null
}

function meaningfulParagraph(html) {
  const paragraphs = [...html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map((match) => htmlToText(match[1])).filter((text) => text.length > 80)
  return paragraphs[0] ?? ''
}

function extractHitDie(text) {
  const match = text.match(/\b1d(6|8|10|12)\b/i)
  return match ? `d${match[1]}` : null
}

function extractSavingThrows(html) {
  const match = html.match(/Testes de Resist[eê]ncia:<\/b>\s*([^<]+)/i)
  if (!match) return null
  const saves = match[1].split(/,| e /i).map((entry) => abilityKey(entry)).filter(Boolean)
  return saves.length ? Array.from(new Set(saves)) : null
}

function extractSpellcasting(html, classId) {
  const text = htmlToText(html)
  const defaults = classDefaults[classId]?.spellcasting
  if (defaults?.type === 'none') return defaults
  const ability = /habilidade de conjura[cç][aã]o (?:e|é)\s+Carisma/i.test(text)
    ? 'cha'
    : /habilidade de conjura[cç][aã]o (?:e|é)\s+Intelig[eê]ncia/i.test(text)
      ? 'int'
      : /habilidade de conjura[cç][aã]o (?:e|é)\s+Sabedoria/i.test(text)
        ? 'wis'
        : defaults?.ability
  if (!ability && !/conjura|magia|feiti[cç]aria|misticismo/i.test(text)) return { type: 'none' }
  return { type: defaults?.type ?? 'needs-review', ability: ability ?? undefined }
}

function extractSpeed(text) {
  const match = text.match(/deslocamento(?: de caminhada)?(?: aumenta| igual)?[^0-9]{0,40}(\d+)\s*(?:metros|m|p[eé]s|feet)/i)
  if (!match) return null
  return Number(match[1])
}

function extractPrerequisite(html) {
  const match = htmlToText(html).match(/Pr[eé]-requisito:\s*([^\.]+)/i)
  return match ? cleanText(match[1]) : null
}

function abilityKey(value) {
  const key = slug(value)
  if (key.includes('forca') || key === 'str') return 'str'
  if (key.includes('destreza') || key === 'dex') return 'dex'
  if (key.includes('constituicao') || key === 'con') return 'con'
  if (key.includes('inteligencia') || key === 'int') return 'int'
  if (key.includes('sabedoria') || key === 'wis') return 'wis'
  if (key.includes('carisma') || key === 'cha') return 'cha'
  return null
}

function canonicalClass(value) {
  return canonicalByKey.get(slug(value))
}

function featureKindFromName(name) {
  if (/conjura[cç][aã]o|feiti[cç]aria/i.test(name)) return 'spellcasting'
  if (/canalizar|surto|pontos de misticismo|recupera[cç][aã]o/i.test(name)) return 'resource'
  return 'classFeature'
}

function looksLikeSubclassName(name) {
  return /^(c[ií]rculo|dom[ií]nio|arqu[eé]tipo|juramento|tradi[cç][aã]o|caminho|col[eé]gio|especializa[cç][aã]o|manifest[aã]o)/i.test(name)
}

function looksLikeOnlyLevel(name) {
  return /^(?:n[ií]vel|level)\s+\d+$/i.test(name)
}

function isNoiseHeading(name) {
  const key = slug(name)
  return headingNoise.has(key) || isStructuralSiteNoise(name) || looksLikeProgressionArtifactName(name) || key.length < 3 || /^str|dex|con|int|wis|cha$/.test(key)
}

function shouldKeepBonfireSeed(entry) {
  if (!entry?.name) return false
  if (isStructuralSiteNoise(entry.name) || looksLikeProgressionArtifactName(entry.name)) return false
  return true
}

function isStructuralSiteNoise(name) {
  const key = slug(name)
  if (!key) return true
  if (headingNoise.has(key)) return true
  if (/^(world-anvil|bonfire-tales|related-articles|table-of-contents|back-to-top|navigation|search)$/.test(key)) return true
  if (/^(find-your-way|get-the-news|legal|partnered|entry-for-worldember-2025|linha-do-tempo-de-cineria)$/.test(key)) return true
  return false
}

function looksLikeProgressionArtifactName(name) {
  const text = cleanText(name)
  if (!text) return true
  if (/^\d+\s*[º°o]?\s*(?:n[ií]vel|ciclo)$/i.test(text)) return true
  if (/^(?:n[ií]vel|level)\s+\d+\s*$/i.test(text)) return true
  if (/^\d+\s*[-+]\s*\d+$/.test(text)) return true
  if (/^\d+\s*[-+]\s*\d+\s*[-+]\s*\d+$/.test(text)) return true
  if (/^\d+(?:\s+[+0-9-]+)+$/.test(text)) return true
  if (/^\d+\s*$/.test(text)) return true
  return false
}

function shortDescription(description) {
  const text = cleanText(description)
  const sentence = text.match(/^.{40,240}?[.!?](?:\s|$)/)?.[0] ?? text.slice(0, 240)
  return sentence.trim() || ''
}

function buildSeedDescription({ name, kind, descriptionHtml, descriptionText, shortDescription: previewText, descriptionSource, sourceUrl, sourceFile, context = {} }) {
  const fullTextCandidate = cleanText(descriptionText || '')
  const previewCandidate = cleanText(previewText || '')
  const sanitizedHtml = descriptionHtml ? sanitizeDescriptionHtml(descriptionHtml) : null
  const inferredPreviewSource = inferPreviewSource(descriptionSource, sanitizedHtml, sourceFile)
  const ruleContext = {
    name,
    kind,
    sourceUrl,
    sourceFile: sourceFile ? path.relative(repoRoot, sourceFile) : null,
    descriptionSource: inferredPreviewSource,
    shortDescription: previewCandidate || null,
    parentName: context.parentName ?? null,
    className: context.className ?? null,
    raceName: context.raceName ?? null,
    subclassName: context.subclassName ?? null,
    backgroundName: context.backgroundName ?? null,
  }
  let fullSource = tryResolveDetailedSource(ruleContext)
  let resolvedHtml = fullSource?.descriptionHtml ?? sanitizedHtml
  let resolvedText = cleanText(fullSource?.descriptionText ?? fullTextCandidate)
  let resolvedSource = fullSource?.descriptionSource ?? inferredPreviewSource

  const shouldTryContextualResolution =
    (!resolvedText
      || containsUiJunk(resolvedText)
      || !isLikelyCompleteRuleText(resolvedText, resolvedHtml, resolvedSource)
      || (
        ['inline-bold-subrule', 'section-body'].includes(resolvedSource)
        && resolvedText.length < 140
        && Boolean(ruleContext.parentName || ruleContext.className || ruleContext.raceName || ruleContext.subclassName || ruleContext.backgroundName)
      ))

  if (shouldTryContextualResolution && sourceFile) {
    const contextualSource = tryResolveDetailedSource({ ...ruleContext, descriptionSource: resolvedSource })
    if (contextualSource) {
      fullSource = contextualSource
      resolvedHtml = contextualSource.descriptionHtml ?? resolvedHtml
      resolvedText = cleanText(contextualSource.descriptionText ?? resolvedText)
      resolvedSource = contextualSource.descriptionSource ?? resolvedSource
    }
  }

  if (!resolvedText) {
    return {
      descriptionHtml: null,
      descriptionText: null,
      shortDescription: previewCandidate || null,
      descriptionStatus: previewCandidate ? (resolvedSource === 'card-summary' || resolvedSource === 'category-preview' || resolvedSource === 'local-preview' ? 'summary-only' : 'needs-review') : 'missing',
      descriptionSource: resolvedSource,
      needsReviewReasons: previewCandidate ? ['missing-full-rule-description', 'missing-full-rule-page'] : ['missing-full-rule-description', 'missing-full-rule-page'],
    }
  }

  if (!isAllowedCompleteDescriptionSource(resolvedSource) || (resolvedSource !== 'inline-bold-subrule' && looksLikeCardSummary(resolvedText, resolvedHtml))) {
    return {
      descriptionHtml: null,
      descriptionText: null,
      shortDescription: previewCandidate || summarizeFromExactText(resolvedText),
      descriptionStatus:
        resolvedSource === 'card-summary' || resolvedSource === 'category-preview' || resolvedSource === 'local-preview'
          ? 'summary-only'
          : 'needs-review',
      descriptionSource: resolvedSource === 'unknown' ? 'category-preview' : resolvedSource,
      needsReviewReasons: Array.from(
        new Set([
          ...(fullSource ? [] : ['missing-full-rule-page']),
          'missing-full-rule-description',
          ...(resolvedSource === 'card-summary' || resolvedSource === 'category-preview' ? ['summary-card-used-no-full-description'] : []),
          ...(resolvedSource === 'manual-review' ? ['manual-description-not-source-verified'] : []),
        ]),
      ),
    }
  }

  if (containsUiJunk(resolvedText)) {
    return {
      descriptionHtml: null,
      descriptionText: null,
      shortDescription: previewCandidate || null,
      descriptionStatus: 'needs-review',
      descriptionSource: resolvedSource,
      needsReviewReasons: ['summary-card-used-no-full-description', 'missing-full-rule-description'],
    }
  }

  if (isLikelyCompleteRuleText(resolvedText, resolvedHtml, resolvedSource)) {
    return {
      descriptionHtml: resolvedHtml,
      descriptionText: resolvedText,
      shortDescription: previewCandidate && previewCandidate !== resolvedText ? previewCandidate : null,
      descriptionStatus: 'complete',
      descriptionSource: resolvedSource,
      needsReviewReasons: [],
    }
  }

  return {
    descriptionHtml: null,
    descriptionText: null,
    shortDescription: previewCandidate || summarizeFromExactText(resolvedText),
    descriptionStatus: 'needs-review',
    descriptionSource: resolvedSource,
    needsReviewReasons: fullSource ? ['summary-card-used-no-full-description', 'missing-full-rule-description'] : ['missing-full-rule-description', 'missing-full-rule-page'],
  }
}

function summarizeFromExactText(text) {
  return shortDescription(text) || null
}

function isLikelyCompleteRuleText(text, html, source) {
  if (!text) return false
  if (looksLikeProgressionMatrix(text, html)) return false
  if (source === 'inline-bold-subrule') return text.length >= 24
  if (source === 'table-rule-body' || source === 'table-row') return text.length >= 60 || hasMechanicalSignals(text)
  if (hasMechanicalSignals(text)) return true
  if (text.length >= 180) return true
  if (html && /<ul|<ol|<table|<b>\s*efeito|<strong>\s*efeito/i.test(html)) return true
  return false
}

function looksLikeProgressionMatrix(text, html) {
  const compact = cleanText(text)
  if (!compact) return false
  if (
    /\bN[ií]vel\b/i.test(compact)
    && /\bB[oô]nus de Profici[eê]ncia\b/i.test(compact)
    && /\bCaracter[ií]sticas\b/i.test(compact)
  ) {
    return true
  }
  if (html && /<table/i.test(html) && /<th>\s*N[íi]vel\s*<\/th>/i.test(html) && /<th>\s*B[oô]nus de Profici/i.test(html)) {
    return true
  }
  return /\b1°\b.*\b2°\b.*\b3°\b/i.test(compact) && /\btruques\b/i.test(compact)
}

function isAllowedCompleteDescriptionSource(source) {
  return source === 'article-body' || source === 'section-body' || source === 'inline-bold-subrule' || source === 'table-rule-body'
}

function hasMechanicalSignals(text) {
  return /\b(vantagem|desvantagem|teste(?:s)? de resist[eê]ncia|a[cç][aã]o|a[cç][aã]o b[oô]nus|rea[cç][aã]o|descanso longo|descanso curto|pv tempor[aá]rios|profici[eê]ncia|cd\b|efeito:|pr[eé]-requisito:|conjurar|dano|alcance|metro|p[eé]s)\b/i.test(text)
}

function looksLikeCardSummary(text, html) {
  if (!text) return true
  if (containsUiJunk(text)) return true
  if (text.length < 110 && !hasMechanicalSignals(text)) return true
  if (html && /role="listbox"|toggle menu|create your account|gift a membership|worldanvil podcast/i.test(html)) return true
  return false
}

function containsUiJunk(text) {
  return /\b(create your account|login|pricing|privacy|terms of service|worldanvil podcast|discord|youtube|twitch|facebook|reddit|do you need help|gift a membership|community|i am a gamemaster)\b/i.test(text)
}

function inferPreviewSource(descriptionSource, html, sourceFile) {
  if (descriptionSource && descriptionSource !== 'unknown') return descriptionSource
  const relative = String(sourceFile ? path.relative(repoRoot, sourceFile) : '').toLowerCase()
  if (html && /<article[^>]+card|class="[^"]*(card|preview|teaser|summary)/i.test(html)) return 'card-summary'
  if (relative.includes('classes') || relative.includes('racas') || relative.includes('races') || relative.includes('antecedentes') || relative.includes('backgrounds') || relative.includes('talentos') || relative.includes('feats') || relative.includes('subclasses')) {
    return 'category-preview'
  }
  return descriptionSource ?? 'unknown'
}

function tryResolveDetailedSource(rule) {
  const sourceFile = rule.sourceFile ? path.resolve(repoRoot, rule.sourceFile) : null
  const sectionCandidates = collectSectionCandidatesForRule(rule)
  const { selectedCandidate, scoredCandidates } = selectBonfireSectionCandidate(rule, sectionCandidates)

  if (selectedCandidate?.text) {
    return {
      descriptionHtml: selectedCandidate.descriptionHtml,
      descriptionText: cleanText(selectedCandidate.text),
      descriptionSource: selectedCandidate.descriptionSource,
    }
  }

  const candidates = findCandidateSourceEntries(rule, sourceIndex)
  if (!candidates.length && !sourceFile) {
    missingSourcePages.push({
      name: rule.name,
      kind: rule.kind,
      categorySourceUrl: rule.sourceUrl ?? null,
      expectedSourceUrl: null,
      sourceFile: rule.sourceFile ?? null,
      reason: 'full-rule-html-not-found',
    })
    return null
  }

  if (scoredCandidates.length) {
    const [best, second] = scoredCandidates
    if (best && second && best.score - second.score < 40) {
      return null
    }
    if (best) {
      return null
    }
  }

  if (candidates.length) {
    missingSourcePages.push({
      name: rule.name,
      kind: rule.kind,
      categorySourceUrl: rule.sourceUrl ?? null,
      expectedSourceUrl: candidates[0]?.sourceUrl || null,
      sourceFile: rule.sourceFile ?? null,
      categoryPreview: rule.shortDescription ?? null,
      reason: 'full-rule-html-not-found',
    })
  }
  return null
}

function shouldWarnPreviewRejected(seed) {
  if (!seed || seed.descriptionStatus !== 'complete') return false
  if (!seed.descriptionText || !seed.shortDescription) return false
  if (seed.descriptionText !== seed.shortDescription) return false
  return !isAllowedCompleteDescriptionSource(seed.descriptionSource) || ['card-summary', 'category-preview', 'manual-review', 'local-preview', 'unknown'].includes(seed.descriptionSource ?? 'unknown')
}

function shouldWarnExactTextRequired(seed) {
  return Boolean(seed?.source === 'bonfire'
    && seed.descriptionStatus === 'complete'
    && !isStructuralSiteNoise(seed.name)
    && !looksLikeProgressionArtifactName(seed.name)
    && !isLikelyCompleteRuleText(seed.descriptionText ?? '', seed.descriptionHtml ?? '', seed.descriptionSource))
}

function findCandidateSourceEntries(entry, index) {
  const nameKey = slug(entry.name)
  const parentKey = slug(entry.parentName ?? entry.className ?? entry.subclassName ?? entry.raceName ?? entry.backgroundName ?? '')
  const sourceUrlKey = slug(entry.sourceUrl ?? '')
  const sourceFileRaw = entry.sourceFile ?? entry.sourceFileName ?? ''
  const sourceFileKey = slug(path.basename(sourceFileRaw, path.extname(sourceFileRaw)))
  const kindKey = slug(entry.kind)
  return index
    .map((candidate) => {
      let score = 0
      const sectionMatches = []
      if (candidate.normalizedTitle === nameKey) {
        score += 120
        sectionMatches.push(candidate.title)
      }
      if (candidate.normalizedH1 === nameKey) {
        score += 110
        sectionMatches.push(candidate.h1)
      }
      if (candidate.normalizedHeadings.includes(nameKey)) {
        score += 90
        sectionMatches.push(...candidate.headings.filter((heading) => slug(heading) === nameKey))
      }
      if (candidate.normalizedStrongTitles.includes(nameKey)) {
        score += 95
        sectionMatches.push(...candidate.strongTitles.filter((heading) => slug(heading) === nameKey))
      }
      if (sourceUrlKey && candidate.normalizedSourceUrl === sourceUrlKey) score += 80
      if (sourceUrlKey && candidate.normalizedSourceUrl.includes(sourceUrlKey)) score += 30
      if (sourceFileKey && candidate.normalizedFileSlug === sourceFileKey) score += 60
      if (parentKey && (candidate.normalizedTitle === parentKey || candidate.normalizedH1 === parentKey)) score += 50
      if (parentKey && candidate.normalizedHeadings.includes(parentKey)) score += 20
      if (parentKey && candidate.normalizedStrongTitles.includes(parentKey)) score += 20
      if (kindKey.includes('race') && candidate.relativePath.toLowerCase().includes('raca')) score += 10
      if (kindKey.includes('class') && candidate.relativePath.toLowerCase().includes('class')) score += 10
      if (kindKey.includes('background') && candidate.relativePath.toLowerCase().includes('anteced')) score += 10
      if (kindKey === 'feat' && candidate.relativePath.toLowerCase().includes('talent')) score += 10
      return {
        ...candidate,
        score,
        sectionMatches: Array.from(new Set(sectionMatches.filter(Boolean))),
      }
    })
    .filter((candidate) => candidate.score > 0)
    .sort((left, right) => right.score - left.score || left.relativePath.localeCompare(right.relativePath))
}

function extractStrongTitles(article, sourceUrl) {
  return extractInlineSubRules({
    htmlNode: article,
    parentRule: {},
    parentKind: 'customBonfireFeature',
    sourceUrl,
  }).subRules.map((entry) => entry.name)
}

function findBestNamedSection(article, name) {
  const normalized = slug(name)
  const headings = extractHeadings(article)
  const heading = headings.find((entry) => slug(cleanFeatureName(entry.text)) === normalized)
  if (heading) {
    return {
      html: sanitizeDescriptionHtml(sectionHtml(article, heading, headings)),
      source: 'section-body',
    }
  }

  const tableCellMatch = [...String(article ?? '').matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)]
    .map((match) => match[1])
    .find((cellHtml) => slug(cleanFeatureName(htmlToText(cellHtml).split(':')[0])) === normalized)
  if (tableCellMatch) {
    return {
      html: sanitizeDescriptionHtml(tableCellMatch),
      source: 'table-rule-body',
    }
  }

  return null
}

function extractDetailedRuleFromFile(file, name) {
  const html = readFileSync(file, 'utf8')
  const article = cleanHtml(html)
  const inlineMatch = extractInlineSubRules({
    htmlNode: article,
    parentRule: {},
    parentKind: 'customBonfireFeature',
    sourceUrl: extractSourceUrl(html),
  }).subRules.find((entry) => slug(entry.name) === slug(name))
  if (inlineMatch?.descriptionText) {
    return {
      descriptionHtml: inlineMatch.descriptionHtml,
      descriptionText: cleanText(inlineMatch.descriptionText),
      descriptionSource: 'inline-bold-subrule',
    }
  }
  const sectionMatch = extractNamedRuleSectionFromArticle(article, name) ?? findBestNamedSection(article, name)
  if (sectionMatch) {
    const descriptionText = cleanText(htmlToRuleText(sectionMatch.html))
    if (descriptionText && !looksLikeCardSummary(descriptionText, sectionMatch.html) && isLikelyCompleteRuleText(descriptionText, sectionMatch.html, sectionMatch.source)) {
      return {
        descriptionHtml: sectionMatch.html,
        descriptionText,
        descriptionSource: sectionMatch.source,
      }
    }
  }

  const descriptionHtml = extractDescriptionHtml(article, 2600)
  const descriptionText = cleanText(htmlToRuleText(descriptionHtml))
  if (!descriptionText || looksLikeCardSummary(descriptionText, descriptionHtml) || !isLikelyCompleteRuleText(descriptionText, descriptionHtml, 'article-body')) return null
  return {
    descriptionHtml,
    descriptionText,
    descriptionSource: 'article-body',
  }
}

function extractNamedRuleSectionFromArticle(article, name) {
  const headings = extractHeadings(article)
  const target = slug(name)
  const heading = headings.find((entry) => slug(cleanFeatureName(entry.text)) === target)
  if (!heading) return null
  const descriptionHtml = sanitizeDescriptionHtml(sectionHtml(article, heading, headings))
  const descriptionText = cleanText(htmlToRuleText(descriptionHtml))
  if (!descriptionText || looksLikeCardSummary(descriptionText, descriptionHtml) || !isLikelyCompleteRuleText(descriptionText, descriptionHtml, 'section-body')) return null
  return {
    descriptionHtml,
    descriptionText,
    descriptionSource: 'section-body',
  }
}

function buildSourceIndex(files) {
  return files.map((file) => {
    const html = readFileSync(file, 'utf8')
    const article = cleanHtml(html)
    const h1 = htmlToText(attr(article, /<h1\b[^>]*>([\s\S]*?)<\/h1>/i) ?? '')
    const title = cleanTitle(extractTitle(html) || titleFromFile(file))
    const sourceUrl = extractSourceUrl(html) ?? ''
    const headings = extractHeadings(article).map((heading) => cleanFeatureName(heading.text)).filter(Boolean)
    const strongTitles = extractStrongTitles(article, sourceUrl).map((titleEntry) => cleanFeatureName(titleEntry)).filter(Boolean)
    return {
      file,
      relativePath: path.relative(repoRoot, file),
      fileSlug: path.basename(file, path.extname(file)),
      title,
      h1,
      headings,
      strongTitles,
      sourceUrl,
      normalizedFileSlug: slug(path.basename(file, path.extname(file))),
      normalizedTitle: slug(title),
      normalizedH1: slug(h1),
      normalizedSourceUrl: slug(sourceUrl),
      normalizedHeadings: headings.map((heading) => slug(heading)),
      normalizedStrongTitles: strongTitles.map((heading) => slug(heading)),
    }
  })
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

function decodeEntities(value) {
  return String(value ?? '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(Number.parseInt(code, 16)))
}

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'))
}

function writeJson(file, value) {
  ensureDir(path.dirname(file))
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

function writeText(file, value) {
  ensureDir(path.dirname(file))
  writeFileSync(file, value, 'utf8')
}

function ensureDir(dir) {
  mkdirSync(dir, { recursive: true })
}

function errorEntry(file, error) {
  return {
    file: path.relative(repoRoot, file),
    message: error instanceof Error ? error.message : String(error),
  }
}
