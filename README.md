# Diving LogBook 1.4.1

Mobilní PWA aplikace pro evidenci ponorů a import dat z QR kódů SSI. Data zůstávají uložená v prohlížeči uživatele a nejsou automaticky odesílána do cloudu.

## Funkce verze 1.4.1

- skenování SSI QR kódu fotoaparátem,
- načtení QR kódu z obrázku,
- ruční vložení textu QR,
- automatický převod data, času, délky ponoru, hloubky, lokality a podmínek,
- ruční doplnění závaží, buddyho, výstroje a poznámek,
- více obrázkových nebo PDF příloh,
- postupné mapování SSI Site ID na název lokality,
- seznam a detail ponorů,
- lokální statistiky,
- export a import kompletní JSON zálohy,
- export ponorů do CSV pro Excel a další tabulkové aplikace,
- import ponorů z CSV s kontrolou povinných údajů, chyb a duplicit,
- postupné načítání seznamu ponorů po 50 položkách,
- automatická kontrola nové verze a historie změn,
- instalace jako PWA a offline cache aplikace.

### Oprava ve verzi 1.4.1

- opraveno načítání tlačítek pro CSV import a export,
- skripty `csv-import.js` a `settings-data-layout.js` se nyní načítají přímo z `index.html` ve správném pořadí,
- aktualizována mezipaměť PWA, aby se oprava spolehlivě projevila po nasazení.

## Nasazení na GitHub Pages

1. Vytvoř nový veřejný nebo soukromý repozitář.
2. Nahraj všechny soubory z této složky do kořene repozitáře.
3. V GitHubu otevři **Settings → Pages**.
4. V části **Build and deployment** zvol **Deploy from a branch**.
5. Vyber větev `main` a složku `/ (root)`.
6. Ulož nastavení a po dokončení nasazení otevři adresu GitHub Pages.

Aplikace potřebuje HTTPS, aby mohla používat fotoaparát. GitHub Pages HTTPS poskytuje.

Po nasazení verze 1.4.1 může být kvůli starší PWA cache potřeba aplikaci jednou zavřít a znovu otevřít. Pokud by se stále zobrazovala starší verze, obnov stránku bez použití cache nebo aplikaci odinstaluj a znovu nainstaluj.

## Důležitá poznámka k QR skeneru

QR dekódování používá knihovnu `jsQR` načítanou z CDN. Po prvním úspěšném načtení ji může prohlížeč držet v cache, ale pro spolehlivý první start je potřeba připojení k internetu. Pokud se knihovna nenačte, je možné vložit dekódovaný text QR ručně.

## Uložení a zálohování dat

Data jsou uložená v `localStorage` konkrétního prohlížeče a zařízení. Nejsou automaticky synchronizována do cloudu.

Pravidelně používej:

- **Nastavení → Exportovat JSON** pro kompletní zálohu a případné obnovení aplikace,
- **Nastavení → Exportovat CSV** pro práci s přehledem ponorů v Excelu nebo jiné tabulkové aplikaci.

CSV slouží především pro tabulkový přenos údajů o ponorech. Pro úplnou zálohu všech dat aplikace včetně její interní struktury používej JSON.

Fotografie jsou ukládány jako Data URL. Kvůli limitům `localStorage` je povolen soubor nejvýše 6 MB, ale praktický celkový limit prohlížeče může být nižší. Pro budoucí verzi je vhodný přechod na IndexedDB.

## Import a export CSV

- Export vytvoří CSV soubor s údaji o ponorech.
- Import kontroluje povinné údaje, chyby a možné duplicity.
- Importované ponory se přidávají ke stávajícím datům.
- Před větším importem doporučujeme vytvořit kompletní JSON zálohu.

## Známé SSI mapování

- počasí: 1 Slunečno, 2 Zataženo, 3 Déšť, 4 Sníh
- vodní plocha: 13 Moře/oceán, 15 Lom
- voda: 4 Sladká, 5 Slaná
- vstup: 21 Pobřeží/pláž, 22 Loď
- proud: 6 Žádný, 7 Slabý, 8 Silný, 9 Extrémní

`diveType` se záměrně neukládá. Neznámá SSI pole zůstávají zachována v původním textu `qrRaw`.

## Struktura projektu

- `index.html` – obrazovky aplikace a načtení skriptů,
- `styles.css` – responzivní vzhled,
- `app.js` – datový model, QR import a hlavní logika,
- `csv-import.js` – export a import ponorů ve formátu CSV,
- `settings-data-layout.js` – rozložení datových akcí v Nastavení,
- `manifest.webmanifest` – PWA metadata,
- `sw.js` – offline cache a aktualizace PWA,
- `version.json` – aktuální verze a historie změn,
- `favicon-192.png`, `favicon-512.png`, `apple-touch-icon.png` – ikony aplikace.

## Verze

**1.4.1, 11. listopadu 2026**

Oprava zobrazení CSV importu a exportu a aktualizace PWA cache.
