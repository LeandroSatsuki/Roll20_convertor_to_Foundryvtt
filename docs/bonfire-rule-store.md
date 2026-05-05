# Bonfire Rule Store

O Rule Store e uma base local de regras Bonfire usada pelo conversor para funcionar offline. A fonte principal de curadoria e o World Anvil do Bonfire Tales, especialmente a categoria de jogadores:

https://www.worldanvil.com/w/bonfire-tales-rpg-bonfire-tales/c/jogadores-category

O app nao faz scraping em runtime. Regras novas devem entrar como seeds revisados ou overrides locais.

Tipos de seed:

- Seed local do projeto: arquivos em `data/bonfire` e seeds TypeScript em `src/lib/rules/bonfireSeedRules.ts`.
- Seed manual: dados resumidos importados por revisao humana a partir de artigos World Anvil.
- Override local: escolhas feitas pelo usuario para resolver nomes ambíguos, baixadas como `user-overrides.local.json`.

As entidades sao indexadas por identifier, nome normalizado, aliases, kind, classe, subclasse, raca, nivel, tags e URL de fonte.

Descricoes dos items Foundry:

- Quando uma regra tem `description`, ela vira a descricao principal do item exportado.
- Quando a regra tem apenas `shortDescription`, o conversor usa esse resumo como fallback seguro.
- Quando a regra nao tem texto, mas tem `sourceUrl`, o item recebe um fallback orientando a consultar a fonte Bonfire Tales.
- Quando a regra e uma magia com ajuste Bonfire, o item recebe um bloco adicional `Ajuste Bonfire` na descricao.

Esses casos aparecem na auditoria como:

- `RULE_DESCRIPTION_MISSING`
- `RULE_DESCRIPTION_FALLBACK_USED`
- `SPELL_OVERRIDE_DESCRIPTION_APPLIED`
