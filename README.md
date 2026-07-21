# Control Financiero del Hogar (MVP)

Este proyecto es un MVP (Producto Mínimo Viable) diseñado para importar, unificar y visualizar extractos bancarios de **N26**, **Unicaja** y **Sabadell** sin necesidad de backend, almacenando los datos de forma 100% privada y local en el navegador del usuario.

## Características

- **Unificación de Extractos**: Permite seleccionar múltiples archivos `.csv`, `.xls`, `.xlsx` simultáneamente, convirtiendo sus formatos al modelo unificado `BankMovement`.
- **Detección Automática**: Identifica el banco emisor analizando las cabeceras internas del archivo.
- **Validación Contable (Sección 11)**: Verifica que la suma total de los importes originales coincida exactamente con la suma de los movimientos transformados antes de guardarlos. Si no coinciden, invalida el archivo para prevenir descuadres.
- **Prevención de Duplicados (Sección 9)**: Genera un hash SHA-256 (fingerprint) único para cada movimiento a partir de sus campos normalizados, previniendo que se dupliquen registros al importar repetidamente los mismos archivos.
- **Persistencia Local**: Conserva los movimientos entre sesiones en una base de datos local **IndexedDB** usando la capa ligera **Dexie.js**.
- **Panel de Calidad (Sección 14)**: Incluye un banco de pruebas interactivo dentro de la aplicación para validar automáticamente todas las reglas de negocio del MVP.

---

## Comandos para Instalar y Arrancar

Para ejecutar este proyecto de forma local, sigue estos comandos en tu terminal:

1. **Instalar dependencias**:
   ```bash
   npm install
   ```

2. **Arrancar en modo desarrollo**:
   ```bash
   npm run dev
   ```

3. **Construir para producción**:
   ```bash
   npm run build
   ```

---

## ¿Dónde se guardan los datos?

Todos los movimientos y datos bancarios importados se guardan de forma segura y privada en el navegador web del usuario a través de **IndexedDB** (envolviéndola con la biblioteca **Dexie.js**). 
- **Persistencia**: Los datos se conservan entre recargas de página y reinicios del navegador.
- **Privacidad**: Ningún dato se envía a servidores externos ni a servicios en la nube. Todo el procesamiento y almacenamiento es 100% cliente.

---

## Cómo añadir un nuevo parser bancario

La arquitectura del MVP está diseñada de manera modular y desacoplada para añadir soporte a nuevas entidades fácilmente:

1. **Crear el parser**:
   Crea un archivo en `/src/parsers/` (por ejemplo, `miBancoParser.ts`). Define una función de parseo que lea la hoja de cálculo de SheetJS (`XLSX.WorkSheet`) y devuelva un objeto `ParserOutput` que cumpla con los campos normalizados y los totales de comprobación.

2. **Registrar la detección**:
   En `/src/parsers/parserDetector.ts`, añade la lógica de reconocimiento del nuevo banco mediante la detección de cabeceras únicas presentes en los archivos de dicho banco.

3. **Vincular en el servicio central**:
   En `/src/services/importService.ts`, importa tu nuevo parser e intégralo en el bloque condicional de la función `processFile`.
