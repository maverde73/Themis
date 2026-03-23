Una dashboard per la gestione delle segnalazioni secondo la **UNI/PdR 125:2022** non è un semplice raccoglitore di dati, ma uno strumento strategico che il **Comitato Guida** utilizza per monitorare la salute della cultura aziendale e l'efficacia dei sistemi di prevenzione.

Ecco come dovrebbe essere strutturata una dashboard funzionale e conforme, basata sui campi del modulo che hai fornito e sulle procedure della prassi:

### 1. Indicatori di Stato Operativo (Il "Pulsante di Allerta")
Questa sezione serve a garantire che l'azienda stia rispettando i tempi di gestione imposti dalla procedura [1, 2]:
*   **Totale segnalazioni ricevute:** Numero assoluto nell'anno solare.
*   **Stato della gestione:** Conteggio delle segnalazioni "Ricevute", "In Istruttoria", "Chiuse" o "Archiviate".
*   **Alert Tempi di Reazione:** Evidenziazione cromatica (es. in rosso) delle segnalazioni che hanno superato i **7 giorni lavorativi** senza una conferma di ricezione o una decisione di ammissibilità.[1, 2]
*   **Tempo medio di risoluzione:** Monitoraggio del rispetto del termine di **30-90 giorni** per la chiusura del caso.[3, 2]

### 2. Analisi Qualitativa (Tipologia e Luoghi)
Basandosi sui dati del modulo Google Forms [4], la dashboard deve visualizzare graficamente la natura dei fenomeni:
*   **Grafico a torta - Natura della condotta:** Distribuzione tra Molestie sessuali, Discriminazioni di genere, Mobbing, Linguaggio offensivo e Microaggressioni.[4] Questo grafico permette di capire se il problema aziendale è di natura relazionale (microaggressioni) o strutturale (discriminazioni di carriera).
*   **Grafico a barre - Luogo dell'evento:** Frequenza degli episodi in sede, da remoto (videocall), in trasferta o via chat.[4] Questo aiuta a capire se occorre intervenire sulla policy dello Smart Working o sulla vigilanza negli uffici.
*   **Andamento temporale:** Linea di tendenza per verificare se, a seguito di corsi di formazione (obbligatori per la PdR 125), le segnalazioni aumentano (indice di maggiore fiducia nel sistema) o diminuiscono.

### 3. Indicatori per l'Audit di Certificazione
Questi dati sono quelli che gli auditor Accredia chiederanno di vedere durante le verifiche annuali [5, 6]:
*   **Percentuale di segnalazioni anonime vs nominali:** Per valutare il livello di "psicosicurezza" dei dipendenti.[5]
*   **Numero di azioni correttive intraprese:** Quante segnalazioni hanno portato a provvedimenti reali (cambio turni, sanzioni, revisione procedure, formazione mirata).[1, 7]
*   **Esiti dell'istruttoria:** Quante segnalazioni sono state dichiarate "Fondate", "Infondate" o "In malafede".[8, 4]

### 4. Gestione della Riservatezza e Privacy (Requisiti Tecnici)
La dashboard non deve mai mostrare nomi o dettagli identificativi a chi non fa parte del Comitato Guida [9, 4]:
*   **Accessi profilati:** Solo il Responsabile della Parità di Genere deve poter cliccare sul dettaglio della descrizione.[4]
*   **Data Retention:** Un contatore che indichi la data di eliminazione definitiva dei dati (massimo **5 anni** dalla chiusura del caso come previsto dal tuo modulo e dalla prassi).[7, 4]

### Esempio di Mockup Visuale

| Widget | Visualizzazione | Scopo |
| :--- | :--- | :--- |
| **Semaforo Reclami** | Verde/Giallo/Rosso | Rispetto dei 7 giorni per la presa in carico. |
| **Mappa del Rischio** | Heatmap (Mappa di calore) | Identifica se gli abusi avvengono più in "sede" o "da remoto". |
| **Mix Tipologie** | Diagramma di Pareto | Identifica il 20% delle cause che genera l'80% dei disagi. |
| **Fiducia Canale** | % Ricontatti desiderati | Se molti chiedono di essere ricontattati, il canale è percepito come sicuro. |

