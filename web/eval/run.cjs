// Ejecuta un .ts del directorio eval con el alias "@/..." de la app.
const path = require("node:path");
const { createJiti } = require("jiti");
const jiti = createJiti(__filename, { alias: { "@": path.join(__dirname, "..", "src") } });
jiti.import(path.resolve(process.argv[2])).catch((e) => { console.error(e); process.exit(1); });
