// Regrava `scripts/views-bi.sql` a partir do mapa de colunas (AD-051).
import { writeFileSync } from "node:fs";
import path from "node:path";
import { sqlDasViewsBi } from "../src/lib/respostas/views-bi";

writeFileSync(path.resolve(__dirname, "views-bi.sql"), sqlDasViewsBi());
