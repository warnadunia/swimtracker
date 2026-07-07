import mysql from 'mysql2/promise';

let pool;

// Fungsi pembantu buat ngebersihin sisa-sisa tanda petik dari env
const cleanEnv = (val) => {
  if (!val) return val;
  return val.replace(/^['"]|['"]$/g, '');
};

export async function getDB() {
  if (!pool) {
    const host = cleanEnv(process.env.TIDB_HOST || process.env.DB_HOST);
    const user = cleanEnv(process.env.TIDB_USER || process.env.DB_USERNAME);
    const password = cleanEnv(process.env.TIDB_PASSWORD || process.env.DB_PASSWORD);
    const database = cleanEnv(process.env.TIDB_DATABASE || process.env.DB_DATABASE);
    const port = cleanEnv(process.env.TIDB_PORT || process.env.DB_PORT || '4000');

    if (!host) {
      throw new Error("Missing Database Host Environment Variable!");
    }

    pool = mysql.createPool({
      host: host,
      user: user,
      password: password,
      database: database,
      port: parseInt(port),
      ssl: {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: true
      },
      waitForConnections: true,
      connectionLimit: 5, 
      queueLimit: 0
    });
  }
  return pool;
}