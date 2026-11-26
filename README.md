# Parametric Canvas

Lavagna infinita per schizzi tecnici: si incollano screenshot, si disegna sopra a mano libera e si inseriscono elementi "intelligenti" con proprietà (profili in acciaio, bullonature, quote, bollini), come in un BIM leggero.

```bash
npm install
npm run dev
```

## Interfaccia

| Zona | Contenuto |
|---|---|
| Barra in alto | file (nuovo, apri, salva), annulla/ripeti, strumenti, azioni sull'oggetto selezionato, screenshot |
| Barra stili (flottante) | colore linea, riempimento, spessore, tipo linea. Senza selezione imposta lo stile dei prossimi oggetti, con selezione modifica l'oggetto |
| Pannello a destra | proprietà dell'oggetto selezionato, catalogo profili, esportazione |
| Barra di stato | SNAP / ORTO / GRIGLIA, passo griglia, coordinate, zoom, suggerimento dello strumento attivo |

## Scorciatoie

| Tasto | Azione |
|---|---|
| V | Seleziona |
| Ctrl+clic | Aggiunge o toglie un oggetto dalla selezione |
| Trascina sulla tela | Riquadro di selezione: verso destra seleziona gli oggetti interamente dentro, verso sinistra anche quelli toccati |
| Ctrl+A | Seleziona tutto (esclusi gli oggetti bloccati) |
| Ctrl+G / Ctrl+Shift+G | Raggruppa / separa il gruppo |
| Alt+clic | Seleziona un solo oggetto dentro un gruppo |
| D | Mano libera (resta attiva, Esc per uscire) |
| L / P / A | Linea / Polilinea / Freccia |
| R / C | Rettangolo: clic sui due vertici della diagonale (o trascina) / Cerchio: trascina; Shift = quadrato |
| T | Testo: clic e scrivi; doppio clic su un testo per modificarlo; linea di richiamo dal pannello, con due maniglie: la punta della freccia e il gomito, che sposta il testo; terminale e spessore regolabili |
| I | Profilo: scegli nel catalogo (si apre da solo) e clicca sulla tela per inserirlo |
| N | Bollino numerato: ogni clic sulla tela aggiunge il numero successivo, fino a Esc o a un altro strumento |
| K | Scala con due punti (clic su due punti dell'immagine, poi la misura reale) |
| Ctrl+L | Blocca / sblocca l'oggetto selezionato |
| B | Bullone: clic per inserirlo; diametro, classe, vista (testa, dado, foro, sezione) e ripetizione nel pannello |
| J | Vite: clic dove entra nel materiale; autoperforanti (ISO 15480/15481/15482), autofilettanti (ISO 1479/7049/7050), legno (EN 14592), tirafondi (DIN 571), cartongesso, Aquapanel Maxi Screw, calcestruzzo; vista laterale o dalla testa, diametro, lunghezza, testa, punta, impronta, rondella EPDM |
| H | Lamiera grecata (ComFlor 46, 60, 80, 100): clic su inizio e fine dell'appoggio, la linea è la larghezza; viste sezione, dall'alto e laterale, spessore, getto opzionale con retino, pioli Ø19 nelle gole, n° lamiere, pioli, peso e volume calcestruzzo nel pannello |
| F | Cavo FLC (catalogo Redaelli): clic sul perno A, clic sul perno B; taglia, forcelle TTF accese/spente per estremità, interasse, peso e resistenze nel pannello |
| W | Saldatura (ISO 2553 o AWS A2.4): clic sul giunto, clic dove va la linea di riferimento; tipo (angolo, I, V, mezza V, Y, mezza Y, U, J; su due lati X, K…), lato, quote, a tratti, tutto intorno, in opera, finitura, coda con procedimento e testo libero; cordone pieno in scala sulla punta della freccia |
| Y | Persona in scala: clic dove poggia i piedi; figura dal menu (operai con casco, pala, sacco, in ginocchio, con scala; pubblico: uomo, donna, bambino, anziano, carrozzina, con borsa; tifosi con braccia alzate, sciarpa, bandiera, seduti), frontali o di profilo; altezza 1,80 m variabile, verso, sagoma piena anche nel DXF (layer PERSONE) |
| E | Involucro in sezione: clic su inizio e fine della faccia d'appoggio; isolante (retino a spirale), pannello sandwich (parete piana o copertura grecata, giunti) vetro (composizione tipo 6/16/6, 33.1/16/6, con distanziatori) o parete Knauf Aquapanel Outdoor (rasatura, lastra 12,5, Tyvek, montanti C MgZ con isolante, orditura singola o doppia, lastre interne); spessore e lato nel pannello |
| U | Copertura aggraffata (standing seam) in sezione: clic su inizio e fine del piano di posa; doppia aggraffatura, angolare o a scatto, altezza nervatura e passo di posa |
| Q / M | Quota (frecce o trattino obliquo alle estremità, nel pannello) / Misura |
| S / O / G | Attiva SNAP / ORTO / GRIGLIA |
| Ctrl (tenuto) / Shift (tenuto) | Snap / ortogonale temporanei |
| Ctrl+Z / Ctrl+Y | Annulla / Ripeti |
| Ctrl+C / Ctrl+V / Ctrl+D | Copia / Incolla (oggetti, immagini o testo; anche dal pulsante Incolla) / Duplica |
| Retino (pannello) | Rettangoli, cerchi e poligoni chiusi: 21 retini di materiali (calcestruzzo, c.a., acciaio, legno, laterizio pieno e forato, blocchi, pietra, terreno, ghiaia, sabbia, magrone, riporto, isolante rigido, lana minerale, intonaco, cartongesso, vetro, impermeabilizzazione, acqua) con scala e angolo; nel DXF esplosi in linee sul layer RETINI |
| Pulsante Specchia | Specchia la selezione sinistra ↔ destra (con la rotazione di 180° si ottiene alto ↔ basso) |
| Ctrl+S / Ctrl+O | Salva / Apri progetto (`.pcanvas.json`) |
| Ctrl+0, + / − | Adatta alla vista, zoom |
| Frecce (Shift) | Sposta di 1 (10) |
| Canc | Elimina |
| Esc | Torna alla selezione |
| Tasto centrale, Spazio + trascina | Sposta la vista |
| Invio | Modifica il testo selezionato (chiude polilinea e scontorno) |

**Con la penna grafica**: il tasto laterale della penna tenuto premuto sposta la vista, il doppio tocco
chiude polilinea e scontorno, le maniglie diventano più grandi e la mano libera segue la pressione.

Il disegno viene salvato automaticamente nel browser (IndexedDB) e ripristinato alla riapertura.
Con più oggetti selezionati il pannello mostra il riepilogo, i comandi di gruppo e allinea / distribuisci.

Per fare prove senza toccare il disegno salvato si può aprire l'app con `?sandbox` nell'indirizzo
(es. `http://localhost:5173/?sandbox`): usa un autosalvataggio separato.

## Struttura del codice

```
src/
  App.tsx              stato dell'app, file, appunti, scorciatoie
  Canvas.tsx           interazioni col puntatore e strumenti
  canvas/
    geometry.ts        snap, centri, ingombri, traslazione e scala (funzioni pure)
    ObjectView.tsx     disegno di ogni tipo di oggetto
    SelectionOverlay.tsx  riquadro di selezione e maniglie
    Overlays.tsx       pannelli bacchetta magica, misura, scala
    TextEditor.tsx     modifica del testo direttamente sulla tela
  Toolbar.tsx, StyleBar.tsx, StatusBar.tsx, RightPanel.tsx
  tools.ts             elenco strumenti (icona, scorciatoia, suggerimento)
  style.ts             palette e stile corrente
  hooks/useHistory.ts  annulla/ripeti
  utils/project.ts     salvataggio su file e autosalvataggio
  utils/export.ts      export DXF (R12, layer per tipo, colori ACI)
  utils/pathToPolylines.ts  tracciati SVG → polilinee (archi e curve suddivisi)
  profiles.ts          catalogo profili: caricamento, ricerca, compatibilità con i nomi dei vecchi disegni
  data/profiles.json   database profili Maffeis (generato dal CSV, vedi sotto)
  beamPath.ts          geometria delle sezioni (I, U, L, T, tubolari) e viste laterali
  utils/weldUtils.ts   simboli di saldatura ISO/AWS e cordone in sezione
  utils/envelopeUtils.ts  involucro in sezione: isolante, pannello sandwich, vetro, Aquapanel, copertura aggraffata
  utils/screwUtils.ts  viti: dimensioni normalizzate, vista laterale e dalla testa
  utils/peopleUtils.ts  sagome di persone in scala (catalogo frontale e di profilo)
  utils/hatchUtils.ts  retini dei materiali: moduli ripetibili e ritaglio per l'export DXF
  utils/boltUtils.ts   dimensioni ISO dei bulloni, viste, lunghezza, conversione dei vecchi disegni
  icons.tsx            icone tecniche (bullone, IPE, quota ISO)
```

## Catalogo profili

Il catalogo viene dal database profili Maffeis (CSV). Per aggiornarlo:

```bash
node scripts/import-profiles.mjs "C:\percorso\profiles.csv"
```

Lo script rigenera `src/data/profiles.json` tenendo solo codice Maffeis, nome Tekla, nome commerciale,
forma, dimensioni per il disegno e peso al metro (le caratteristiche d'inerzia non servono al sito).
Il file viene caricato a parte dopo l'apertura, quindi non rallenta l'avvio.
