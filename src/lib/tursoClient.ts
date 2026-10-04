import { createClient, Client } from '@libsql/client/web';
import { MedicalShift, Hospital, ShiftTemplate, UserSession } from '../types';

export interface TursoSyncResult {
  success: boolean;
  message: string;
  syncedShiftsCount?: number;
  syncedHospitalsCount?: number;
}

let cachedClient: Client | null = null;
let currentConfig = { url: '', token: '' };

export function getTursoClient(databaseUrl: string, authToken: string): Client {
  let normalizedUrl = databaseUrl.trim();
  // Ensure http/https scheme if libsql:// is given for browser fetch
  if (normalizedUrl.startsWith('libsql://')) {
    normalizedUrl = normalizedUrl.replace('libsql://', 'https://');
  }

  if (cachedClient && currentConfig.url === normalizedUrl && currentConfig.token === authToken) {
    return cachedClient;
  }

  cachedClient = createClient({
    url: normalizedUrl,
    authToken: authToken.trim(),
  });
  currentConfig = { url: normalizedUrl, token: authToken.trim() };
  return cachedClient;
}

/**
 * Ensures the multi-tenant database tables exist in Turso,
 * using `cliente_correo` column for filtering by user.
 */
export async function initializeTursoTables(client: Client): Promise<void> {
  // Table: turnos
  await client.execute(`
    CREATE TABLE IF NOT EXISTS turnos (
      id TEXT PRIMARY KEY,
      cliente_correo TEXT NOT NULL,
      fecha TEXT NOT NULL,
      hospital_id TEXT NOT NULL,
      codigo_turno TEXT NOT NULL,
      titulo TEXT NOT NULL,
      hora_inicio TEXT NOT NULL,
      hora_fin TEXT NOT NULL,
      horas REAL NOT NULL,
      departamento TEXT,
      notas TEXT,
      es_nocturno INTEGER DEFAULT 0,
      es_sustituto INTEGER DEFAULT 0,
      creado_en TEXT
    )
  `);

  // Index on cliente_correo and fecha for fast queries
  await client.execute(`
    CREATE INDEX IF NOT EXISTS idx_turnos_usuario_fecha 
    ON turnos(cliente_correo, fecha)
  `);

  // Table: hospitales
  await client.execute(`
    CREATE TABLE IF NOT EXISTS hospitales (
      id TEXT PRIMARY KEY,
      cliente_correo TEXT NOT NULL,
      nombre TEXT NOT NULL,
      nombre_corto TEXT NOT NULL,
      tipo_negocio TEXT,
      ciudad TEXT NOT NULL,
      color TEXT,
      gradiente_inicio TEXT,
      gradiente_fin TEXT,
      icono_badge TEXT,
      logo_url TEXT
    )
  `);

  // Migration: ensure tipo_negocio exists if table was created in older schema
  try {
    await client.execute(`ALTER TABLE hospitales ADD COLUMN tipo_negocio TEXT`);
  } catch {
    // Column already exists, safe to ignore
  }

  // Index on cliente_correo
  await client.execute(`
    CREATE INDEX IF NOT EXISTS idx_hospitales_usuario 
    ON hospitales(cliente_correo)
  `);

  // Table: plantillas
  await client.execute(`
    CREATE TABLE IF NOT EXISTS plantillas_turnos (
      id TEXT PRIMARY KEY,
      cliente_correo TEXT NOT NULL,
      codigo TEXT NOT NULL,
      nombre TEXT NOT NULL,
      inicio_defecto TEXT NOT NULL,
      fin_defecto TEXT NOT NULL,
      horas_defecto REAL NOT NULL,
      es_nocturno INTEGER DEFAULT 0
    )
  `);

  // Table: usuarios (guarda datos de perfil, contraseña y foto_blob directamente en Turso sin R2)
  await client.execute(`
    CREATE TABLE IF NOT EXISTS usuarios (
      cliente_correo TEXT PRIMARY KEY,
      titulo_prefijo TEXT,
      nombre_personal TEXT,
      nombre_completo TEXT,
      rol TEXT,
      especialidad TEXT,
      telefono TEXT,
      foto_blob TEXT,
      password_hash TEXT,
      creado_con_google INTEGER DEFAULT 0,
      actualizado_en TEXT
    )
  `);

  // Migrations for existing database
  try {
    await client.execute(`ALTER TABLE usuarios ADD COLUMN password_hash TEXT`);
  } catch {}
  try {
    await client.execute(`ALTER TABLE usuarios ADD COLUMN creado_con_google INTEGER DEFAULT 0`);
  } catch {}
}

