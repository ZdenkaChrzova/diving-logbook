# Diving LogBook 1.11.0a-dev1c

Opravný patch nad 1.11.0a-dev1b pro mobilní Safari a instalovanou PWA.

## Oprava
Obě pole Země používají nativní `<select>`, protože `<datalist>` není v mobilním Safari/PWA spolehlivý. Seznam se plní z aktivních položek číselníku Země.

## Test
1. Přidej ve Správě číselníků novou zemi.
2. Otevři Databáze lokalit → Přidat.
3. Ověř novou zemi ve výběru Země.
4. Totéž ověř při ručním založení ponoru.
