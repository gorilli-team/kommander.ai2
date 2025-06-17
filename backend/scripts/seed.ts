
import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' }); 

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
  // ... (rest of the exampleFaqs array remains the same)
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
    console.log("[backend/scripts/seed.ts] Connected to MongoDB successfully!");

    const dbNameFromUri = uri.split('/').pop()?.split('?')[0];
    const dbName = dbNameFromUri || 'kommander_ai_prototype'; 
    const db = client.db(dbName);
    
    const faqsCollection = db.collection('faqs');

    const deleteResult = await faqsCollection.deleteMany({});
    console.log(`[backend/scripts/seed.ts] Deleted ${deleteResult.deletedCount} existing FAQs.`);

    if (exampleFaqs.length > 0) {
      const insertResult = await faqsCollection.insertMany(exampleFaqs as any[]); // Added 'as any[]' to bypass potential _id type issues with older MongoDB drivers if any
      console.log(`[backend/scripts/seed.ts] Successfully seeded ${insertResult.insertedCount} FAQs.`);
    } else {
      console.log("[backend/scripts/seed.ts] No FAQs to seed.");
    }

  } catch (error) {
    console.error("[backend/scripts/seed.ts] Error during database seeding:", error);
  } finally {
    await client.close();
    console.log("[backend/scripts/seed.ts] MongoDB connection closed.");
  }
}

seedDatabase();