/**
 * Loads shifts for a specific user from Turso.
 */
export async function fetchShiftsFromTurso(
  client: Client,
  clienteCorreo: string
): Promise<MedicalShift[]> {
  const result = await client.execute({
    sql: `SELECT * FROM turnos WHERE cliente_correo = ? ORDER BY fecha ASC, hora_inicio ASC`,
    args: [clienteCorreo.trim().toLowerCase()],
  });

  return result.rows.map((row) => ({
    id: String(row.id),
    date: String(row.fecha),
    hospitalId: String(row.hospital_id),
    shiftCode: row.codigo_turno as any,
    title: String(row.titulo),
    startTime: String(row.hora_inicio),
    endTime: String(row.hora_fin),
    hours: Number(row.horas),
    department: row.departamento ? String(row.departamento) : '',
    notes: row.notas ? String(row.notas) : '',
    isNightShift: Boolean(row.es_nocturno),
    isSubstitute: Boolean(row.es_sustituto),
  }));
}

/**
 * Loads hospitals for a specific user from Turso.
 */
export async function fetchHospitalsFromTurso(
  client: Client,
  clienteCorreo: string
): Promise<Hospital[]> {
  const result = await client.execute({
    sql: `SELECT * FROM hospitales WHERE cliente_correo = ?`,
    args: [clienteCorreo.trim().toLowerCase()],
  });

  if (result.rows.length === 0) {
    return [];
  }

  return result.rows.map((row) => ({
    id: String(row.id),
    name: String(row.nombre),
    shortName: String(row.nombre_corto),
    businessType: row.tipo_negocio ? String(row.tipo_negocio) : undefined,
    city: String(row.ciudad),
    color: String(row.color || '#0d9488'),
    gradientStart: String(row.gradiente_inicio || '#0d9488'),
    gradientEnd: String(row.gradiente_fin || '#059669'),
    badgeIcon: (row.icono_badge as any) || 'hospital',
    logoUrl: row.logo_url ? String(row.logo_url) : undefined,
  }));
}

/**
 * Uploads/Syncs local shifts, hospitals and templates to Turso for a specific user.
 */
