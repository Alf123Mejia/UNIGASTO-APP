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
        functions.logger.info(`Archivo recibido: fieldname=${fieldname}, filename=${filename}, mimeType=${mimeType}`);

        if (fieldname !== 'file') {
            functions.logger.warn(`Campo de archivo ignorado: ${fieldname}`);
            file.resume();
            return;
        }
        if (!mimeType.startsWith('image/')) {
          functions.logger.error(`Tipo no soportado: ${mimeType}`);
          fileError = new Error('Solo se permiten imágenes.');
          file.resume();
          return;
        }

        const uniqueFilename = `${Date.now()}-${path.basename(filename)}`;
        const filepath = path.join(tmpdir, uniqueFilename);
        imageFilePath = filepath;
        functions.logger.info(`Guardando en: ${filepath}`);

        const writeStream = fs.createWriteStream(filepath);
        file.pipe(writeStream);

        const promise = new Promise<void>((resolve, reject) => {
            file.on('error', (err: Error) => { functions.logger.error(`Error leyendo stream:`, err); fileError = err; writeStream.end(); reject(err); });
            writeStream.on('error', (err: Error) => { functions.logger.error(`Error escribiendo archivo:`, err); fileError = err; reject(err); });
            writeStream.on('finish', () => { functions.logger.info(`Archivo guardado.`); resolve(); });
        });
        fileWrites.push(promise);
    });

    bb.on('error', (err: Error) => {
        functions.logger.error('Error general de Busboy:', err);
        if (!fileError) fileError = err;
    });

    bb.on('close', async () => {
      functions.logger.info("Busboy 'close'.");

      if (fileError) {
          functions.logger.error("Error detectado:", fileError.message);
           if (imageFilePath && fs.existsSync(imageFilePath)) { try { fs.unlinkSync(imageFilePath); } catch(e){ functions.logger.error(`Error borrando archivo:`, e); } }
           if (!res.headersSent) {
               const msg = fileError.message.includes('imágenes') ? 'Tipo inválido.' : 'Error procesando archivo.';
               res.status(400).send({ error: msg });
           }
           return;
      }

      if (!fileDetected) {
        functions.logger.error("No se detectó archivo 'file'.");
        if (!res.headersSent) { res.status(400).send({ error: "No se envió imagen válida." }); }
        return;
      }

      try {
        await Promise.all(fileWrites);
        functions.logger.info(`Procesando: ${imageFilePath}`);

        if (!fs.existsSync(imageFilePath)) { throw new Error("Archivo temporal no existe."); }

        functions.logger.info("Iniciando Vision Client...");
        const visionClientLocal = new vision.ImageAnnotatorClient();
        const [result] = await visionClientLocal.textDetection(imageFilePath);
        functions.logger.info("Respuesta Vision OK.");
        const detections = result.textAnnotations;

        try { fs.unlinkSync(imageFilePath); functions.logger.info(`Archivo borrado.`);}
        catch (e) { functions.logger.error(`Error borrando archivo:`, e);}

        let items: { description: string; amount: number }[] = [];
        if (detections && detections.length > 0 && detections[0]?.description) {
           const fullText = detections[0].description;
           functions.logger.info("Texto detectado:\n---\n", fullText, "\n---");

           const lines = fullText.split("\n");

           // --- LÓGICA DE PARSEO MEJORADA ---
           
           // 1. Regex para precios: Busca números al final de la línea (ej: 12.50, 15, $20.00)
           const priceRegex = /(?:[\s$]|^)(\d+(?:[,.]\d{1,2})?)\s*$/;
           
           // 2. Regex para ignorar líneas que NO son productos (encabezados, totales, info del ticket)
           // Se agregó 'descripcion', 'cant', 'precio', 'ventas', 'gravadas' para evitar leer los encabezados
           const ignoreRegex = /^(total|subtotal|iva|propina|efectivo|cambio|impuesto|recibido|tarjeta|gracias|vuelto|cajero|atendido|fecha|hora|ticket|factura|descripcion|descrip|cant|precio|ventas|gravadas|exentas|p\.unit)/i;
           
           // 3. Regex para detectar y limpiar cantidades al inicio (ej: "1 ACEITE" -> "ACEITE")
           // Busca 1 a 3 dígitos al inicio seguidos de un espacio
           const quantityRegex = /^(\d{1,3})\s+/;

           functions.logger.info("Parseando líneas...");
           for (const line of lines) {
              const trimmedLine = line.trim();
              
              // Filtro 1: Ignorar líneas muy cortas o palabras clave prohibidas
              if (trimmedLine.length < 3 || ignoreRegex.test(trimmedLine)) continue;

              const match = trimmedLine.match(priceRegex);

              if (match && match[1]) {
                 try {
                    let priceStr = match[1].trim().replace(/,/g, ".");
                    const amount = parseFloat(priceStr);

                    if (!isNaN(amount) && amount > 0) {
                        // Extraer la descripción (todo lo que está antes del precio)
                        let description = trimmedLine.substring(0, match.index).trim();
                        
                        // Limpieza de símbolos raros al inicio/fin
                        description = description.replace(/^[^a-zA-Z0-9\u00E0-\u00FC]+|[^a-zA-Z0-9\u00E0-\u00FC\s]+$/g, "").trim();

                        // Filtro 2: Limpiar Cantidad ("1 ACEITE" -> "ACEITE")
                        // Si la descripción empieza con un número y espacio, lo quitamos
                        description = description.replace(quantityRegex, "");

                        // Filtro 3: Verificar que quede descripción válida después de limpiar
                        if (description.length > 1 && !ignoreRegex.test(description)) {
                           functions.logger.info(`Item OK: [Desc: "${description}", Monto: ${amount}]`);
                           items.push({ description, amount });
                        }
                    }
                 } catch (parseError) {
                     functions.logger.error(`Error parseando:`, parseError);
                 }
              }
           }
           // --- FIN LÓGICA MEJORADA ---
        } else {
          functions.logger.warn("No se detectó texto útil.");
        }

        functions.logger.info("Items finales:", items);
        if (!res.headersSent) {
             res.status(200).send({ items: items.length > 0 ? items : [], message: items.length === 0 ? 'No se encontraron gastos.' : undefined });
        }

      } catch (error) {
        functions.logger.error("Error OCR/Parseo:", error);
        if (imageFilePath && fs.existsSync(imageFilePath)) { try { fs.unlinkSync(imageFilePath); } catch(e){ functions.logger.error(`Error borrando:`, e); } }
        if (!res.headersSent) { res.status(500).send({ error: 'Error interno procesando imagen.' }); }
      }
    });

    if ((req as any).rawBody) {
      bb.end((req as any).rawBody);
    } else {
      req.pipe(bb);
    }

  });
});