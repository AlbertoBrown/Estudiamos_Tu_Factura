// Copia de referencia del script desplegado en Google Apps Script.
// El código real vive en el editor de Apps Script del Google Sheet,
// no se ejecuta desde aquí.
const SECRET = 'TU-SECRETO'; // debe coincidir con GOOGLE_SHEETS_SECRET en Vercel
const CARPETA_RAIZ = 'Facturas - Estudiamos tu factura';

function obtenerCarpetaRaiz() {
  const it = DriveApp.getFoldersByName(CARPETA_RAIZ);
  return it.hasNext() ? it.next() : DriveApp.createFolder(CARPETA_RAIZ);
}

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  if (data.secret !== SECRET) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: 'unauthorized' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  let enlaceCarpeta = '';
  if (data.archivos && data.archivos.length) {
    const raiz = obtenerCarpetaRaiz();
    const nombreCarpeta = (data.fecha || '') + ' - ' + (data.nombre || 'Sin nombre');
    const carpeta = raiz.createFolder(nombreCarpeta);
    data.archivos.forEach(function (archivo) {
      try {
        const respuesta = UrlFetchApp.fetch(archivo.url, { muteHttpExceptions: true });
        if (respuesta.getResponseCode() === 200) {
          const blob = respuesta.getBlob().setName(archivo.nombre);
          carpeta.createFile(blob);
        }
      } catch (err) {
        // seguimos con el resto de archivos aunque uno falle
      }
    });
    enlaceCarpeta = '=HYPERLINK("' + carpeta.getUrl() + '";"Ver archivos")';
  }

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  sheet.appendRow([
    data.fecha,
    data.id,
    data.nombre,
    data.email,
    data.telefono,
    data.suministro,
    data.num_archivos,
    data.archivos_nombres,
    enlaceCarpeta
  ]);

  return ContentService.createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