export async function syncLocalDataToTurso(
  client: Client,
  clienteCorreo: string,
  shifts: MedicalShift[],
  hospitals: Hospital[],
  templates: ShiftTemplate[]
): Promise<TursoSyncResult> {
  const email = clienteCorreo.trim().toLowerCase();

  try {
    await initializeTursoTables(client);

    // Save hospitals in batch (isolated to never block shifts)
    for (const h of hospitals) {
      try {
        await client.execute({
          sql: `
            INSERT INTO hospitales (id, cliente_correo, nombre, nombre_corto, tipo_negocio, ciudad, color, gradiente_inicio, gradiente_fin, icono_badge, logo_url)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              nombre = excluded.nombre,
              nombre_corto = excluded.nombre_corto,
              tipo_negocio = excluded.tipo_negocio,
              ciudad = excluded.ciudad,
              color = excluded.color,
              gradiente_inicio = excluded.gradiente_inicio,
              gradiente_fin = excluded.gradiente_fin,
              icono_badge = excluded.icono_badge,
              logo_url = excluded.logo_url
          `,
          args: [
            h.id,
            email,
            h.name,
            h.shortName,
            h.businessType || null,
            h.city,
            h.color,
            h.gradientStart,
            h.gradientEnd,
            h.badgeIcon,
            h.logoUrl || null,
          ],
        });
      } catch (hErr) {
        console.warn('Error saving hospital to Turso:', h.name, hErr);
      }
    }

    // Clean up any hospitals deleted locally for this user
    if (hospitals.length > 0) {
      const hPlaceholders = hospitals.map(() => '?').join(',');
      await client.execute({
        sql: `DELETE FROM hospitales WHERE cliente_correo = ? AND id NOT IN (${hPlaceholders})`,
        args: [email, ...hospitals.map((h) => h.id)],
      });
    } else {
      await client.execute({
        sql: `DELETE FROM hospitales WHERE cliente_correo = ?`,
        args: [email],
      });
    }

    // Save shifts
    for (const s of shifts) {
      await client.execute({
        sql: `
          INSERT INTO turnos (id, cliente_correo, fecha, hospital_id, codigo_turno, titulo, hora_inicio, hora_fin, horas, departamento, notas, es_nocturno, es_sustituto, creado_en)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            fecha = excluded.fecha,
            hospital_id = excluded.hospital_id,
            codigo_turno = excluded.codigo_turno,
            titulo = excluded.titulo,
            hora_inicio = excluded.hora_inicio,
            hora_fin = excluded.hora_fin,
            horas = excluded.horas,
            departamento = excluded.departamento,
            notas = excluded.notas,
            es_nocturno = excluded.es_nocturno,
            es_sustituto = excluded.es_sustituto
        `,
        args: [
          s.id,
          email,
          s.date,
          s.hospitalId,
          s.shiftCode,
          s.title,
          s.startTime,
          s.endTime,
          s.hours,
          s.department || null,
          s.notes || null,
          s.isNightShift ? 1 : 0,
          s.isSubstitute ? 1 : 0,
          new Date().toISOString(),
        ],
      });
    }

    // Clean up any shifts deleted locally for this user
    if (shifts.length > 0) {
      const placeholders = shifts.map(() => '?').join(',');
      await client.execute({
        sql: `DELETE FROM turnos WHERE cliente_correo = ? AND id NOT IN (${placeholders})`,
        args: [email, ...shifts.map((s) => s.id)],
      });
    } else {
      await client.execute({
        sql: `DELETE FROM turnos WHERE cliente_correo = ?`,
        args: [email],
      });
    }

    return {
      success: true,
      message: `¡Sincronizado con Turso con éxito! Guardados ${shifts.length} turnos y ${hospitals.length} hospitales para ${email}.`,
      syncedShiftsCount: shifts.length,
      syncedHospitalsCount: hospitals.length,
    };
  } catch (err: any) {
    console.error('Turso sync error:', err);
    return {
      success: false,
      message: `Error al sincronizar con Turso: ${err.message || 'Error de conexión'}`,
    };
  }
}

/**
 * Fetches real-time counts from Turso database for verification
 */
export async function fetchTursoStats(
  client: Client,
  clienteCorreo: string
): Promise<{ shiftsCount: number; hospitalsCount: number }> {
  try {
    const email = clienteCorreo.trim().toLowerCase();
    const shiftsRes = await client.execute({
      sql: `SELECT COUNT(*) as c FROM turnos WHERE cliente_correo = ?`,
      args: [email],
    });
    const hospRes = await client.execute({
      sql: `SELECT COUNT(*) as c FROM hospitales WHERE cliente_correo = ?`,
      args: [email],
    });
    return {
      shiftsCount: Number(shiftsRes.rows[0]?.c || 0),
      hospitalsCount: Number(hospRes.rows[0]?.c || 0),
    };
  } catch (err) {
    console.warn('Error fetching Turso stats:', err);
    return { shiftsCount: 0, hospitalsCount: 0 };
  }
}

