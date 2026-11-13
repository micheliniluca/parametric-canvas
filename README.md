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
| R / C | Rettangolo / Cerchio (trascina; Shift = quadrato) |
| T | Testo: clic e scrivi; doppio clic su un testo per modificarlo |
| I | Profilo: scegli nel catalogo (si apre da solo) e clicca sulla tela per inserirlo |
| N | Bollino numerato: ogni clic sulla tela aggiunge il numero successivo, fino a Esc o a un altro strumento |
| K | Scala con due punti (clic su due punti dell'immagine, poi la misura reale) |
| Ctrl+L | Blocca / sblocca l'oggetto selezionato |
| B | Bullone: clic per inserirlo; diametro, classe, vista (testa, dado, foro, sezione) e ripetizione nel pannello |
| Q / M | Quota / Misura |
| S / O / G | Attiva SNAP / ORTO / GRIGLIA |
| Ctrl (tenuto) / Shift (tenuto) | Snap / ortogonale temporanei |
| Ctrl+Z / Ctrl+Y | Annulla / Ripeti |
| Ctrl+C / Ctrl+V / Ctrl+D | Copia / Incolla (oggetti, immagini o testo; anche dal pulsante Incolla) / Duplica |
| Ctrl+S / Ctrl+O | Salva / Apri progetto (`.pcanvas.json`) |
| Ctrl+0, + / − | Adatta alla vista, zoom |
| Frecce (Shift) | Sposta di 1 (10) |
| Canc | Elimina |
| Esc | Torna alla selezione |
| Tasto centrale | Sposta la vista |

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
  utils/export.ts      export SVG / DXF / STL
  profiles.ts          catalogo profili: caricamento, ricerca, compatibilità con i nomi dei vecchi disegni
  data/profiles.json   database profili Maffeis (generato dal CSV, vedi sotto)
  beamPath.ts          geometria delle sezioni (I, U, L, T, tubolari) e viste laterali
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
