import { createClient } from '@libsql/client';
import fs from 'fs';
import crypto from 'crypto';

const client = createClient({
  url: 'https://calendariomedico-rogerappfinanzas.aws-us-east-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTEwMDcwNzAsImlkIjoiMDFhMTAwNTYtN2QwMS03NmJlLWFhZGQtNzQ5ZmJlYzU4YjQ1Iiwia2lkIjoia0U4N0VVY25kcFdCZmFtWm1ySVo4UFpzWndIUTRoOFl4SHpIaUdOT0pGayIsInJpZCI6IjdhNDU3NTJkLTI2MmEtNDI2ZC1iNTMwLWVlOGQyYTU0YTYxNSJ9.9ea6JbiNF0i9watvJdcIAVQhAeRI0HhPC-wKT-AdUmsWjTaKa7Uu2Rg5XO06f1b76sULR-vcFboNmxlZO2XLBw',
});

function calculateSha256(filePath) {
  if (fs.existsSync(filePath)) {
    const fileBuffer = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
  }
  return null;
}

async function main() {
  const versionArg = process.argv[2] || '1.0.5';
  const notesArg = process.argv[3] || 'Actualización en vivo OTA con verificación SHA-256 y nombre de usuario en amarillo.';
  let checksumArg = process.argv[4] || null;

  if (!checksumArg) {
    checksumArg = calculateSha256('apk-output/dist.zip') || calculateSha256('dist.zip');
  }

  await client.execute(`
    CREATE TABLE IF NOT EXISTS app_versiones (
      id TEXT PRIMARY KEY,
      version TEXT NOT NULL,
      version_code INTEGER NOT NULL,
      download_url TEXT NOT NULL,
      checksum TEXT,
      notas TEXT,
      actualizado_en TEXT
    )
  `);

  try {
    await client.execute(`ALTER TABLE app_versiones ADD COLUMN checksum TEXT`);
  } catch {}

  const downloadUrl = 'https://github.com/repoRoger/CalendarioMedico/releases/latest/download/CalendarioMedico.apk';

  await client.execute({
    sql: `INSERT OR REPLACE INTO app_versiones (id, version, version_code, download_url, checksum, notas, actualizado_en)
          VALUES ('latest', ?, ?, ?, ?, ?, datetime('now'))`,
    args: [
      versionArg,
      Date.now(),
      downloadUrl,
      checksumArg,
      notesArg,
    ],
  });

  const res = await client.execute("SELECT * FROM app_versiones WHERE id = 'latest'");
  console.log('Fila actualizada en Turso con éxito:', res.rows[0]);
}

main().catch(console.error);
