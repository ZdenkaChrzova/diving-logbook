# Diving LogBook 1.0.0

Mobilní PWA aplikace pro evidenci ponorů a import dat z QR kódů SSI. Data zůstávají v prohlížeči uživatele.

## Funkce verze 1.0

- skenování SSI QR fotoaparátem,
- načtení QR z obrázku,
- ruční vložení textu QR,
- automatický převod data, času, délky, hloubky, lokality a podmínek,
- ruční doplnění závaží, buddyho, výstroje a poznámek,
- více obrázkových nebo PDF příloh,
- postupné mapování SSI Site ID na název lokality,
- seznam a detail ponorů,
- lokální statistiky,
- export a import kompletní JSON zálohy,
- instalace jako PWA.

## Nasazení na GitHub Pages

1. Vytvoř nový veřejný nebo soukromý repozitář.
2. Nahraj všechny soubory z této složky do kořene repozitáře.
3. V GitHubu otevři **Settings → Pages**.
4. V části **Build and deployment** zvol **Deploy from a branch**.
5. Vyber větev `main` a složku `/ (root)`.
6. Ulož nastavení a otevři adresu GitHub Pages.

Aplikace potřebuje HTTPS, aby mohla používat fotoaparát. GitHub Pages HTTPS poskytuje.

## Důležitá poznámka k QR skeneru

QR dekódování používá knihovnu `jsQR` načítanou z CDN. Po prvním úspěšném načtení ji může prohlížeč držet v cache, ale pro spolehlivý první start je potřeba internet. Pokud se knihovna nenačte, je možné vložit dekódovaný text QR ručně.

## Uložení dat

Data jsou v `localStorage` konkrétního prohlížeče a zařízení. Nejsou automaticky synchronizována do cloudu. Pravidelně používej **Nastavení → Exportovat JSON**.

Fotografie jsou ukládány jako Data URL. Kvůli limitům `localStorage` je v této verzi povolen soubor nejvýše 6 MB, ale praktický celkový limit prohlížeče může být nižší. V další verzi doporučujeme přechod na IndexedDB.

## Známé SSI mapování

- počasí: 1 Slunečno, 2 Zataženo, 3 Déšť, 4 Sníh
- vodní plocha: 13 Moře/oceán, 15 Lom
- voda: 4 Sladká, 5 Slaná
- vstup: 21 Pobřeží/pláž, 22 Loď
- proud: 6 Žádný, 7 Slabý, 8 Silný, 9 Extrémní

`diveType` se záměrně neukládá. Neznámá SSI pole zůstávají zachována v původním textu `qrRaw`.

## Struktura projektu

- `index.html` – obrazovky aplikace
- `styles.css` – responzivní vzhled
- `app.js` – datový model, QR import a logika
- `manifest.webmanifest` – PWA metadata
- `sw.js` – offline cache aplikace
- `icon.svg` – ikona

## Verze

1.0.0, 3. listopadu 2026