/**
 * Smart Bidirectional Shift Merger:
 * Combines local shifts with remote shifts without dropping either.
 */
export function mergeShifts(local: MedicalShift[], remote: MedicalShift[]): MedicalShift[] {
  const map = new Map<string, MedicalShift>();

  // Add all remote shifts first
  for (const s of remote) {
    map.set(s.id, s);
  }

  // Add local shifts (prevent duplicate if date, time, and hospital match)
  for (const s of local) {
    if (!map.has(s.id)) {
      const duplicate = Array.from(map.values()).find(
        (existing) =>
          existing.date === s.date &&
          existing.startTime === s.startTime &&
          existing.hospitalId === s.hospitalId
      );
      if (!duplicate) {
        map.set(s.id, s);
      }
    }
  }

  return Array.from(map.values()).sort(
    (a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime)
  );
}

export function mergeHospitals(local: Hospital[], remote: Hospital[]): Hospital[] {
  const map = new Map<string, Hospital>();
  for (const h of remote) {
    map.set(h.id, h);
  }
  for (const h of local) {
    if (!map.has(h.id)) {
      map.set(h.id, h);
    }
  }
  return Array.from(map.values());
}

/**
 * Deletes a single hospital directly from Turso database immediately.
 */
export async function deleteHospitalFromTurso(
  client: Client,
  clienteCorreo: string,
  hospitalId: string
): Promise<boolean> {
  try {
    const email = clienteCorreo.trim().toLowerCase();
    await client.execute({
      sql: `DELETE FROM hospitales WHERE cliente_correo = ? AND id = ?`,
      args: [email, hospitalId],
    });
    return true;
  } catch (err) {
    console.warn('Error deleting hospital from Turso:', err);
    return false;
  }
}

/**
 * Saves or updates user profile (including photo blob) directly in Turso.
 */
export async function saveUserProfileToTurso(client: Client, user: UserSession): Promise<boolean> {
  try {
    await initializeTursoTables(client);
    const email = user.email.trim().toLowerCase();
    await client.execute({
      sql: `
        INSERT INTO usuarios (cliente_correo, titulo_prefijo, nombre_personal, nombre_completo, rol, especialidad, telefono, foto_blob, actualizado_en)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(cliente_correo) DO UPDATE SET
          titulo_prefijo = excluded.titulo_prefijo,
          nombre_personal = excluded.nombre_personal,
          nombre_completo = excluded.nombre_completo,
          rol = excluded.rol,
          especialidad = excluded.especialidad,
          telefono = excluded.telefono,
          foto_blob = excluded.foto_blob,
          actualizado_en = excluded.actualizado_en
      `,
      args: [
        email,
        user.titlePrefix || 'Licda.',
        user.personalName || user.name,
        user.name,
        user.role || 'Enfermería',
        user.specialty || '',
        user.phone || '',
        user.photoBlob || null,
        new Date().toISOString(),
      ],
    });
    return true;
  } catch (err) {
    console.error('Error saving user profile to Turso:', err);
    return false;
  }
}

/**
 * Loads user profile from Turso if exists.
 */
export async function fetchUserProfileFromTurso(client: Client, email: string): Promise<Partial<UserSession> | null> {
  try {
    const res = await client.execute({
      sql: `SELECT * FROM usuarios WHERE cliente_correo = ?`,
      args: [email.trim().toLowerCase()],
    });
    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      titlePrefix: String(row.titulo_prefijo || 'Licda.'),
      personalName: String(row.nombre_personal || ''),
      name: String(row.nombre_completo || ''),
      role: String(row.rol || 'Enfermería'),
      specialty: String(row.especialidad || ''),
      phone: String(row.telefono || ''),
      photoBlob: row.foto_blob ? String(row.foto_blob) : undefined,
    };
  } catch (err) {
    console.error('Error fetching user from Turso:', err);
    return null;
  }
}

