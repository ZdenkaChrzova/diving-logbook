# Diving LogBook v1.9.0

Osobní potápěčský deník jako webová aplikace a instalovatelná PWA. Verze 1.9.0 přidává evidenci souřadnic potápěčských lokalit a samostatnou mapu lokalit.

## Novinky ve verzi 1.9.0

- nová položka **Mapa lokalit** v Nastavení pod **Databází lokalit**,
- zadávání souřadnic přímo v detailu lokality,
- vložení celého zápisu z SSI, například `50,00080° S, 14,76000° V`,
- automatický převod desetinné čárky a českých směrů `S`, `J`, `V`, `Z`,
- podpora alternativního zápisu s `N`, `E` a desetinnou tečkou,
- kontrola platného rozsahu souřadnic,
- zobrazení lokalit na mapě OpenStreetMap,
- shlukování blízkých značek,
- vyhledávání podle názvu lokality, země nebo oblasti,
- souhrn lokalit na mapě, bez souřadnic a celkem,
- detail značky s počtem ponorů a posledním ponorem,
- otevření lokality v externí navigaci,
- přechod z mapy přímo do úpravy lokality,
- seznam lokalit, kterým je potřeba souřadnice doplnit,
- uložení souřadnic do JSON zálohy.

## Zápis souřadnic

Doporučený formát převzatý ze SSI:

```text
50,00080° S, 14,76000° V
```

Podporované příklady:

```text
50,00080° S, 14,76000° V
50,00080 S, 14,76000 V
50.00080 N, 14.76000 E
50.00080, 14.76000
```

Souřadnice se interně ukládají jako číselné hodnoty:

```json
{
  "latitude": 50.0008,
  "longitude": 14.76,
  "coordinatesSource": "SSI"
}
```

Platné rozsahy:

- zeměpisná šířka: `-90` až `90`,
- zeměpisná délka: `-180` až `180`.

## Práce s mapou

1. Otevři **Nastavení → Databáze lokalit**.
2. Vyber lokalitu nebo založ novou.
3. Do pole **Souřadnice ze SSI** vlož celý zápis souřadnic.
4. Ulož lokalitu.
5. Otevři **Nastavení → Mapa lokalit**.
6. Klepnutím na značku zobraz detail lokality.

Mapa nabízí:

- vyhledávání lokalit,
- automatické přiblížení na dostupné značky,
- shlukování blízkých lokalit,
- úpravu vybrané lokality,
- otevření souřadnic v navigaci,
- přehled lokalit bez souřadnic.

## Mapové podklady a připojení

Mapa používá:

- **Leaflet 1.9.4** pro ovládání mapy,
- **Leaflet.markercluster 1.5.3** pro shlukování značek,
- **OpenStreetMap** jako mapový podklad.

Načtení mapové knihovny a mapového podkladu vyžaduje připojení k internetu. Data ponorů, lokalit a uložených souřadnic zůstávají v úložišti aplikace.

## Instalace a aktualizace

1. Před aktualizací vytvoř v aplikaci aktuální JSON zálohu.
2. Nahraj celý obsah balíčku verze 1.9.0 na hosting aplikace.
3. Nevynechávej nový soubor `map-localities.js`.
4. Zachovej používané obrázky a ikony, které nejsou součástí aktualizačního balíčku:
   - `favicon-192.png`,
   - `favicon-512.png`,
   - `apple-touch-icon.png`,
   - další stávající obrázky aplikace.
5. Otevři aplikaci online a dokonči nabídnutou aktualizaci.
6. Ověř, že aplikace zobrazuje verzi `v1.9.0`.

Pokud se po nasazení stále zobrazuje stará verze, zavři všechna okna aplikace, spusť ji znovu s připojením k internetu a použij nabídku aktualizace. Service worker verze 1.9.0 používá novou cache `diving-logbook-v1.9.0`.

## Soubory verze 1.9.0

- `index.html` – struktura aplikace a obrazovka mapy,
- `app.js` – hlavní logika aplikace a ukládání souřadnic,
- `map-localities.js` – parser souřadnic a logika mapy,
- `styles.css` – vzhled aplikace a mapy,
- `csv-import.js` – import ponorů z CSV,
- `settings-data-layout.js` – rozložení datových akcí v Nastavení,
- `service.js` – evidence servisu,
- `catalogs.js` – správa číselníků,
- `sw.js` – service worker a cache verze,
- `version.json` – informace o verzi a přehled změn,
- `manifest.webmanifest` – PWA manifest,
- `README.md` – dokumentace verze.

## Záloha a kompatibilita dat

- Existující lokality bez souřadnic zůstávají zachované.
- Existující ponory a vazby na lokality se nemění.
- Starší JSON zálohy bez souřadnic lze nadále importovat.
- Nové JSON zálohy obsahují `latitude`, `longitude`, `coordinatesSource` a `coordinatesUpdatedAt` u lokalit, kde jsou souřadnice vyplněné.
- Aktualizace nemění hodnoty uživatelských číselníků.

## Doporučený test po nasazení

1. Zkontroluj číslo verze `v1.9.0`.
2. Ověř položku **Mapa lokalit** pod **Databází lokalit**.
3. U jedné testovací lokality vlož `50,00080° S, 14,76000° V`.
4. Lokalitu ulož a znovu otevři, souřadnice musí zůstat zachované.
5. Otevři mapu a ověř značku testovací lokality.
6. Ověř detail značky a tlačítko **Navigovat**.
7. Exportuj JSON zálohu a ověř, že po jejím importu souřadnice zůstaly zachované.

## Verze

- aplikace: **1.9.0**
- datum vydání: **23. 11. 2026**

### Verze 1.10.1
- Jednotné tlačítko **×** ve všech vyhledávacích polích.
- Na mobilu dotyková plocha 40 × 40 px.
- Tlačítko se ukáže pouze po zadání textu a okamžitě obnoví celý seznam.
- Zachována migrace a ukládání do IndexedDB z verze 1.10.0.

### Verze 1.10.2
- Tlačítko **×** je menší a odsazené 9 px od pravého okraje.
- Na mobilu má průměr 32 px a nepřesahuje rámeček vyhledávacího pole.

### Verze 1.10.3
- Tlačítko **×** je na mobilu posunuté mírně níže, aby bylo opticky vystředěné ve vyhledávacím poli.
- Velikost 32 px a odsazení 9 px od pravého okraje zůstávají zachované.