In sintesi, la dashboard trasforma i dati grezzi del modulo in **informazioni per il miglioramento continuo**, permettendo al Comitato Guida di dimostrare agli auditor che l'azienda non si limita a "raccogliere fogli", ma gestisce attivamente il rischio di discriminazione.

L'accesso alle informazioni raccolte tramite il modulo di segnalazione e i sondaggi non è indiscriminato, ma segue una gerarchia di permessi basata sul principio di **minimizzazione dei dati** previsto dal GDPR e dalle linee guida UNI/PdR 125:2022.[1]

La dashboard per la gestione delle segnalazioni UNI/PdR 125:2022 trasforma i dati raccolti dal modulo in indicatori di efficacia del sistema di gestione. Non si limita a contare i casi, ma serve a dimostrare agli auditor Accredia che l'organizzazione presidia attivamente il rischio di abusi e discriminazioni.[1, 2]

Di seguito il dettaglio tecnico su calcoli, tempistiche e sistemi di allerta da implementare.

### 1. Tempistiche e Sistema di Allerta (Workflow Alert)
La prassi e le procedure operative standard impongono scadenze rigorose per evitare la percezione di impunità.[3, 4] La dashboard deve evidenziare cromaticamente (Verde/Giallo/Rosso) lo stato di avanzamento rispetto ai seguenti termini:

*   **Presa in carico (Ricezione):** Deve avvenire entro **7 giorni** dalla data di invio della segnalazione.[5, 4] L'allarme scatta al sesto giorno se la conferma di ricezione non è stata inviata al segnalante (se noto).
*   **Valutazione Ammissibilità:** Il Comitato Guida deve decidere se la segnalazione è fondata e attinente alla Parità di Genere entro **7-10 giorni lavorativi**.[6, 4]
*   **Chiusura Istruttoria:** L'indagine interna deve concludersi, di norma, entro **30 giorni**.[7, 4] Superato questo termine, la dashboard deve richiedere una motivazione obbligatoria per la proroga.
*   **Riscontro Finale:** Il segnalante deve ricevere l'esito definitivo e le eventuali misure adottate entro un termine massimo di **90 giorni**.[8, 5]

### 2. Calcoli e Metriche KPI della Dashboard
Per alimentare il monitoraggio periodico richiesto dalla prassi, la dashboard deve eseguire automaticamente i seguenti calcoli:

*   **Tempo Medio di Risoluzione (TMR):**
    $$TMR = \frac{\sum (\text{Data Riscontro Finale} - \text{Data Ricezione})}{\text{Numero totale segnalazioni chiuse}}$$
    Questo dato serve a misurare l'efficienza della governance.[4]
*   **Indice di Fiducia del Canale:** Percentuale di segnalazioni nominali rispetto a quelle anonime. Un aumento del dato nominale indica una crescita della fiducia nel sistema di tutela aziendale.[9, 10]
*   **Tasso di Fondatezza:** Rapporto tra segnalazioni dichiarate "fondate" e totale delle ricevute. Un valore troppo alto di segnalazioni "infondate" o "in malafede" può indicare la necessità di formazione specifica su cosa costituisca abuso.[2, 11]
*   **Incidenza Azioni Correttive:** Percentuale di casi che hanno generato un provvedimento (sanzione, cambio turno, formazione, revisione procedure) sul totale dei casi fondati.[2, 3]

### 3. Analisi Qualitativa e Visualizzazioni Strategiche
Basandosi sui campi del modulo di segnalazione, la dashboard deve offrire una "fotografia" dei rischi aziendali:[12]

*   **Heatmap dei Luoghi (Mappa del Rischio):** Visualizzazione dei luoghi dell'evento (es. "Sede", "Smart Working", "Trasferta").[12] Se le microaggressioni avvengono prevalentemente tramite chat o email, l'azienda deve intervenire sulla "Netiquette" e sulla policy digitale.[13, 14]
*   **Diagramma di Pareto per Tipologia:** Distribuzione tra Molestie sessuali, Discriminazioni, Mobbing e Linguaggio offensivo.[12] Questo grafico aiuta a identificare il "problema critico" su cui concentrare il budget formativo dell'anno successivo.[15, 16]
*   **Relazione con Testimoni:** Un widget che indica in quanti casi erano presenti testimoni. Se il valore è alto ma nessuno interviene, la dashboard segnala una criticità nella "cultura del bystander" (osservatore), richiedendo corsi di sensibilizzazione sulla responsabilità collettiva.[13, 17]

