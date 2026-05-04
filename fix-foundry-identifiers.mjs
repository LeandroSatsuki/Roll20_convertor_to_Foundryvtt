import fs from 'node:fs'

const inputPath = process.argv[2]
const outputPath = process.argv[3] ?? inputPath?.replace(/\.json$/i, '.fixed.json')

if (!inputPath) {
  console.error('Uso: node fix-foundry-identifiers.mjs input.json output.fixed.json')
  process.exit(1)
}

function toFoundryIdentifier(input, fallback = 'item') {
  const raw = String(input ?? '').trim()

  const withoutAccents = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '')

  const slug = withoutAccents
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-_]+|[-_]+$/g, '')

  return slug || fallback
}

function uniqueIdentifier(input, used, fallback = 'item') {
  const base = toFoundryIdentifier(input, fallback)
  let candidate = base
  let index = 2

  while (used.has(candidate)) {
    candidate = `${base}-${index}`
    index += 1
  }

  used.add(candidate)
  return candidate
}

const actor = JSON.parse(fs.readFileSync(inputPath, 'utf8'))
const used = new Set()

for (const item of actor.items ?? []) {
  item.system ??= {}

  const source = item.system.identifier || item.name || item._id || 'item'
  item.system.identifier = uniqueIdentifier(source, used, 'item')
}

fs.writeFileSync(outputPath, JSON.stringify(actor, null, 2), 'utf8')

console.log(`Arquivo corrigido salvo em: ${outputPath}`)
