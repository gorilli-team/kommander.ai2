
// To run this script:
// 1. Ensure you have tsx installed: npm install -D tsx
// 2. Set up your .env.local with MONGODB_URI
// 3. Run: npm run seed  (or npx tsx backend/scripts/seed.ts directly if script not in package.json)

import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';
import type { UserDocument } from '@/backend/schemas/user'; // Assuming UserDocument is similar to what's in backend/schemas/user
import type { Faq } from '@/backend/schemas/faq';


dotenv.config({ path: '.env.local' }); // Load environment variables from .env.local

// Example FAQs - these will be seeded if the script runs the seeding part
const exampleFaqsData: Omit<Faq, 'id' | 'createdAt' | 'updatedAt' | 'userId'>[] = [
  {
    question: "Come posso cambiare cliente durante l'inserimento di un Movo o prenotazione?",
    answer: "Per cambiare cliente ti basta entrare nella funzione cliente o conducente e selezionarne un'altra anagrafica o inserirne una nuova.",
  },
  {
    question: "Come inserisco un movo in noleggio o in comodato?",
    answer: "Vai in Movo (https://dashboard.movolab.it/dashboard/movimenti) e clicca Apri Movo. Seleziona il Flusso, il Tipo movimento (noleggio o comodato) e il Gruppo Veicolo. Poi inserisci data e punto nolo di consegna, e data e punto nolo di ritiro. Aggiungi il conducente e il cliente e premi \"Cerca e continua\". Per cambiare l'anagrafica del cliente (o conducente) durante l'inserimento, vai nella tab di inserimento cliente (o conducente) e premi il tasto con la matitina per modificare l'anagrafica esistente. Scegli il listino, la fascia e se vuoi lo sconto. Scegli il veicolo e premi \"Continua\" in alto a destra. Nella schermata di Apertura aggiorna i dati del movo: i km iniziali ed il livello di carburante, eventuali danni non registrati, eventuali extra (abbattimento franchigie o accessori) scelti dal cliente. Poi premi Apri Movo e dopo il bottone Firma per far firmare la lettera di noleggio al cliente (con OTP, firma su dispositivo o stampa per firma olografa). A fine noleggio, premi \"Chiusura Movo\" e aggiorna la data e l'ora finale ed i km del veicolo. Aggiungi eventuali Extra o Franchigie da addebitare al cliente (es: lavaggio o altro). Nel \"Calcolo Prezzo\" hai i dettagli di quanto deve pagare il cliente. Clicca su \"Chiudi Movo\" e a destra appare la tab per fatturare e per incassare. Vedi il video tutorial (https://movolab.it/tutorials/tutorial-movo/)",
  },
  // ... (include all other example FAQs here, without _id, createdAt, updatedAt, userId)
  {
    question: "Cosa sono i Movimenti non produttivi",
    answer: "Sono movimenti, spostamenti del veicolo per uso interno ovvero senza l’utilizzo del veicolo da parte di un cliente o un soggetto esterno alla tua organizzazione",
  }
];

async function seedDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("Error: MONGODB_URI is not defined in .env.local");
    process.exit(1);
  }

  const client = new MongoClient(uri);
  const targetUserEmail = 'arbi@gorilli.io'; // Email of the user to associate data with

  try {
    await client.connect();
    console.log("[seed.ts] Connected to MongoDB successfully!");

    const dbNameFromUri = uri.split('/').pop()?.split('?')[0];
    const dbName = dbNameFromUri || 'kommander_ai_prototype'; 
    const db = client.db(dbName);
    
    const usersCollection = db.collection<UserDocument>('users');
    const faqsCollection = db.collection('faqs');
    const rawFilesMetaCollection = db.collection('raw_files_meta');

    // 1. Find the target user
    const arbiUser = await usersCollection.findOne({ email: targetUserEmail });
    let arbiUserId: string | undefined = undefined;

    if (arbiUser && arbiUser._id) {
      arbiUserId = arbiUser._id.toString();
      console.log(`[seed.ts] Found user ${targetUserEmail} with ID: ${arbiUserId}`);

      // 2. Associate existing FAQs without a userId to arbiUser
      const faqUpdateResult = await faqsCollection.updateMany(
        { userId: { $exists: false } },
        { $set: { userId: arbiUserId } }
      );
      console.log(`[seed.ts] Associated ${faqUpdateResult.modifiedCount} existing FAQs with user ID: ${arbiUserId}.`);

      // 3. Associate existing raw_files_meta without a userId to arbiUser
      const filesMetaUpdateResult = await rawFilesMetaCollection.updateMany(
        { userId: { $exists: false } },
        { $set: { userId: arbiUserId } }
      );
      console.log(`[seed.ts] Associated ${filesMetaUpdateResult.modifiedCount} existing file metadata records with user ID: ${arbiUserId}.`);

    } else {
      console.warn(`[seed.ts] User ${targetUserEmail} not found. Skipping association of existing data. Example FAQs will not be associated with this user if seeded.`);
    }

    // 4. Seed example FAQs (current logic: delete all then insert examples)
    // This part will delete ALL FAQs, including any just migrated if this script is run multiple times
    // and exampleFaqsData is not empty. Consider this behavior.
    
    // Prepare example FAQs with ObjectId and timestamps, and userId if available
    const processedExampleFaqs = exampleFaqsData.map(faq => ({
      ...faq,
      _id: new ObjectId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...(arbiUserId && { userId: arbiUserId }), // Add userId if arbiUser was found
    }));
    
    // Delete existing example FAQs (or all FAQs as per current script logic)
    const deleteResult = await faqsCollection.deleteMany({}); // This deletes ALL FAQs
    console.log(`[seed.ts] Deleted ${deleteResult.deletedCount} existing FAQs before seeding new examples.`);

    if (processedExampleFaqs.length > 0) {
      const insertResult = await faqsCollection.insertMany(processedExampleFaqs as any[]); 
      console.log(`[seed.ts] Successfully seeded ${insertResult.insertedCount} example FAQs.`);
      if (arbiUserId) {
        console.log(`[seed.ts] Example FAQs seeded were associated with user ID: ${arbiUserId}`);
      } else {
        console.log(`[seed.ts] Example FAQs seeded without a specific user ID as ${targetUserEmail} was not found.`);
      }
    } else {
      console.log("[seed.ts] No example FAQs to seed.");
    }

  } catch (error) {
    console.error("[seed.ts] Error during database seeding/migration:", error);
  } finally {
    await client.close();
    console.log("[seed.ts] MongoDB connection closed.");
  }
}

seedDatabase();
