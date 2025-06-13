
// To run this script:
// 1. Ensure you have tsx installed: npm install -D tsx
// 2. Set up your .env.local with MONGODB_URI
// 3. Run: npm run seed  (or npx tsx src/scripts/seed.ts directly if script not in package.json)

import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' }); // Load environment variables from .env.local

const exampleFaqs = [
  {
    _id: new ObjectId(),
    question: "Come posso cambiare cliente durante l'inserimento di un Movo o prenotazione?",
    answer: "Per cambiare cliente ti basta entrare nella funzione cliente o conducente e selezionarne un'altra anagrafica o inserirne una nuova.",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: new ObjectId(),
    question: "Come inserisco un movo in noleggio o in comodato?",
    answer: "Vai in Movo (https://dashboard.movolab.it/dashboard/movimenti) e clicca Apri Movo. Seleziona il Flusso, il Tipo movimento (noleggio o comodato) e il Gruppo Veicolo. Poi inserisci data e punto nolo di consegna, e data e punto nolo di ritiro. Aggiungi il conducente e il cliente e premi \"Cerca e continua\". Per cambiare l'anagrafica del cliente (o conducente) durante l'inserimento, vai nella tab di inserimento cliente (o conducente) e premi il tasto con la matitina per modificare l'anagrafica esistente. Scegli il listino, la fascia e se vuoi lo sconto. Scegli il veicolo e premi \"Continua\" in alto a destra. Nella schermata di Apertura aggiorna i dati del movo: i km iniziali ed il livello di carburante, eventuali danni non registrati, eventuali extra (abbattimento franchigie o accessori) scelti dal cliente. Poi premi Apri Movo e dopo il bottone Firma per far firmare la lettera di noleggio al cliente (con OTP, firma su dispositivo o stampa per firma olografa). A fine noleggio, premi \"Chiusura Movo\" e aggiorna la data e l'ora finale ed i km del veicolo. Aggiungi eventuali Extra o Franchigie da addebitare al cliente (es: lavaggio o altro). Nel \"Calcolo Prezzo\" hai i dettagli di quanto deve pagare il cliente. Clicca su \"Chiudi Movo\" e a destra appare la tab per fatturare e per incassare. Vedi il video tutorial (https://movolab.it/tutorials/tutorial-movo/)",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: new ObjectId(),
    question: "Come aggiungo un cliente Azienda nel sistema?",
    answer: "Se sei nella funzione Cliente, vai nella tab Aziende e clicca il tasto in alto \"Aggiungi Azienda\". In alternativa, quando inserisci una prenotazione o un nuovo movimento, seleziona \"Aziende\" dal menu in alto a destra durante l'inserimento del Cliente.",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: new ObjectId(),
    question: "Prezzi Pack PRO MAX",
    answer: "Moduli e Servizi Offerti: 1. Attivazione e Formazione: Corrispettivo Base: Gratuito. Include: Attivazione dell’app. Formazione. Corrispettivo Extra: Formazione aggiuntiva per sessione: € 150,00 + IVA tramite videocall. € 400,00 + IVA presso la tua Azienda. 2. Moduli Funzionali e Servizi: Corrispettivo Base: € 150,00 al mese + IVA. Include: Fino a 2 punti noleggio. Fino a 40 veicoli. Utenti illimitati per punto noleggio. Assistenza online. Manutenzione dell’app. Modulo Amministrazione con: Gestione fatturazione diretta da parte della tua Azienda. Attivazione partitario per numerazione fatture della tua Azienda. Creazione ed estrazione file XML per la fatturazione elettronica. Corrispettivo Extra: Aggiunta di punti noleggio: € 20,00 al mese + IVA per ogni punto noleggio aggiunto. Aggiunta di veicoli: € 4,00 al mese + IVA per ogni veicolo aggiunto.",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: new ObjectId(),
    question: "Prezzi PACK PRO",
    answer: "Moduli e Servizi Offerti: 1. Attivazione e Formazione: Corrispettivo Base: Gratuito. Include: Attivazione dell’app. Formazione. Corrispettivo Extra: Formazione aggiuntiva per sessione: € 150,00 + IVA tramite videocall. € 400,00 + IVA presso la tua Azienda. 2. Moduli Funzionali e Servizi: Corrispettivo Base: € 70,00 al mese + IVA. Include: Fino a 1 punto noleggio. Fino a 10 veicoli. Utenze per punto noleggio. Assistenza online. Manutenzione dell’app. Modulo Amministrazione con: Gestione fatturazione diretta da parte della tua Azienda. Attivazione partitario per numerazione fatture della tua Azienda. Creazione ed estrazione file XML per la fatturazione elettronica. Corrispettivo Extra: Aggiunta di punti noleggio: € 20,00 al mese + IVA per ogni punto noleggio aggiunto. Aggiunta di veicoli: € 4,00 al mese + IVA per ogni veicolo aggiunto.",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: new ObjectId(),
    question: "Is it possible to completely delete a price list (listino) in Movolab?",
    answer: "No, it is not possible to completely delete a price list in Movolab. However, you can mark it as 'annullato' (canceled) by editing the price list and updating its status in the 'Generale' section.",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: new ObjectId(),
    question: "Is the Movolab app available in app stores?",
    answer: "No, the Movolab app is not yet available in app stores. We are currently working on its development and will announce when it becomes available. Ma Movolab è una applicazione responsive e può essere già utilizzata su smartphone e tablet.",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: new ObjectId(),
    question: "COME FACCIO AD UTILIZZARE L'APPLICAZIONE SU telefono o tablet?",
    answer: "Movolab è una applicazione responsive e può essere già utilizzata su smartphone e tablet. Per gestire al meglio le funzioni disponibili consigliamo, in caso di dispositivi mobili, di utilizzarla su Tablet.",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: new ObjectId(),
    question: "How do I close a movement in the Movolab dashboard?",
    answer: "To close a movement in Movolab: 1. Go to Movo dashboard (https://dashboard.movolab.it/dashboard/movimenti) 2. Search for the open movement you want to close 3. Click on 'Details' 4. Click on 'Chiusura Movo' (Movo Closure) 5. Fill in any necessary information about damages, fuel, and any extras or deductibles to be charged 6. Click 'Chiudi Movo' (Close Movo) 7. After closure, a tab will appear on the right for billing and payment processing For a detailed visual guide, you can watch the tutorial video at: https://movolab.it/tutorials/tutorial-movo/",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: new ObjectId(),
    question: "Come attivo CARGOS",
    answer: "Se usi la tua licenza di noleggio, per gestire la comunicazione dei dati identificativi riportati nel documento di identità esibito dal soggetto che richiede il noleggio di un veicolo nella piattaforma CarGOS (come previsto dal Decreto Legge 4 ottobre 2018, n. 113), basta entrare nella funzione in Admin/Cargos (https://dashboard.movolab.it/settings/cargos) e inserire le proprie credenziali CarGos. Il sistema provvederà in automatico a inviare i dati. Nella maschera, trovi anche tutti i dettagli del singolo invio dei dati.",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: new ObjectId(),
    question: "Come inserire una prenotazione?",
    answer: "Puoi inserire una prenotazione di un noleggio o di un comodato dal Calendario oppure dalla funzione “Prenotazioni” (https://dashboard.movolab.it/dashboard/prenotazioni) e clicca su Nuova Prenotazione. Seleziona Flusso, Tipo movimento (noleggio o comodato) e Gruppo Veicolo . Poi inserisci data e punto nolo di consegna e data e punto nolo di ritiro. Inserisci conducente e cliente anche con il solo nominativo e telefono oppure con la procedura di selezione o caricamento. Premi Cerca e Continua e scegli listino, fascia e se vuoi lo sconto Scegli il veicolo dall’elenco e premi “Continua” in alto a destra. nella schermata di Apertura trovi tutte le info la tab “Calcolo Prezzo” con quanto deve pagare il cliente. Se tutto ok, premi “Apri prenotazione”. Nella prenotazione aperta trovi, in alto a destra, i bottoni: - \"No Show\" nel caso il cliente non si presenti a ritirare il veicolo - \"Stampa\" per stampare la prenotazione, inviarla via mail al Cliente o farla firmare dal Cliente (ad es. prenotazione prepagata) - \"Annulla prenotazione\" per annullarla - \"Apri Movo\" per aprire il noleggio dalla prenotazione. ecco video tutorial (https://movolab.it/tutorials/prenotazioni/)",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: new ObjectId(),
    question: "Che cosa sono i Flussi?",
    answer: "Con i Flussi (https://dashboard.movolab.it/settings/flussi) puoi personalizzare la gestione delle prenotazioni e dei movimenti. Nella funzione trovi dei Flussi standard preimpostati ma puoi crearne uno premendo “Aggiungi Flusso”. Inizia scegliendo il nome ed una descrizione. poi devi abbinare uno o più listini di noleggio ed uno o più punti nolo (combinando listini e punti nolo potresti creare ad esempio tariffe diverse ad esempio per località.) Poi, nei Dati Extra, se vuoi, puoi creare dei campi dedicati per ricordarti di recuperare informazioni dal cliente in fase di prenotazione o noleggio e nella Tab Configurazione, puoi definire il tempo entro il quale scatta il giorno successivo nel noleggio. Premendo avanti, puoi gestire altre personalizzazioni come ad esempio: - impostare un pagamento anticipato in prenotazioni o noleggio - attivare la richiesta del deposito in fase di apertura movimento - ed altre personalizzazioni. Infine puoi selezionare un Cliente che hai convenzionato per semplificare la sua gestione in fase di apertura della prenotazione o del movimento. ecco il video tutorial per inserire un Flusso (https://movolab.it/tutorials/tutorial-flussi/)",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: new ObjectId(),
    question: "Come inserisco un veicolo?",
    answer: "Vai in Veicoli (https://dashboard.movolab.it/dashboard/veicoli/flotta) e premi Aggiungi. Serve la scansione o file \"pdf\" della Carta di Circolazione ed in caso i dati del contratto di noleggio a lungo termine. Inserisci targa, marca, modello e versione ed i dati principali del veicolo e, se vuoi, anche la foto. Inserisci i dati di acquisto e i dati dei servizi attivi sul veicolo, come l'Assicurazione Incendio e Furto, RCA e Kasko con relative franchigie. Abbina il veicolo ad un punto nolo. Inserisci eventuali danni del veicolo. Allega la Carta di Circolazione dalle cartelle del PC oppure se stai con dispositivo mobile, facendo direttamente una foto al documento. Per poterlo utilizzare basta abilitarlo premendo \"Modifica\" e mettere su ON il tasto on-off e poi dichiarare che il veicolo che stai caricando è immatricolato per la locazione senza conducente e che, in caso di acquisto in noleggio a lungo termine, abbia la deroga alla sublocazione. Puoi anche disabilitarlo per manutenzione o per dismissione o altro motivo. Qui trovi il video tutorial per caricare un veicolo nel sistema ( https://movolab.it/tutorials/veicoli/)",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: new ObjectId(),
    question: "Cos'è il Calendario?",
    answer: "il Calendario è una funzione molto utile che ti consente di avere una fotografia sempre chiara e aggiornata dei tuoi veicoli e dei tuoi punti nolo. Puoi entrare qui (https://dashboard.movolab.it/dashboard/calendario) per utilizzarlo. Puoi creare prenotazioni o movimenti direttamente dal calendario selezionando automaticamente punto di noleggio, auto, data di inizio e data di fine. Poi nel pop-up inserisci il conducente, il cliente e selezioni il listino e premendo continua vai alla maschera di dettaglio per aprire il movo o la prenotazione. Puoi muoverti nel tempo con i tasti in alto a sinistra e scegliere la modalità di visualizzazione che preferisci come la vista della giornata a 12 ore, 24 ore e la vista orizzontale settimanale, a quindici giorni e mensile. Puoi capire subito, grazie alla colorazione in rosso della tab, se ci sono criticità come ad esempio un veicolo non disponibile per un movo scaduto. Puoi anche spostare una Prenotazione da un veicolo ad un altro per tue esigenze operative di gestione flotta o per una richiesta di un particolare modello di veicolo da parte del tuo cliente. ecco il video tutorial (https://movolab.it/tutorials/calendario/)",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: new ObjectId(),
    question: "Posso creare un Punto Nolo aggiuntivo rispetto a quelli previsti massimi previsti nel PACK",
    answer: "Si puoi creare, attivare e disattivare nell’apposita funzione un Punto Nolo quando vuoi. (https://dashboard.movolab.it/settings/puntinolo ) Se previsto dal tuo PACK pagherai un corrispettivo aggiuntivo ma solo quando è attivo (es. se attivi un punto nolo solo per la stagione estiva, ad esempio, per tre mesi l’addebito riguarderà solo il periodo in cui è rimasto attivo)",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: new ObjectId(),
    question: "Creare un Punto Nolo",
    answer: "Vai in Admin, Punti nolo (https://dashboard.movolab.it/settings/puntinolo ) e clicca su pulsante “Aggiungi” : Inserisci il “nome commerciale” che vedranno i clienti nelle lettere di noleggio che può essere anche diverso dalla tua ragione sociale. Inserisci la via o le coordinate geografiche per ottenere la posizione esatta. Aggiungi un telefono e una mail del Punto Nolo. nella tab “Orari di Apertura“ dove trovi il default che il sistema crea automaticamente ma che puoi aggiornare in base alle tue esigenze operative. nella tab “Orari di Chiusura” per inserire le festività o eventuali giornate di chiusura. Puoi configurare un tempo in cui il veicolo torna disponibile dopo una prenotazione e inserire le Informazioni di Ritiro che riceverà il tuo cliente nella mail di conferma della prenotazione. Nella tab “Veicoli” troverai i veicoli abbinati al Punto Nolo come base di partenza dalla funzione \"Veicolo\" nella dashboard. Infine, puoi disabilitare o abilitare il punto nolo con il bottone on off in alto a destra. ecco il video tutorial (https://movolab.it/tutorials/puntinolo/)",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: new ObjectId(),
    question: "Come posso creare un nuovo Movo attraverso la piattaforma?",
    answer: "Per creare un nuovo Movo, hai due opzioni: 1) Utilizzare la funzione Calendario all'indirizzo https://dashboard.movolab.it/dashboard/calendario. 2) Accedere alla funzione Movo all'indirizzo https://dashboard.movolab.it/dashboard/movimenti. Una volta dentro, clicca su 'Nuovo Movo', inserisci i dati del cliente e del conducente, gestisci le opzioni per carburante, franchigie e servizi extra, e calcola il costo del movimento. Infine, puoi far firmare il contratto manualmente o tramite firma digitale OTP.",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: new ObjectId(),
    question: "Come funziona il calcolo dei costi per un Movo?",
    answer: "La piattaforma Movolab include una funzionalità di calcolo automatico dei costi. Quando crei un nuovo Movo, dopo aver inserito tutti i dettagli come cliente, data inizio e data fine utilizzo, conducente, gestione carburante, franchigie e servizi extra, il sistema calcolerà automaticamente il costo totale del movimento basandosi su tutti i parametri inseriti.",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: new ObjectId(),
    question: "Quali sono le funzionalità disponibili per la gestione del carburante, franchigie e servizi extra in un Movo?",
    answer: "Durante la gestione di un nuovo Movo, puoi gestire diverse opzioni: 1) Carburante: gestire l'addebito del carburante o della ricarica della batteria 2) Franchigie: definire le franchigie applicabili 3) Servizi extra: aggiungere eventuali servizi aggiuntivi. Il sistema calcolerà automaticamente il costo totale del movimento in base alle opzioni selezionate.",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: new ObjectId(),
    question: "Cosa sono i Movo",
    answer: "Sono i contratti di movimentazione di veicoli. Possono essere in noleggio e comodato o i movimenti non produttivi. Il Noleggio di un veicolo è un contratto temporaneo in cui un cliente paga per utilizzare un veicolo per un determinato periodo di tempo, senza doverlo acquistare Il Comodato è un contratto in cui il cliente utilizzi gratuitamente il veicolo per un determinato periodo di tempo ma puo' prevedere il pagamento di servizi extra. Il Movimento Non Produttivo è un comodato ad uso interno per dipendenti o addetti che ad esempio devono spostare il veicolo per manutenzione o rifornimento o altro.",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: new ObjectId(),
    question: "Can I modify an existing tariff instead of removing it?",
    answer: "Yes, you can modify an existing tariff directly by: 1. Going to the price list (listino) where the tariff is associated 2. Clicking the 'matita' (pencil) button next to the tariff 3. Making your desired modifications 4. Saving the changes This is often a better alternative to removing and creating a new tariff.",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: new ObjectId(),
    question: "How do I remove a tariff in Movolab?",
    answer: "To remove a tariff in Movolab, you must first dissociate it from any linked price lists (listini). Follow these steps: 1. Go to the Listini section 2. Select the price list containing the tariff 3. Either associate a different existing tariff or create a new one to replace it 4. Save the changes to dissociate the old tariff 5. Go to the Tariffs section (https://dashboard.movolab.it/settings/listini/tariffe) 6. Select the tariff you want to remove 7. Click the 'Rimuovi Tariffa' button to delete it",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: new ObjectId(),
    question: "How do I access the Tariffs section in Movolab?",
    answer: "To access the Tariffs section in Movolab, go to https://dashboard.movolab.it/settings/listini/tariffe. This section allows you to manage all your tariffs directly.",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: new ObjectId(),
    question: "Come abilito o disabilito un veicolo per i movo?",
    answer: "Per gestire un veicolo per i movo in noleggio e comodato, devi andare nella funzione Veicoli (https://dashboard.movolab.it/dashboard/veicoli/flotta) selezionare il veicolo scelto entrare in modifica, completare eventuali dati mancanti, se necessario, e premere il tasto a destra in alto ON-OFF (abilitato/disabilitato). Ricordati che il veicolo deve essere immatricolato per il noleggio senza conducente. Nota: i veicoli possono essere disabilitati ma non completamente rimossi se sono stati utilizzati in precedenti movo in noleggio o comodato.",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: new ObjectId(),
    question: "Posso rimuovere completamente un veicolo dalla flotta?",
    answer: "No, non è possibile rimuovere completamente il veicolo dal sistema per mantenere la storicità delle operazioni. In questi casi, la soluzione raccomandata è disabilitare il veicolo utilizzando il pulsante ON-OFF nella sezione di modifica del veicolo. Questo impedirà l'utilizzo futuro del veicolo pur mantenendo lo storico delle operazioni precedenti.",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: new ObjectId(),
    question: "Come si aggiunge un secondo conducente durante la creazione di un Movo (noleggio)?",
    answer: "Durante la fase di creazione del Movo (contratto di noleggio), è possibile aggiungere un secondo conducente direttamente nel processo di configurazione del noleggio. Questa operazione deve essere effettuata specificamente durante la fase di creazione del Movo, non successivamente.",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: new ObjectId(),
    question: "Cosa sono i PACK",
    answer: "I Pack sono dei pacchetti di servizi e funzionalità che Movolab propone sul mercato ovvero delle soluzioni combinate di software e servizi per rispondere alle esigenze di chi vuole movimentare veicoli in noleggio e comodato. Scegliendo il Pack si sottoscrive un piano in abbonamento per utilizzare la nostra piattaforma in base alle tue esigenze di business e in base al possesso o meno della licenza di noleggio veicoli.",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: new ObjectId(),
    question: "Come faccio a vedere e gestire le transazioni incassate tramite carta di credito (Pay by Link) ?",
    answer: "vai in Admin/Incassi (https://dashboard.movolab.it/settings/incasso) e clicca su “Vai al tuo Account Stripe”. In questo modo entri nella tua area riservata dove potrai controllare e gestire le tue transazioni. Nella sezione Transazioni all’interno della tua area riervata su Stripe, cliccando nei dettagli della singola transazione, potrai procedere anche allo storno in caso di errori nell’addebito dell’impoirro del movo al cliente finale.",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: new ObjectId(),
    question: "Prezzi PACK MOVE",
    answer: "Moduli e Servizi Offerti: 1. Attivazione e Formazione: Corrispettivo Base: Gratuito. Dettagli: Attivazione dell’app. Fino a 1 sessione di formazione. Corrispettivo Extra: Formazione aggiuntiva per sessione: € 150,00 + IVA tramite videocall. € 400,00 + IVA presso la tua Azienda. 2. Moduli Funzionali e Servizi: Corrispettivo Base: € 108,00 all'anno + IVA. Dettagli: Fino a 1 punto noleggio. Fino a 5 veicoli. Utenti illimitati per punto noleggio. Assistenza online. Manutenzione dell’app. Movo in comodato/MNP. Corrispettivo Extra: Aggiunta di punti noleggio: € 5,00 al mese + IVA per ogni punto noleggio aggiunto. Aggiunta di veicoli: € 2,00 al mese + IVA per ogni veicolo aggiunto. Movo in noleggio: € 4,00 + IVA per ogni Movo in noleggio. e fino ad un massimo del 20% dell’importo fatturato da Movolab. Gestione Servizi Esterni: Corrispettivo Base: Nessun costo extra per i seguenti servizi: Gestione fatturazione diretta da parte della tua Azienda di servizi aggiuntivi. Attivazione partitario per numerazione fatture della tua Azienda. Creazione ed estrazione file XML per la fatturazione elettronica.",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: new ObjectId(),
    question: "Prezzi PACK RENT",
    answer: "Moduli e Servizi Offerti: 1. Attivazione e Formazione: Corrispettivo Base: Gratuito. Dettagli: Attivazione dell’app. Fino a 1 sessione di formazione. Corrispettivo Extra: Formazione aggiuntiva per sessione: € 150,00 + IVA tramite videocall. € 400,00 + IVA presso la tua Azienda. 2. Moduli Funzionali e Servizi: Corrispettivo Base: € 180,00 all'anno + IVA. Dettagli: Fino a 1 punto noleggio. Fino a 10 veicoli. Utenti illimitati per punto noleggio. Assistenza online. Manutenzione dell’app. Movo in comodato/MNP. Corrispettivi Extra: Aggiunta di punti noleggio: € 5,00 al mese + IVA per ogni punto noleggio aggiunto. Aggiunta di veicoli: € 2,00 al mese + IVA per ogni veicolo aggiunto. Movo in noleggio: fino ad un massimo del 20% dell’importo fatturato da Movolab. Gestione Servizi Esterni: Corrispettivo Base: Nessun costo extra per i seguenti servizi: Gestione fatturazione diretta da parte della tua Azienda di servizi aggiuntivi. Attivazione partitario per numerazione fatture della tua Azienda. Creazione ed estrazione file XML per la fatturazione elettronica.",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: new ObjectId(),
    question: "Quanto costa il servizio di gestione incassi con carta di credito",
    answer: "Grazie all’accordo con Movolab, non pagherai nessun canone mensile. per ogni transazione con carta di credito o carte di debito (tramite “Pay by Link”), ti verrà addebitato solo il 1,5% + 0,25€.",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: new ObjectId(),
    question: "Gestione incassi con carta di credito",
    answer: "puoi incassare i movo direttamente con carta di credito, grazie all’accordo di Movolab con Stripe, il più importante operatore a livello globale di piattaforme di gestione dei pagamenti. Per attivare il servizio, vai in Admin/Abbonamento/MetodoIncasso e procedi con l’attivazione del tuo profilo Stripe così da poter iniziare a ricevere incassi con carte di credito/debito. Appena hai concluso la registrazione in Stripe, quando dovrai effettuare un incasso, oltre alla modalità standard di incasso al “Banco”, troverai anche la modalità di incasso “Pay by Link”. Se scegli di far pagare al tuo cliente finale attraverso il “Pay By Link,” il sistema invierà una mail al tuo cliente con un link che il cliente potrà aprire direttamente sul suo smartphone per poter effettuare il pagamento del noleggio. L’incasso tramite Stripe avverrà nel modo seguente in base a chi fattura al cliente finale: 1. Se sei tu ad emettere la fattura,incasserai direttamente sul tuo conto corrente. 2. In caso di fatturazione di Movolab, incasserà Movolab che provvedere a retrocederti la tua quota di corrispettivi previsti dal tuo PACK.",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: new ObjectId(),
    question: "Che tipologia di PACK avete?",
    answer: "Abbiamo 2 tipologie di offerte di PACK: una per chi possiede una licenza di noleggio che l’altra per chi non possiede la licenza di noleggio. - PACK per chi non possiede la licenza di noleggio 1. PACK MOVE: Per chi vuole una soluzione semplice per offrire il veicolo prevalentemente in comodato. 2. PACK RENT: Per chi vuole una soluzione completa e facile per offrire il veicolo in noleggio e comodato - PACK per chi possiede la licenza di noleggio 1. PACK PRO: Per chi vuole una soluzione software di noleggio professionale ed ottimizzare i costi della piattaforma 2. PACK PRO MAX: Per chi vuole una soluzione software di noleggio professionale per gestire l’attività su più sedi.",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: new ObjectId(),
    question: "Cosa posso fatturare direttamente con la mia Partita IVA",
    answer: "Se utilizzi la tua licenza di noleggio personale: puoi fatturare sia il noleggio del veicolo sia i km extra, Il carburante, il deposito, le franchigie e i servizi extra come vuoi tu personalizzando i valori e utilizzando la tua numerazione per la fatturazione diretta al Cliente con la tua partita iva. se usi la licenza di noleggio di Movolab: puoi fatturare direttamente i km extra, Il carburante, il deposito, le franchigie e i servizi extra come vuoi tu personalizzando i valori e utilizzando la tua numerazione per la fatturazione diretta al Cliente con la tua partita iva mentre non potrai fatturare con la tua partita iva il solo noleggio del veicolo.",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: new ObjectId(),
    question: "Dove trovo la lettera del Movo in noleggio o comodato firmata dal cliente?",
    answer: "Trovi la lettera del movo in noleggio o comodato firmata dal cliente nella sezione Documenti del Movo. Il Cliente può firmare la lettera del movo in noleggio o comodato, con Firma OTP via sms o mail, oppure firmando direttamente sullo schermo touch, oppure firmando su carta",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: new ObjectId(),
    question: "Posso creare dei Listini di noleggio personalizzati",
    answer: "Si, solo se utilizzi la tua licenza di noleggio personale. Puoi andare in Admin/ProfiloAzienda/Listini e impostare i valori che vuoi così come pui gestirne la validità. Ricordati di abbinarli ad un Flusso.",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: new ObjectId(),
    question: "Quali sono le modalità di incasso dei movo in noleggio?",
    answer: "Posso incassare i miei noleggi con il mio POS o in contanti e registrare l'incasso direttamente all'interno dell'applicazione. Entro breve rilasceremo una nuova funzione per incassare direttamente all'interno dell'applicazione e ricevere gli importi direttamente sul tuo conto corrente.",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: new ObjectId(),
    question: "Posso inserire un Movo con riconsegna su un punto nolo diverso da quello iniziale?",
    answer: "Certo, se hai più di un punto nolo puoi iniziare un Movo su un punto nolo e prevedere la riconsegna del veicolo su un altro dei tuoi punto nolo. Nel noleggio si chiama \"Viaggio a lasciare\"",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: new ObjectId(),
    question: "Quali sono i termini di pagamento dei PACK?",
    answer: "i termini di pagamento dei Corrispettivi Base ed dei Corrispettivi Extra dei PACK sono i seguenti: I corrispettivi Base verranno fatturati ed incassati anticipatamente I corrispettivi Extra verranno fatturati ed incassati posticipatamente",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: new ObjectId(),
    question: "Quando inizio a pagare i corrispettivi previsti dal mio PACK?",
    answer: "Inizierai a pagare i corrispettivi previsti dal tuo PACK quando avrai attivato il primo veicolo all'interno della nostra piattaforma software",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: new ObjectId(),
    question: "Che requisiti deve avere il Veicolo che posso caricare in Movolab?",
    answer: "Il veicolo deve avere come Destinazione 'Locazione senza conducente' e, in caso di acquisto in noleggio a lungo termine, il veicolo deve esssere abilitato alla Sublocazione da parte del proprietario/compagnia assicurativa. Attenzione: Movolab è manlevata da qualsiasi responsabilità civile, penale ed economica derivante dal caricamento da parte tua di veicoli non conformi con i requisiti sopra indicati",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: new ObjectId(),
    question: "Come posso stornare una fattura emessa per un Movo in noleggio?",
    answer: "Se la fattura è stata emessa da Movolab devi contattare l'assistenza amministrativa movolab scrivendo a amministrazione@movolab.it. Se la fattura è stata emessa dalla tua Azienda puoi entrare nella funzione Amminstrazione, cercare la fattura da stornare nella pagina \"le tue fatture\" e puoi procedere con lo storno (vedi pulsante in alto a destra)",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: new ObjectId(),
    question: "chi contattare in caso di problemi tecnici",
    answer: "in caso di problemi o blocchi dell'applicazione Movolab, scrivere all'assistenza tecnica all'indirizzo mail tech@movolab.it descrivendo il problema",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: new ObjectId(),
    question: "chi contattare per questioni di natura commerciale o operativa",
    answer: "in caso di richieste di tipo commerciale o per cambio abbonamento (PACK) o per assistenza operativa, scrivere all'indirizzo mail: clienti@movolab.it",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: new ObjectId(),
    question: "chi contattare per questioni di natura amministrativa e contabile",
    answer: "In caso di informazioni o richieste di natura amministrativa o contabile, (fatture, pagamenti, storni e altro) che riguardano il contratto con Movolab o le fatture di noleggio emesse da Movolab, scrivere all'indirizzo e-mail amministrazione@movolab.it",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: new ObjectId(),
    question: "dove trovo i dettagli del mio contratto e del PACK attivato con Movolab?",
    answer: "puoi andare nella sezione Admin-Profilo Azienda https://dashboard.movolab.it/settings/clientInfo e entrare nella pagina \"il tuo Contratto\" e nella sezione in alto \"Piano selezionato\" clicca su Dettagli Piano per avere i dettagli del Pack attivato mentre in basso nella sezione \"Dettagli Contratto\", clicca sul link Dettagli contratto e puoi scricare la copia del tuo contratto attivo con Movolab.",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: new ObjectId(),
    question: "Descrizione PACK PRO MAX",
    answer: "PACK PRO MAX Per chi vuole una soluzione software di noleggio professionale per gestire l’attività su più sedi. Servizi inclusi: - Licenza d’uso con tutte le funzioni attivate - Gestione Movimenti - Gestione Amministrativa (con creazione ed estrazione XML) - Gestione multe - Assistenza online - Manutenzione app",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: new ObjectId(),
    question: "Descrizione PACK PRO",
    answer: "PACK PRO Per chi vuole una soluzione software di noleggio professionale ed ottimizzare i costi della piattaforma Servizi inclusi: - Licenza d’uso con tutte le funzioni attivate - Gestione Movimenti - Gestione Amministrativa (con creazione ed estrazione XML) - Gestione multe - Assistenza online - Manutenzione app",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: new ObjectId(),
    question: "Descrizione PACK RENT",
    answer: "Per chi vuole una soluzione completa e facile per offrire il veicolo in noleggio e comodato Servizi inclusi: - Licenza d’uso con tutte le funzioni attivate - Gestione Movimenti - Gestione Amministrativa (con creazione ed estrazione XML) - Gestione multe - Assistenza online - Manutenzione app",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: new ObjectId(),
    question: "Descrizione PACK MOVE",
    answer: "Per chi vuole una soluzione semplice per offrire il veicolo prevalentemente in comodato. 1. Servizi inclusi: - Licenza d’uso con tutte le funzioni attivate - Gestione Movimenti - Gestione Amministrativa (con creazione ed estrazione XML) - Gestione multe - Assistenza online - Manutenzione app",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: new ObjectId(),
    question: "Quali requisiti e documenti devo avere per completare l’iscrizione a Movolab",
    answer: "per iscriversi a Movolab, devi essere il Legale Rappresentante o devi essere dotato di poteri per sottoscrivere accordi per conto della tua azienda e serve il tuo documento d’identità e la visura della tua azienda e se usi la tua licenza di noleggio dovrai inserire il numero della SCIA di Noleggio senza conducente che trovi proprio nella Visura della tua azienda.",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: new ObjectId(),
    question: "Come completo la registrazione per poter utilizzare movolab?",
    answer: "Dopo aver ricevuto mail di conferma attivazione, nella Dashboard troverai dei warning (delle tab colorate) con le indicazioni di cosa devi completare per la gestione dei movo e prenotazioni. quali ad esempio: - Completa il tuo Profilo Azienda (orari di apertura e chiusura, dati amministrativi, ilogo azienda, colori personalizzati, etc) - Nessun Punto Nolo creato. Crea un Punto Nolo per iniziare a noleggiare veicoli. - Crea un profilo Operatore per i tuoi collaboratori (tu sei l’Admin) - Nessun Veicolo aggiunto. Aggiungi un veicolo per attivare il tuo punto nolo.",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: new ObjectId(),
    question: "Posso attivare un Veicolo aggiuntivo rispetto a quelli previsti nel PACK?",
    answer: "Si puoi attivare e disattivare nell’apposita funzione un Veicolo quando vuoi. (https://dashboard.movolab.it/dashboard/veicoli/flotta ) Se previsto dal tuo PACK pagherai un corrispettivo aggiuntivo ma solo quando è attivo (es. se attivi un veicolo solo per la stagione invernale ad esempio per tre mesi l’addebito riguarderà solo il periodo in cui è rimasto attivo)",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: new ObjectId(),
    question: "Quanto costa movolab?",
    answer: "Il costo di Movolab dipende dai moduli funzionali e dai servizi scelti. I corrispettivi specifici sono indicati nell'Allegato 1 \"Moduli e Corrispettivi\". Per ulteriori dettagli sui costi, ti consigliamo di consultare l'Allegato 1 nella sezione \"Profilo Azienda\" alla pagina \"Il tuo Contratto\" alla voce \"Dettagli del piano\" . https://dashboard.movolab.it/settings/clientInfo",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: new ObjectId(),
    question: "Cosa significa stampa CON OTP",
    answer: "Invece di stampare il contratto del movo, puoi inviare un link al tuo cliente per la firma digitale così da velocizzare la consegna del veicolo e risparmiare sui costi di stampa e offrire un servizio moderno e pratico.",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: new ObjectId(),
    question: "Posso personalizzare i termini e condizioni dei Movo",
    answer: "Si, solo se utilizzi la tua licenza di noleggio personale. Puoi andare in Admin/ProfiloAzienda/Termini e CondizioniMovo e aggiornare il testo con le specifiche che vuoi tu. (https://dashboard.movolab.it/settings/clientInfo )",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: new ObjectId(),
    question: "Cosa sono gli Extra",
    answer: "Sono dei servizi aggiuntivi all’utilizzo del veicolo e si aggiungono alla tariffa base di noleggio. Ad esempio: lavaggio a fine noleggio, abbattimento franchigie, maggiorazioni della tariffa per casi particolari di utilizzo come, ad esempio, fee aggiuntiva per guida in caso di età sotto i 21 anni o in caso di riconsegna veicolo in un altro punto nolo o in caso di servizio di consegna a domicilio del veicolo, etc. Gli Extra possono essere creati e personalizzati come vuoi e sono fatturati direttamente dalla tua azienda al cliente finale del noleggio.",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: new ObjectId(),
    question: "Cosa sono le Fasce",
    answer: "Sono range di tempo a cui abbinare delle tariffe di noleggio",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: new ObjectId(),
    question: "Come pago la piattaforma Movolab",
    answer: "In fase di registrazione, dovrai inserire il tuo iban edin automatico il sistema invia la richiesta di attivazione del SEPA Direct Debit per il pagamento dei corrispettivi.",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: new ObjectId(),
    question: "Dove posso vedere quanto sto spendendo o guadagnando con Movolab",
    answer: "puoi andare in Admin/ProfiloAzienda/Abbonamento (https://dashboard.movolab.it/settings/dettagliAbbonamento )e troverai i dettagli mensile sia dei costi della piattaforma sia dei ricavi generati dai Movo.",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: new ObjectId(),
    question: "Dove posso inserire il mio partitario per fatturare con la mia Partita IVA",
    answer: "puoi andare in Admin/ProfiloAzienda/Amminsitrazione e troverai la sezione Numerazione Fatturazione Diretta dove inserire i tuoi dati. Normalmente devi chiedere al tuo commercialista di assegnarti un partitario fatture per questa attività. Il sistema poi cambia la numerazione progressivamente ogni volta che emette una tua fattura.",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: new ObjectId(),
    question: "Posso personalizzare i colori della piattaforma",
    answer: "Si, puoi andare in Admin/ProfiloAzienda/Personalizzazione e scegliere i colori che preferisci",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: new ObjectId(),
    question: "Posso utilizzare il mio logo",
    answer: "Si, puoi andare in Admin/ProfiloAzienda/ ed inserire il logo della tua azienda così da personalizzare anche le stampe dei Movo con il tuo logo.",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: new ObjectId(),
    question: "Cosa si intende per Licenza di Noleggio",
    answer: "È l’autorizzazione da parte degli enti competenti ad effettuare attività di noleggio senza conducente. Puoi utilizzare la tua licenza di noleggio (scegliendo uno dei PACK con licenza di noleggio personale) oppure la licenza di noleggio Movolab (scegliendo uno dei PACK con licenza Movolab).",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: new ObjectId(),
    question: "Cosa sono i Movimenti non produttivi",
    answer: "Sono movimenti, spostamenti del veicolo per uso interno ovvero senza l’utilizzo del veicolo da parte di un cliente o un soggetto esterno alla tua organizzazione",
    createdAt: new Date(),
    updatedAt: new Date(),
  }
];

async function seedDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("Error: MONGODB_URI is not defined in .env.local");
    process.exit(1);
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("Connected to MongoDB successfully!");

    const dbNameFromUri = uri.split('/').pop()?.split('?')[0];
    const dbName = dbNameFromUri || 'kommander_ai_prototype'; // Ensure this matches your actual DB name
    const db = client.db(dbName);
    
    const faqsCollection = db.collection('faqs');

    // Optional: Clear existing FAQs before seeding
    const deleteResult = await faqsCollection.deleteMany({});
    console.log(`Deleted ${deleteResult.deletedCount} existing FAQs.`);

    // Insert new FAQs
    if (exampleFaqs.length > 0) {
      const insertResult = await faqsCollection.insertMany(exampleFaqs);
      console.log(`Successfully seeded ${insertResult.insertedCount} FAQs.`);
    } else {
      console.log("No FAQs to seed.");
    }

  } catch (error) {
    console.error("Error during database seeding:", error);
  } finally {
    await client.close();
    console.log("MongoDB connection closed.");
  }
}

seedDatabase();
