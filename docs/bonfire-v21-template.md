# Bonfire v2.1 Template

O template fixo `bonfire-v2.1` foi criado para importar fichas Bonfire em `.xlsx` sem depender da detecção genérica por aba ou região.

## Abas usadas

- `LOG`
- `Personagem`
- `Magias`

Todas as demais abas são tratadas como auxiliares e não entram no parser principal.

## Ordem de resolução

Cada campo do template segue esta ordem:

1. named range, quando o source começa com `=`
2. célula direta A1, quando o source é algo como `LOG!T7`
3. range A1, quando o source é algo como `Magias!C20:C49`

Se o named range não existir, o parser registra `NAMED_RANGE_NOT_FOUND` e usa apenas fallbacks explícitos do template.

## Campos principais

### Identidade

- `identity.name`: `=name`, fallback `LOG!C6`
- `identity.classText`: `=classAndLevel`, fallback `LOG!T5`
- `identity.race`: `LOG!T7`
- `identity.background`: `LOG!H11`, fallback `LOG!C11`

### Combate

- `proficiencyBonus`: `=proficiencyBonus`, fallback `LOG!T11`
- `attributes.ac`: `LOG!R12`, fallback `LOG!Q16`
- `attributes.hp.max`: `LOG!U16`, fallback `LOG!S16`
- `attributes.speed`: `LOG!Z12`, fallback `LOG!U16`
- `attributes.passivePerception`: `LOG!C45`, fallback `LOG!G45`

Os campos numéricos por célula usam validação de contexto. Se uma célula estiver perto do rótulo errado, ela é rejeitada e o parser segue para o fallback explícito.

### Atributos

O template tenta primeiro os named ranges:

- `strMod`, `dexMod`, `conMod`, `intMod`, `wisMod`, `chaMod`
- scores alternativos: `str`, `dex`, `con`, `int`, `wis`, `cha`, `strScore`, `dexScore`, `conScore`, `intScore`, `wisScore`, `chaScore`, `strength`, `dexterity`, `constitution`, `intelligence`, `wisdom`, `charisma`

Se só existir modificador e nenhum score alternativo, o parser bloqueia exportação com `ABILITY_SCORE_MISSING_MODIFIER_ONLY`.

### Equipamentos

Neste MVP, equipamentos vêm apenas de:

- `LOG!J60:J85`
- fallback explícito `LOG!P86:P92`

Cada célula não vazia vira um item apenas se passar na limpeza de valor.

### Magias

O parser usa somente nomes de magia na aba `Magias`.

- Truques: `M10:M14`, `W10:W14`, `AG10:AG14`
- Nível 1: `C20:C49`
- Nível 2: `R20:R49`
- Nível 3: `AG20:AG49`
- Nível 4: `C56:C85`
- Nível 5: `R56:R85`
- Nível 6: `AG56:AG85`
- Nível 7: `C92:C109`
- Nível 8: `R92:R109`
- Nível 9: `AG92:AG109`

Todas as magias importadas são marcadas como `prepared: true`.

## Debug

O painel de debug mostra:

- template usado
- abas usadas e ignoradas
- origem de cada campo (`namedRange`, `cell`, `range`)
- aba e endereço resolvidos
- valor bruto, valor parseado e status de aceitação

