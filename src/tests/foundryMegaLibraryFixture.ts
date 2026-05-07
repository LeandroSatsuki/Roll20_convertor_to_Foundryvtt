import { existsSync, readFileSync } from 'node:fs'
import { buildFoundryReferenceLibrary } from '../lib/foundry-library/buildFoundryReferenceLibrary'
import type { FoundryReferenceLibrary, FoundryReferenceLibraryInput } from '../lib/foundry-library/foundryReferenceLibraryTypes'

const megaActorPaths = [
  'C:/Users/rhdig/Downloads/fvtt-Actor-player-teste-04-cdZgL8Qt1H6RAOPu (1).json',
  'C:/Users/rhdig/Downloads/fvtt-Actor-player-teste-04-cdZgL8Qt1H6RAOPu.json',
  'C:/Users/rhdig/Downloads/fvtt-Actor-player-teste-03-Js1gHD4TYzxCuXMJ.json',
  'C:/Users/rhdig/Downloads/fvtt-Actor-player-teste-02-RveeXYi8JdRk5dda.json',
  'C:/Users/rhdig/Downloads/fvtt-Actor-player-teste-eiANIHN4xwaZX1yl.json',
]

export function loadMegaLibraryFixture(): FoundryReferenceLibrary {
  const realInputs = megaActorPaths
    .filter((path) => existsSync(path))
    .map((path) => ({
      sourceFileName: path.split('/').pop() ?? path,
      actorJson: JSON.parse(readFileSync(path, 'utf8')) as unknown,
    }))
  return buildFoundryReferenceLibrary(realInputs.length ? [...realInputs, ...syntheticInputs()] : syntheticInputs())
}

export function syntheticInputs(): FoundryReferenceLibraryInput[] {
  return [
    {
      sourceFileName: 'synthetic-mega-actor.json',
      actorJson: {
        name: 'Synthetic Mega Actor',
        system: { abilities: { str: { value: 3 } } },
        items: [
          spell('Healing Word', 1, { heal: true }),
          spell('Guiding Bolt', 1, { attack: true }),
          spell('Phantasmal Force', 2, { effects: true }),
          spell('Thunderwave', 1, { attack: true, midi: true }),
          spell('Silvery Barbs', 1, { effects: true }),
          spell('Shield', 1, { effects: true }),
          spell('Barkskin', 2, { effects: true }),
          spell("Sylune's Viper", 2, { attack: true }),
          equipment('Potion of Healing', 'consumable', { effects: true }),
          equipment('Scale Mail', 'equipment', { effects: true }),
          equipment('Shield', 'equipment', { effects: true }),
          equipment('Scimitar', 'weapon', { effects: true }),
          equipment('Studded Leather', 'equipment', { effects: true }),
          equipment("Woodcarver's Tools", 'tool', { effects: true }),
          equipment('Herbalism Kit', 'tool', { effects: true }),
          equipment("Climber's Kit", 'tool', { effects: true }),
          equipment('Druidic Focus', 'equipment', { effects: true }),
          equipment('Spellcasting Focus', 'equipment', { effects: true }),
          equipment('Wand', 'equipment', { effects: true }),
          feat('Tough', { effects: true }),
          feat('Divine Intervention', { effects: true }),
          { _id: 'badtype000000001', name: 'Ignored Facility', type: 'facility', system: {}, effects: [], flags: {} },
        ],
      },
    },
  ]
}

function spell(name: string, level: number, options: { attack?: boolean; heal?: boolean; effects?: boolean; midi?: boolean } = {}) {
  return {
    _id: itemId(name),
    name,
    type: 'spell',
    img: 'icons/svg/book.svg',
    system: {
      identifier: identifier(name),
      level,
      description: { value: `<p>${name} real Foundry description.</p>`, chat: '' },
      source: { book: 'PHB', rules: '2024', page: '1' },
      sourceClass: 'cleric',
      properties: options.midi ? ['mgc'] : [],
      preparation: { mode: 'prepared', prepared: true },
      activities: options.heal
        ? { heal: { _id: 'healactivity0001', name, type: 'heal', healing: { formula: '1d4+4' } } }
        : options.attack
          ? { attack: { _id: 'attackactivity01', name, type: 'attack', attack: { ability: 'wis', classification: 'spell', mode: 'ranged' } } }
          : { cast: { _id: 'castactivity001', name, type: 'cast', spellcasting: { ability: 'wis' } } },
    },
    effects: options.effects ? [{ _id: 'effect0000000001', name: `${name} Effect`, origin: `Actor.old.${itemId(name)}` }] : [],
    flags: { plutonium: { page: 'spells', source: 'PHB', hash: identifier(name), spellClassNames: ['cleric'] }, dnd5e: { sourceId: `Compendium.dnd5e.spells.${identifier(name)}` } },
    _stats: { compendiumSource: `Compendium.dnd5e.spells.${identifier(name)}` },
    ownership: { default: 0 },
    folder: 'oldFolder',
  }
}

function equipment(name: string, type: string, options: { effects?: boolean } = {}) {
  return {
    _id: itemId(name),
    name,
    type,
    img: 'icons/svg/item-bag.svg',
    system: {
      identifier: identifier(name),
      description: { value: `<p>${name} complete item.</p>`, chat: '' },
      quantity: 1,
      uses: { spent: 0, max: type === 'consumable' ? 1 : '', recovery: [] },
      activities: {},
    },
    effects: options.effects ? [{ _id: 'effect0000000002', name: `${name} Effect`, origin: `Actor.old.${itemId(name)}` }] : [],
    flags: { plutonium: { page: 'items', source: 'PHB', hash: identifier(name) } },
    _stats: { compendiumSource: `Compendium.dnd5e.items.${identifier(name)}` },
  }
}

function feat(name: string, options: { effects?: boolean } = {}) {
  return {
    _id: itemId(name),
    name,
    type: 'feat',
    img: 'icons/svg/item-bag.svg',
    system: {
      identifier: identifier(name),
      description: { value: `<p>${name} complete feature.</p>`, chat: '' },
      activities: { use: { _id: 'utilityact000001', name, type: 'utility' } },
      uses: { spent: 0, max: '', recovery: [] },
    },
    effects: options.effects ? [{ _id: 'effect0000000003', name: `${name} Effect`, origin: `Actor.old.${itemId(name)}` }] : [],
    flags: { plutonium: { page: 'feats', source: 'PHB', hash: identifier(name) } },
    _stats: { compendiumSource: `Compendium.dnd5e.feats.${identifier(name)}` },
  }
}

function identifier(name: string): string {
  return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function itemId(name: string): string {
  return `${identifier(name).replace(/[^A-Za-z0-9]/g, '').padEnd(16, '0')}`.slice(0, 16)
}
