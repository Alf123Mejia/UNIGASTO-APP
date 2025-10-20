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
import * as stream from "stream"; // Necesario para el tipo Readable
import vision from "@google-cloud/vision";

// NO inicializar aquí para evitar timeouts
// const visionClient = new vision.ImageAnnotatorClient();

export const processReceipt = functions.https.onRequest((req, res) => {
  // Llama directamente a la función cors que importamos con require
  cors(req, res, async () => {
    if (req.method !== "POST") {
      res.set('Allow', 'POST');
      res.status(405).send({ error: "Method Not Allowed" });
      return;
    }

    // Tipado explícito usando el tipo inferido de Busboy con require
    let bb: busboy.Busboy;
    try {
      // Usa el constructor obtenido con require
      bb = busboy({ headers: req.headers });
    } catch (e) {
      console.error("Error inicializando Busboy:", e);
      res.status(400).send({ error: "Cabeceras inválidas." });
      return;
    }

    const tmpdir = os.tmpdir();
    const fileWrites: Promise<void>[] = [];
    let imageFilePath = "";
    let fileDetected = false;
    let fileError = false;

    // Tipos explícitos usando los tipos del namespace Busboy inferido por require
    bb.on("file", (fieldname: string, file: stream.Readable, info: busboy.FileInfo) => {
        fileDetected = true;
        // Quitando 'encoding' para evitar el warning TS6133
        const { filename = 'unknownfile', mimeType } = info;
        console.log(`Evento 'file' recibido: fieldname=${fieldname}, filename=${filename}, mimeType=${mimeType}`);

        if (!mimeType.startsWith("image/")) {
          console.error("Tipo de archivo no soportado:", mimeType);
          fileError = true;
          file.resume(); // Importante consumir el stream
          return;
        }

        console.log(`Procesando archivo: ${filename} (${mimeType})`);
        const uniqueFilename = `${Date.now()}-${path.basename(filename)}`;
        const filepath = path.join(tmpdir, uniqueFilename);
        imageFilePath = filepath;

        const writeStream = fs.createWriteStream(filepath);
        file.pipe(writeStream);

        const promise = new Promise<void>((resolve, reject) => {
          file.on("end", () => console.log(`Stream 'end' para ${filename}`));
          writeStream.on("finish", () => { console.log(`WriteStream 'finish' para ${filepath}`); resolve(); });
          writeStream.on("error", (err: Error) => { console.error(`Error escribiendo archivo ${filepath}:`, err); fileError = true; reject(err); });
          file.on("error", (err: Error) => { console.error(`Error leyendo stream para ${filename}:`, err); fileError = true; reject(err); });
        });
        fileWrites.push(promise);
    });

    bb.on('error', (err: Error) => {
      console.error('Error general de Busboy:', err);
      fileError = true;
    });

    bb.on("close", async () => { // Usar 'close'
      console.log("Busboy 'close' event triggered.");

      // Manejo de errores centralizado
      if (fileError) {
          console.log("Se detectó un error de archivo previo.");
           if (!res.headersSent) { res.status(400).send({ error: "Error procesando el archivo. Asegúrate de que sea una imagen válida." }); }
           // Intentar borrar archivo si existe
           if (imageFilePath && fs.existsSync(imageFilePath)) { try { fs.unlinkSync(imageFilePath); } catch (e) { console.error("Error borrando archivo tras error:", e);} }
           return;
      }
      if (!fileDetected) {
          console.error("No se envió ningún archivo.");
          if (!res.headersSent) { res.status(400).send({ error: "No se encontró ningún archivo en la petición." }); }
          return;
      }

      // Procesamiento principal si no hubo errores
      try {
        await Promise.all(fileWrites);
        console.log("Archivos escritos. Procesando:", imageFilePath);

        if (!imageFilePath || !fs.existsSync(imageFilePath)) {
             console.error("El archivo de imagen temporal no existe después de escribir.");
             throw new Error("Error interno guardando la imagen.");
        }

        // Inicialización "Perezosa" del cliente de Vision
        console.log("Inicializando Vision Client...");
        const visionClientLocal = new vision.ImageAnnotatorClient(); // Crear instancia aquí

        console.log("Llamando a Vision API...");
        const [result] = await visionClientLocal.textDetection(imageFilePath); // Usar la instancia local
        console.log("Respuesta de Vision API recibida.");
        const detections = result.textAnnotations;

        // Limpieza temprana
        try { fs.unlinkSync(imageFilePath); console.log("Archivo temporal borrado.");}
        catch (e) { console.error("Error borrando archivo temporal (post-vision):", e);}

        if (!detections || detections.length === 0 || !detections[0]?.description) {
          console.log("No se detectó texto útil.");
           if (!res.headersSent) res.status(400).send({ error: "No se pudo leer texto en la imagen." });
          return;
        }

        const fullText = detections[0].description;
        console.log("Texto completo detectado:\n---\n", fullText, "\n---");

        // --- PARSEO BÁSICO ---
        const lines = fullText.split("\n");
        const items: { description: string; amount: number }[] = [];
        const priceRegex = /(?:[\s$]|^)(\d+[,.]\d{1,2})\s*$/;
        const ignoreRegex = /^(total|subtotal|iva|propina|efectivo|cambio|impuesto|recibido|tarjeta|gracias|vuelto|cajero|atendido por)/i;

        console.log("Parseando líneas...");
        for (const line of lines) {
          const trimmedLine = line.trim();
          if (trimmedLine.length < 3 || ignoreRegex.test(trimmedLine)) continue;
          const match = trimmedLine.match(priceRegex);
          if (match && match[1]) {
            let priceStr = match[1].trim().replace(/,/g, ".");
            const amount = parseFloat(priceStr);
            if (!isNaN(amount) && amount > 0) {
              let description = trimmedLine.substring(0, match.index).trim();
              description = description.replace(/^[^a-zA-Z0-9\u00E0-\u00FC]+|[^a-zA-Z0-9\u00E0-\u00FC\s]+$/g, "").trim();
              if (description.length > 1 && !ignoreRegex.test(description)) {
                console.log(`Item encontrado: [Desc: "${description}", Monto: ${amount}]`);
                items.push({ description, amount });
              }
            }
          }
        }

        console.log("Items parseados final:", items);
        if (!res.headersSent) res.status(200).send({ items });

      } catch (error) {
        console.error("Error en bloque 'close' (API call o parseo):", error);
        if (imageFilePath && fs.existsSync(imageFilePath)) { try { fs.unlinkSync(imageFilePath); } catch (e) { console.error("Error borrando archivo temporal tras error:", e);} }
        if (!res.headersSent) res.status(500).send({ error: "Error interno procesando la imagen." });
      }
    }); // Fin bb.on('close')

     req.pipe(bb); // Inicia el procesamiento

  }); // Fin corsHandler
}); // Fin https.onRequest