/**
 * SHA-256 password hash using standard Web Crypto API
 */
export async function hashPassword(password: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(`salt_calendariomedico_2026_${password}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export interface AuthResult {
  success: boolean;
  message?: string;
  user?: Partial<UserSession>;
}

/**
 * Registers a new user with email and password in Turso.
 */
export async function registerUserWithPassword(
  client: Client,
  email: string,
  password: string,
  fullName: string
): Promise<AuthResult> {
  try {
    await initializeTursoTables(client);
    const cleanEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existing = await client.execute({
      sql: `SELECT cliente_correo, password_hash, creado_con_google FROM usuarios WHERE cliente_correo = ?`,
      args: [cleanEmail],
    });

    if (existing.rows.length > 0) {
      const row = existing.rows[0];
      if (row.password_hash) {
        return {
          success: false,
          message: 'Este correo ya tiene una cuenta registrada. Inicia sesión con tu contraseña.',
        };
      } else if (Number(row.creado_con_google) === 1) {
        return {
          success: false,
          message: 'Este correo fue registrado previamente con Google. Inicia sesión con Google.',
        };
      }
    }

    const hashedPassword = await hashPassword(password);
    const now = new Date().toISOString();

    await client.execute({
      sql: `
        INSERT INTO usuarios (cliente_correo, nombre_personal, nombre_completo, password_hash, creado_con_google, actualizado_en)
        VALUES (?, ?, ?, ?, 0, ?)
        ON CONFLICT(cliente_correo) DO UPDATE SET
          password_hash = excluded.password_hash,
          nombre_completo = excluded.nombre_completo,
          actualizado_en = excluded.actualizado_en
      `,
      args: [cleanEmail, fullName, fullName, hashedPassword, now],
    });

    return {
      success: true,
      user: {
        email: cleanEmail,
        personalName: fullName,
        name: fullName,
        titlePrefix: '',
        role: 'Personal de Salud',
      },
    };
  } catch (err: any) {
    console.error('Error registrando usuario en Turso:', err);
    return {
      success: false,
      message: err.message || 'Error al conectar con la base de datos Turso.',
    };
  }
}

/**
 * Authenticates an existing user with email and password from Turso.
 */
export async function loginUserWithPassword(
  client: Client,
  email: string,
  password: string
): Promise<AuthResult> {
  try {
    await initializeTursoTables(client);
    const cleanEmail = email.trim().toLowerCase();

    const res = await client.execute({
      sql: `SELECT * FROM usuarios WHERE cliente_correo = ?`,
      args: [cleanEmail],
    });

    if (res.rows.length === 0) {
      return {
        success: false,
        message: 'No existe ninguna cuenta registrada con este correo. Puedes crear tu cuenta en la pestaña "Crear Cuenta".',
      };
    }

    const row = res.rows[0];
    const storedHash = row.password_hash ? String(row.password_hash) : null;

    if (!storedHash) {
      return {
        success: false,
        message: 'Esta cuenta fue creada originalmente con Google. Por favor inicia sesión con el botón de Google.',
      };
    }

    const computedHash = await hashPassword(password);
    if (computedHash !== storedHash) {
      return {
        success: false,
        message: 'Contraseña incorrecta. Por favor verifica tus datos.',
      };
    }

    return {
      success: true,
      user: {
        email: cleanEmail,
        titlePrefix: String(row.titulo_prefijo || ''),
        personalName: String(row.nombre_personal || ''),
        name: String(row.nombre_completo || cleanEmail.split('@')[0]),
        role: String(row.rol || 'Enfermería'),
        specialty: String(row.especialidad || ''),
        phone: String(row.telefono || ''),
        photoBlob: row.foto_blob ? String(row.foto_blob) : undefined,
      },
    };
  } catch (err: any) {
    console.error('Error iniciando sesión en Turso:', err);
    return {
      success: false,
      message: err.message || 'Error de conexión con Turso.',
    };
  }
}


