import { connectToDatabase } from '@/backend/lib/mongodb';

export interface OfferQueryResult {
  id: string;
  brand?: string;
  model?: string;
  version?: string;
  vehicleType?: string;
  fuel?: string;
  transmission?: string;
  color?: string;
  interior?: string;
  engineSize?: string;
  powerHp?: number | null;
  rentalDurationMonths?: number | null;
  kilometersIncluded?: number | null;
  upfrontAmount?: number | null;
  monthlyFee?: number | null;
  includedServices?: string[];
  availability?: { count?: number | null; date?: string | null; note?: string | null };
  validUntil?: string | Date | null;
  notes?: string;
}

function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[^a-z0-9àèéìòùç\s]/gi, ' ')
    .split(/\s+/)
    .filter(w => w.length > 1 && !['hai','avete','su','di','per','la','il','le','un','una','della','del','dei','delle','lo','gli','che','ci','sono','offerte','offerta','auto','macchina','noleggio','noleggiare','mi','interessa','avrei','vorrei','info','informazioni','sulla','sulle','sul','modello','marca','tesla?','panda?'].includes(w));
}

export async function searchOffers(userId: string, query: string, limit = 5): Promise<OfferQueryResult[]> {
  const { db } = await connectToDatabase();
  const col = db.collection('offers');

  const tokens = tokenize(query);
  const orFields = ['brandLower', 'modelLower', 'version', 'vehicleType', 'fuel'];

  const orConds = tokens.length
    ? tokens.map(t => ({ $or: orFields.map(f => ({ [f]: { $regex: t, $options: 'i' } })) }))
    : [{ $or: [{ brandLower: { $exists: true } }, { modelLower: { $exists: true } }] }];

  const mongoQuery: any = {
    userId,
    $and: orConds,
  };

  const docs = await col
    .find(mongoQuery)
    .sort({ monthlyFee: 1, 'source.uploadedAt': -1 })
    .limit(limit)
    .toArray();

  return docs.map((d: any) => ({
    id: d._id.toString(),
    brand: d.brand,
    model: d.model,
    version: d.version,
    vehicleType: d.vehicleType,
    fuel: d.fuel,
    transmission: d.transmission,
    color: d.color,
    interior: d.interior,
    engineSize: d.engineSize,
    powerHp: d.powerHp,
    rentalDurationMonths: d.rentalDurationMonths,
    kilometersIncluded: d.kilometersIncluded,
    upfrontAmount: d.upfrontAmount,
    monthlyFee: d.monthlyFee,
    includedServices: d.includedServices,
    availability: d.availability,
    validUntil: d.validUntil,
    notes: d.notes,
  }));
}

export function buildOffersContext(offers: OfferQueryResult[]): string {
  if (!offers?.length) return '';
  let ctx = 'OFFERTE TROVATE NEL DATABASE (estratte dai CSV):\n';
  ctx += '\nQuando rispondi all\'utente, formatta ogni offerta come nell\'esempio seguente, usando punti elenco e la frase iniziale:"\n';
  ctx += 'Esempio stile risposta per ciascuna offerta:\n';
  ctx += 'Sì, abbiamo un\'offerta di noleggio per la {Marca} {Modello} disponibile per i clienti privati. Ecco i dettagli dell\'offerta:\n';
  ctx += '- Marca: {Marca}\n';
  ctx += '- Modello: {Modello}\n';
  ctx += '- Versione: {Versione}\n';
  ctx += '- Tipo veicolo: {Tipo veicolo}\n';
  ctx += '- Alimentazione: {Alimentazione}\n';
  ctx += '- Trasmissione: {Trasmissione}\n';
  ctx += '- Colore: {Colore}\n';
  ctx += '- Interni: {Interni}\n';
  ctx += '- Cilindrata: {Cilindrata}\n';
  ctx += '- Potenza: {Potenza}\n';
  ctx += '- Durata del noleggio: {Durata} mesi\n';
  ctx += '- Chilometraggio incluso: {KM} km\n';
  ctx += '- Anticipo: {Anticipo}\n';
  ctx += '- Canone mensile: {Canone}\n';
  ctx += '- Servizi inclusi: {Servizi}\n';
  ctx += '- Altro: {Altro}\n';
  ctx += '- Disponibilità: {Disponibilita}\n';
  ctx += '- Data disponibilità: {DataDisponibilita}\n';
  ctx += '- Offerta valida fino: {Validita}\n';
  ctx += "Se l'informazione non è disponibile, inserisci 'Non specificata' o ometti la riga.\n";
  ctx += "Chiudi con una frase d'invito, ad esempio: 'Se sei interessato/a, posso inviarti ulteriori dettagli o una quotazione.'\n\n";

  offers.forEach((o, idx) => {
    const titolo = (o.brand || o.model) ? `Sì, abbiamo un'offerta di noleggio per la ${o.brand || ''} ${o.model || ''}`.trim() : 'Offerta di noleggio disponibile';
    ctx += `--- OFFERTA ${idx + 1} ---\n`;
    ctx += `${titolo}. Ecco i dettagli dell'offerta:\n`;
    if (o.brand) ctx += `- Marca: ${o.brand}\n`;
    if (o.model) ctx += `- Modello: ${o.model}\n`;
    if (o.version) ctx += `- Versione: ${o.version}\n`;
    if (o.vehicleType) ctx += `- Tipo veicolo: ${o.vehicleType}\n`;
    if (o.fuel) ctx += `- Alimentazione: ${o.fuel}\n`;
    if (o.transmission) ctx += `- Trasmissione: ${o.transmission}\n`;
    if (o.color) ctx += `- Colore: ${o.color}\n`;
    if (o.interior) ctx += `- Interni: ${o.interior}\n`;
    if (o.engineSize) ctx += `- Cilindrata: ${o.engineSize}\n`;
    if (o.powerHp != null) ctx += `- Potenza: ${o.powerHp}cv\n`;
    if (o.rentalDurationMonths != null) ctx += `- Durata del noleggio: ${o.rentalDurationMonths} mesi\n`;
    if (o.kilometersIncluded != null) ctx += `- Chilometraggio incluso: ${o.kilometersIncluded.toLocaleString('it-IT')} km\n`;
    if (o.upfrontAmount != null) ctx += `- Anticipo: €${o.upfrontAmount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}\n`;
    if (o.monthlyFee != null) ctx += `- Canone mensile: €${o.monthlyFee.toLocaleString('it-IT', { minimumFractionDigits: 2 })}\n`;
    if (o.includedServices?.length) ctx += `- Servizi inclusi: ${o.includedServices.join(', ')}\n`;
    if (o.notes) ctx += `- Altro: ${o.notes}\n`;
    if (o.availability) {
      const parts: string[] = [];
      if (o.availability.count != null) parts.push(`${o.availability.count} veicolo/i`);
      if (o.availability.note) parts.push(o.availability.note);
      if (parts.length) ctx += `- Disponibilità: ${parts.join(' — ')}\n`;
      if (o.availability.date) ctx += `- Data disponibilità: ${o.availability.date}\n`;
    }
    if (o.validUntil) ctx += `- Offerta valida fino: ${o.validUntil}\n`;
    ctx += "Se sei interessato/a, posso inviarti ulteriori informazioni o una quotazione dettagliata.\n";
    ctx += `--- FINE OFFERTA ${idx + 1} ---\n`;
  });
  ctx += '\nUsa queste offerte per rispondere a domande su disponibilità e prezzi. Se richiesto un modello/marca assente, specifica che non sono state trovate offerte nel database.';
  return ctx;
}
