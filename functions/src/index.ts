// functions/src/index.ts

import * as functions from "firebase-functions";
const cors = require("cors")({ origin: true });
import busboy = require('busboy');
import * as os from "os";
import * as path from "path";
import * as fs from "fs";
import * as stream from "stream";
import vision from "@google-cloud/vision";

export const processReceipt = functions.https.onRequest((req, res) => {
  cors(req, res, () => {
    if (req.method !== 'POST') {
      res.set('Allow', 'POST');
      res.status(405).send({ error: 'Method Not Allowed' });
      return;
    }

    let bb: busboy.Busboy;
    try {
      bb = busboy({ headers: req.headers });
    } catch (e) {
      functions.logger.error("Error inicializando Busboy:", e, { headers: req.headers });
      res.status(400).send({ error: 'Cabeceras inválidas.' });
      return;
    }

    const tmpdir = os.tmpdir();
    const fileWrites: Promise<void>[] = [];
    let imageFilePath = "";
    let fileDetected = false;
    let fileError: Error | null = null;

    bb.on('file', (fieldname: string, file: stream.Readable, info: busboy.FileInfo) => {
        if (fileError) { file.resume(); return; }
        fileDetected = true;
        const { filename = 'unknownfile', mimeType } = info;

        if (fieldname !== 'file') {
            file.resume();
            return;
        }
        if (!mimeType.startsWith('image/')) {
          fileError = new Error('Solo se permiten imágenes.');
          file.resume();
          return;
        }

        const uniqueFilename = `${Date.now()}-${path.basename(filename)}`;
        const filepath = path.join(tmpdir, uniqueFilename);
        imageFilePath = filepath;

        const writeStream = fs.createWriteStream(filepath);
        file.pipe(writeStream);

        const promise = new Promise<void>((resolve, reject) => {
            file.on('error', (err) => { fileError = err; writeStream.end(); reject(err); });
            writeStream.on('error', (err) => { fileError = err; reject(err); });
            writeStream.on('finish', () => { resolve(); });
        });
        fileWrites.push(promise);
    });

    bb.on('error', (err: Error) => {
        if (!fileError) fileError = err;
    });

    bb.on('close', async () => {
      if (fileError) {
           if (imageFilePath && fs.existsSync(imageFilePath)) { try { fs.unlinkSync(imageFilePath); } catch(e){} }
           if (!res.headersSent) {
               const msg = fileError.message.includes('imágenes') ? 'Tipo inválido.' : 'Error procesando archivo.';
               res.status(400).send({ error: msg });
           }
           return;
      }

      if (!fileDetected) {
        if (!res.headersSent) { res.status(400).send({ error: "No se envió imagen válida." }); }
        return;
      }

      try {
        await Promise.all(fileWrites);
        if (!fs.existsSync(imageFilePath)) { throw new Error("Archivo temporal no existe."); }

        const visionClientLocal = new vision.ImageAnnotatorClient();
        const [result] = await visionClientLocal.textDetection(imageFilePath);
        const detections = result.textAnnotations;

        try { fs.unlinkSync(imageFilePath); } catch (e) {}

        let finalResponseItems: { description: string; amount: number; note?: string }[] = [];
        
        if (detections && detections.length > 0 && detections[0]?.description) {
           const fullText = detections[0].description;
           functions.logger.info("Texto completo:\n", fullText);
           const lines = fullText.split("\n");
           const lowerFullText = fullText.toLowerCase();

           // --- 1. DETECCIÓN DE TIPO DE DOCUMENTO (Factura vs Lista) ---
           // Si tiene estas palabras, asumimos que es un ticket oficial con el total ya calculado
           const receiptIndicators = ['total', 'subtotal', 'efectivo', 'cambio', 'ticket', 'factura', 'cajero', 'fecha:', 'nit:', 'nrc:', 'vuelto'];
           const isOfficialReceipt = receiptIndicators.some(indicator => lowerFullText.includes(indicator));

           functions.logger.info(`Es Ticket Oficial: ${isOfficialReceipt}`);

           // --- 2. LISTA DE COMERCIOS ---
           const merchants = [
               { name: 'McDonald\'s', keywords: ['mcdonald', 'arcos dorados', 'cajita feliz', 'big mac', 'mcmuffin', 'mcflurry', 'mcmenu', 'quesohamburguesa', 'mcnuggets', 'cuarto de libra', 'mcpollo', 'mac', 'mccombo', 'deluxe'] },
               { name: 'Pizza Hut', keywords: ['pizza hut', 'pan pizza', 'hut cheese', 'super suprema', 'pepperoni', 'jamon y queso', 'palitroques', 'lasaña', 'calzone', 'hut', 'pizzahut', '4 estaciones'] },
               { name: 'Starbucks', keywords: ['starbucks', 'frappuccino', 'latte', 'espresso', 'macchiato', 'venti', 'grande', 'alto', 'mocha', 'coffee', 'café', 'refresher', 'panini', 'croissant'] },
               { name: 'Wendy\'s', keywords: ['wendy', 'baconator', 'dave', 'frosty', 'chili', 'papas con queso', 'hamburguesa'] },
               { name: 'Burger King', keywords: ['burger king', 'whopper', 'king de pollo', 'stacker', 'long chicken', 'onion rings', 'bk', 'king'] },
               { name: 'KFC', keywords: ['kfc', 'kentucky', 'receta original', 'crispy', 'bucket', 'ke-tiras', 'pure de papa', 'big kruncher', 'popcorn', 'biscuit'] },
               { name: 'Pollo Campero', keywords: ['campero', 'pollo tierno', 'camperitos', 'extra crujiente', 'pan campero', 'desayuno campero'] },
               { name: 'China Wok', keywords: ['china wok', 'arroz cantones', 'wantan', 'chao mein', 'agridulce', 'enrollado', 'cerdo', 'pollo naranja'] },
               { name: 'Little Caesars', keywords: ['little caesar', 'hot n ready', 'pizza de queso', 'crazy bread', 'caesar', 'super cheese'] },
               { name: 'Taco Bell', keywords: ['taco bell', 'chalupa', 'burrito', 'crunchwrap', 'bell', 'taco', 'quesadilla'] },
               { name: 'Papa John\'s', keywords: ['papa john', 'johns', 'the works', 'tuscan six cheese', 'papa'] },
               { name: 'Subway', keywords: ['subway', 'bmt', 'sub del dia', 'teriyaki', 'steak', 'tuna', 'deatun', 'sub'] }
           ];

           let detectedMerchant = null;
           for (const m of merchants) {
               if (m.keywords.some(k => lowerFullText.includes(k))) {
                   detectedMerchant = m.name;
                   break;
               }
           }

           // --- 3. PRE-PROCESAMIENTO DE ÍTEMS ---
           const tempItems: { description: string; amount: number }[] = [];
           const priceRegex = /(?:[\s$]|^)(\d+(?:[,.]\d{1,2})?)\s*$/;
           const ignoreRegex = /^(total|subtotal|iva|propina|efectivo|cambio|impuesto|recibido|tarjeta|gracias|vuelto|cajero|atendido|fecha|hora|ticket|factura|nit|nrc)/i;
           const qtyRegex = /^(\d{1,3})\s+(?=[a-zA-Z])/; 

           for (const line of lines) {
               const trimmedLine = line.trim();
               if (trimmedLine.length < 3 || ignoreRegex.test(trimmedLine)) continue;

               const match = trimmedLine.match(priceRegex);
               if (match && match[1]) {
                   try {
                       let priceStr = match[1].replace(/,/g, ".");
                       const amount = parseFloat(priceStr);

                       if (!isNaN(amount) && amount > 0) {
                           let description = trimmedLine.substring(0, match.index).trim();
                           description = description.replace(/^[^a-zA-Z0-9\u00E0-\u00FC]+|[^a-zA-Z0-9\u00E0-\u00FC\s%]+$/g, "").trim();
                           description = description.replace(qtyRegex, "").trim();

                           if (description.length > 1 && !ignoreRegex.test(description)) {
                               tempItems.push({ description, amount });
                           }
                       }
                   } catch (e) {}
               }
           }

           if (detectedMerchant) {
               // --- ESTRATEGIA COMERCIO DETECTADO ---
               functions.logger.info(`Comercio detectado: ${detectedMerchant}`);

               let totalAmount = 0;

               if (isOfficialReceipt) {
                   // ==> ES UN TICKET OFICIAL: Buscamos el NÚMERO MÁS GRANDE (Total)
                   const allAmounts = tempItems.map(i => i.amount);
                   // También buscamos números sueltos que podrían ser el total
                   const allNumbersRegex = /(\d+(?:[,.]\d{2}))/g;
                   const numbersMatch = fullText.match(allNumbersRegex);
                   if (numbersMatch) {
                       numbersMatch.forEach(numStr => {
                           const val = parseFloat(numStr.replace(',', '.'));
                           if (!isNaN(val) && val < 5000) allAmounts.push(val);
                       });
                   }
                   if (allAmounts.length > 0) {
                       totalAmount = Math.max(...allAmounts);
                   }
               } else {
                   // ==> ES UNA LISTA SIMPLE: SUMAMOS TODO
                   // Sumamos los montos de los items encontrados
                   totalAmount = tempItems.reduce((sum, item) => sum + item.amount, 0);
               }

               // Construir Nota
               const noteDetails = tempItems
                   .map(i => {
                        const merchantRegex = new RegExp(detectedMerchant!.replace(/'/g, ".?"), "gi");
                        let cleaned = i.description.replace(merchantRegex, '').trim();
                        return cleaned.length > 1 ? cleaned : i.description;
                   })
                   .join(", ");

               if (totalAmount > 0) {
                   finalResponseItems.push({
                       description: detectedMerchant, 
                       amount: Number(totalAmount.toFixed(2)), // Redondear a 2 decimales         
                       note: noteDetails              
                   });
               }

           } else {
               // --- ESTRATEGIA SIN COMERCIO (Lista Genérica) ---
               finalResponseItems = tempItems;
           }

        } else {
          functions.logger.warn("No se detectó texto útil.");
        }

        if (!res.headersSent) {
             res.status(200).send({ items: finalResponseItems.length > 0 ? finalResponseItems : [], message: finalResponseItems.length === 0 ? 'No se encontraron gastos.' : undefined });
        }

      } catch (error) {
        functions.logger.error("Error:", error);
        if (imageFilePath && fs.existsSync(imageFilePath)) { try { fs.unlinkSync(imageFilePath); } catch(e){} }
        if (!res.headersSent) { res.status(500).send({ error: 'Error interno.' }); }
      }
    });

    if ((req as any).rawBody) {
      bb.end((req as any).rawBody);
    } else {
      req.pipe(bb);
    }
  });
});