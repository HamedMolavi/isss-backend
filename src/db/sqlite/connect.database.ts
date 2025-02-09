import { SQLite } from ".";

export async function connectToSQLite(path: string, opts?: { recreate?: boolean; }) {
  SQLite.init(path, opts);
  return SQLite;
}