import { createClient } from '@libsql/client';

const client = createClient({
  url: 'https://calendariomedico-rogerappfinanzas.aws-us-east-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTEwMDcwNzAsImlkIjoiMDFhMTAwNTYtN2QwMS03NmJlLWFhZGQtNzQ5ZmJlYzU4YjQ1Iiwia2lkIjoia0U4N0VVY25kcFdCZmFtWm1ySVo4UFpzWndIUTRoOFl4SHpIaUdOT0pGayIsInJpZCI6IjdhNDU3NTJkLTI2MmEtNDI2ZC1iNTMwLWVlOGQyYTU0YTYxNSJ9.9ea6JbiNF0i9watvJdcIAVQhAeRI0HhPC-wKT-AdUmsWjTaKa7Uu2Rg5XO06f1b76sULR-vcFboNmxlZO2XLBw',
});

async function main() {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS app_versiones (
      id TEXT PRIMARY KEY,
      version TEXT NOT NULL,
      version_code INTEGER NOT NULL,
      download_url TEXT NOT NULL,
      notas TEXT,
      actualizado_en TEXT
    )
  `);

  await client.execute({
    sql: `INSERT OR REPLACE INTO app_versiones (id, version, version_code, download_url, notas, actualizado_en)
          VALUES ('latest', ?, ?, ?, ?, datetime('now'))`,
    args: [
      '1.0.3',
      4,
      'https://github.com/repoRoger/CalendarioMedico/releases/latest/download/CalendarioMedico.apk',
      'Novedades v1.0.3: Espacio superior para barra de estado/WhatsApp, modos Modo Rápido, Libre (palmerita) y Eliminar dinámico en calendario, y actualización rápida en vivo sin salir de la app.',
    ],
  });

  const res = await client.execute("SELECT * FROM app_versiones WHERE id = 'latest'");
  console.log('Fila actualizada en Turso con éxito:', res.rows[0]);
}

main().catch(console.error);
