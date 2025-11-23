// functions/src/index.ts

import * as functions from "firebase-functions";
// Usa require para cors
// eslint-disable-next-line @typescript-eslint/no-var-requires
const cors = require("cors")({ origin: true });
// Usa import = require() para busboy
import busboy = require('busboy');
import * as os from "os";
import * as path from "path";
import * as fs from "fs";
import * as stream from "stream";
import vision from "@google-cloud/vision";

export const processReceipt = functions.https.onRequest((req, res) => {
  cors(req, res, () => {
    if (req.method !== 'POST') {
      functions.logger.warn("Método no permitido:", req.method);
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
            file.on('error', (err: Error) => { fileError = err; writeStream.end(); reject(err); });
            writeStream.on('error', (err: Error) => { fileError = err; reject(err); });
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

           // 1. COMERCIOS Y PALABRAS CLAVE ASOCIADAS
           // Aquí definimos qué palabras "delatan" a un comercio
           const merchants = [
               { name: 'McDonald\'s', keywords: ['mcdonald', 'arcos dorados', 'cajita feliz', 'big mac', 'mcmuffin', 'mcflurry'] },
               { name: 'Pizza Hut', keywords: ['pizza hut', 'pan pizza', 'hut cheese'] },
               { name: 'Starbucks', keywords: ['starbucks', 'mango dragonfruit lemonade refresher'] },
               { name: 'Wendy\'s', keywords: ['wendy', 'baconator'] },
               { name: 'Burger King', keywords: ['burger king', 'whopper'] },
               { name: 'KFC', keywords: ['kfc', 'kentucky', 'big kruncher'] },
               { name: 'Pollo Campero', keywords: ['campero', 'pollo tierno', 'camperitos'] },
               { name: 'China Wok', keywords: ['china wok', 'arroz cantones', 'wantan'] }
           ];

           let detectedMerchant = null;
           const lowerFullText = fullText.toLowerCase();

           // Buscar si alguna palabra clave está en todo el texto
           for (const m of merchants) {
               if (m.keywords.some(k => lowerFullText.includes(k))) {
                   detectedMerchant = m.name;
                   break;
               }
           }

           // --- PRE-PROCESAMIENTO DE ÍTEMS ---
           // Primero extraemos todo lo que parezca un producto y su precio
           const tempItems: { description: string; amount: number }[] = [];
           const priceRegex = /(?:[\s$]|^)(\d+(?:[,.]\d{1,2})?)\s*$/;
           const ignoreRegex = /^(total|subtotal|iva|propina|efectivo|cambio|impuesto|recibido|tarjeta|gracias|vuelto|cajero|atendido|fecha|hora|ticket|factura|nit|nrc)/i;
           const qtyRegex = /^(\d{1,3})\s+(?=[a-zA-Z])/; // Para quitar "1 CAJITA"

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
                           // Limpieza
                           description = description.replace(/^[^a-zA-Z0-9\u00E0-\u00FC]+|[^a-zA-Z0-9\u00E0-\u00FC\s%]+$/g, "").trim();
                           description = description.replace(qtyRegex, "").trim(); // Quitar "1 " del inicio

                           if (description.length > 1 && !ignoreRegex.test(description)) {
                               tempItems.push({ description, amount });
                           }
                       }
                   } catch (e) {}
               }
           }

           if (detectedMerchant) {
               // --- ESTRATEGIA 1: COMERCIO DETECTADO (Lógica de Consumo) ---
               functions.logger.info(`Comercio detectado: ${detectedMerchant}`);

               // 1. Calcular el Total: Buscamos el valor monetario más alto encontrado en el texto
               // (Asumimos que en un ticket de comida, el número más grande suele ser el total)
               let totalAmount = 0;
               const allAmounts = tempItems.map(i => i.amount);
               // También buscamos números sueltos que podrían ser el total y no se parsearon como items
               const allNumbersRegex = /(\d+(?:[,.]\d{2}))/g;
               const numbersMatch = fullText.match(allNumbersRegex);
               if (numbersMatch) {
                   numbersMatch.forEach(numStr => {
                       const val = parseFloat(numStr.replace(',', '.'));
                       if (!isNaN(val)) allAmounts.push(val);
                   });
               }
               
               if (allAmounts.length > 0) {
                   totalAmount = Math.max(...allAmounts);
               }

               // 2. Construir la Nota: Unimos los nombres de los productos encontrados
               const noteDetails = tempItems
                   .map(i => i.description)
                   .join(", ");

               if (totalAmount > 0) {
                   finalResponseItems.push({
                       description: detectedMerchant, // El nombre es el comercio (ej. McDonald's)
                       amount: totalAmount,           // El monto es el total (el valor más grande)
                       note: noteDetails              // La nota es el desglose (ej. Cajita Feliz, Papas)
                   });
               }

           } else {
               // --- ESTRATEGIA 2: COMERCIO NO DETECTADO (Lógica de Inventario) ---
               // Devolvemos la lista detallada de productos tal cual (ej. Supermercado)
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