const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

async function initDatabase(dbPathArg) {
  const SQL = await initSqlJs();

  // App Runner has a read-only filesystem except for /tmp
  const dbPath = dbPathArg || (process.env.NODE_ENV === 'production' ? '/tmp/healthcare.db' : path.join(__dirname, 'healthcare.db'));

  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    console.log(`[INFO] Creating database directory: ${dbDir}`);
    fs.mkdirSync(dbDir, { recursive: true });
  }

  console.log(`[INFO] Initializing database at: ${dbPath}`);

  let db;
  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'doctor',
      specialty TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS patients (
      id TEXT PRIMARY KEY,
      mrn TEXT UNIQUE NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      date_of_birth TEXT NOT NULL,
      gender TEXT NOT NULL,
      blood_type TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      emergency_contact TEXT,
      emergency_phone TEXT,
      insurance_provider TEXT,
      insurance_id TEXT,
      primary_diagnosis TEXT,
      allergies TEXT,
      status TEXT DEFAULT 'active',
      risk_level TEXT DEFAULT 'low',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS encounters (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      encounter_type TEXT NOT NULL,
      date TEXT NOT NULL,
      provider TEXT,
      department TEXT,
      chief_complaint TEXT,
      diagnosis TEXT,
      notes TEXT,
      disposition TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id) REFERENCES patients(id)
    );

    CREATE TABLE IF NOT EXISTS lab_results (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      test_name TEXT NOT NULL,
      value TEXT NOT NULL,
      unit TEXT,
      reference_range TEXT,
      status TEXT DEFAULT 'normal',
      date TEXT NOT NULL,
      ordered_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id) REFERENCES patients(id)
    );

    CREATE TABLE IF NOT EXISTS medications (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      name TEXT NOT NULL,
      dosage TEXT NOT NULL,
      frequency TEXT NOT NULL,
      route TEXT DEFAULT 'oral',
      start_date TEXT NOT NULL,
      end_date TEXT,
      prescriber TEXT,
      status TEXT DEFAULT 'active',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id) REFERENCES patients(id)
    );

    CREATE TABLE IF NOT EXISTS vitals (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      date TEXT NOT NULL,
      heart_rate INTEGER,
      systolic_bp INTEGER,
      diastolic_bp INTEGER,
      temperature REAL,
      respiratory_rate INTEGER,
      oxygen_saturation REAL,
      weight REAL,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id) REFERENCES patients(id)
    );

    CREATE TABLE IF NOT EXISTS ai_summaries (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      summary_type TEXT NOT NULL,
      content TEXT NOT NULL,
      confidence REAL,
      generated_by TEXT DEFAULT 'mock-ai',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id) REFERENCES patients(id)
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      action TEXT NOT NULL,
      resource TEXT,
      resource_id TEXT,
      details TEXT,
      ip_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    `);

  // Initial save
  saveDatabase(db, dbPath);
  console.log('📦 Database initialized');

  return createDbWrapper(db, dbPath);
}

function saveDatabase(db, dbPath) {
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  } catch (err) {
    console.error(`[ERROR] Failed to save database to ${dbPath}:`, err.message);
  }
}

function createDbWrapper(db, dbPath) {
  return {
    prepare(sql) {
      return {
        run(...params) {
          db.run(sql, params);
          saveDatabase(db, dbPath);
          return { changes: 1 };
        },
        get(...params) {
          const stmt = db.prepare(sql);
          stmt.bind(params);
          let result = null;
          if (stmt.step()) {
            result = stmt.getAsObject();
          }
          stmt.free();
          return result;
        },
        all(...params) {
          const results = [];
          const stmt = db.prepare(sql);
          stmt.bind(params);
          while (stmt.step()) {
            results.push(stmt.getAsObject());
          }
          stmt.free();
          return results;
        }
      };
    },
    run(sql, params = []) {
      db.run(sql, params);
      saveDatabase(db, dbPath);
    },
    save() {
      saveDatabase(db, dbPath);
    }
  };
}

module.exports = { initDatabase };