### 4. Privacy e Data Retention (Requisiti Tecnici)
La dashboard deve integrare controlli tecnici per garantire la conformità al GDPR e alla PdR 125:[18, 12]

*   **Data Retention Counter:** Un contatore di conservazione che indichi quanti giorni mancano all'eliminazione automatica dei dati. La conservazione massima è di **5 anni** dalla chiusura del caso.[3, 12]
*   **Oscuramento Dati Sensibili:** I membri del Comitato Guida che accedono alla dashboard statistica non devono poter cliccare sui dettagli narrativi del caso, a meno che non siano esplicitamente autorizzati per l'istruttoria.[6, 12]
*   **Log degli Accessi:** Registro immodificabile di chi ha consultato i dati, fondamentale per dimostrare l'integrità del sistema durante l'audit di certificazione.[1, 2]

In sintesi, questa dashboard non è solo un cruscotto operativo, ma la **memoria storica** del miglioramento continuo dell'azienda in ambito DEI (Diversità, Equità e Inclusione).[19, 16]

Esistono tre livelli distinti di visibilità, a seconda del ruolo ricoperto e della finalità della consultazione:

### 1. Primo Livello: Accesso Pieno (Responsabile della Parità)
Come specificato nel modulo che hai fornito, il/la **Responsabile per la Parità di Genere** è solitamente l'unico soggetto autorizzato ad accedere alle segnalazioni grezze e complete.[1]
*   **Cosa vede:** Il testo integrale della segnalazione, la data, il luogo e gli eventuali contatti o nomi se il segnalante ha scelto di non restare anonimo.[1]
*   **Ruolo:** Gestisce l'istruttoria iniziale, valuta l'ammissibilità e decide se attivare il Comitato Guida.[2]

### 2. Secondo Livello: Accesso Operativo (Comitato Guida)
Il **Comitato Guida** (composto solitamente dall'Amministratore Delegato, dal Direttore HR e da un delegato della proprietà) interviene nella fase di analisi e risoluzione.
*   **Cosa vedono:** Le informazioni necessarie per accertare i fatti e proporre azioni correttive.[3, 4] 
*   **Limitazioni:** Se la segnalazione è anonima, l'anonimato deve essere preservato anche nei loro confronti. In caso di **conflitto di interessi** (ad esempio se la segnalazione riguarda un membro del Comitato), quel componente deve essere escluso dalla consultazione di quel caso specifico.

### 3. Terzo Livello: Accesso Statistico (Alta Direzione e Auditor)
Questo è il livello tipico della **dashboard** di monitoraggio di cui parlavamo prima.
*   **Chi accede:** Il Board aziendale, il Collegio Sindacale o l'Organismo di Vigilanza (OdV), oltre agli auditor dell'Ente di Certificazione durante le verifiche annuali.[5, 6, 3]
*   **Cosa vedono:** Solo dati aggregati e anonimizzati (es. "In questo semestre abbiamo ricevuto 3 segnalazioni per linguaggio offensivo, tutte chiuse con successo"). Non hanno mai accesso ai dettagli narrativi che potrebbero identificare le persone coinvolte.[1]

### Sintesi delle responsabilità e restrizioni

| Figura | Livello di Dati | Vincoli di Riservatezza |
| :--- | :--- | :--- |
| **Responsabile Parità** | Totale (Dati identificativi + Fatti) | Segreto professionale e protezione dell'identità. [1] |
| **Comitato Guida** | Parziale (Solo i fatti per l'istruttoria) | Riservatezza assoluta; obbligo di astensione per conflitto. |
| **Investigatori designati** | Solo dati strettamente necessari | Designazione formale per singolo caso. [1] |
| **Management / Auditor** | Solo statistici (KPI e Dashboard) | Divieto di accesso ai fascicoli singoli. [6, 1] |

In conclusione, il sistema è progettato affinché nessuno, nemmeno il vertice aziendale, possa "curiosare" tra i dettagli delle segnalazioni a meno che non sia strettamente necessario per gestire legalmente il caso o applicare sanzioni disciplinari.[3, 4, 1]