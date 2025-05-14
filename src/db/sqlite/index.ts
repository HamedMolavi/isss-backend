import { isAbsolute, join } from 'path';
import { Database, OPEN_CREATE, OPEN_READWRITE, RunResult, Statement } from 'sqlite3';

export class SQLite {
	private static instance: Database | undefined;
	constructor(path: string, opts?: { recreate?: boolean }) {
		SQLite.init(path, opts);
	}

	static init(path: string, opts?: { recreate?: boolean }) {
		if (!SQLite.instance || !!opts?.recreate) {
			if (!isAbsolute(path)) path = join(process.cwd(), path);
			SQLite.instance = new Database(path, OPEN_READWRITE | OPEN_CREATE, (err: any) => {
				if (err) {
					console.log('Getting error ' + err);
					process.exit(1);
				}
				console.log('SQLite database created in ', path);
			});
		}
		return SQLite.instance;
	}

	static createTable(table: string) {
		if (!SQLite.instance) console.warn('Not affected: database is not initialized yet!');
		return SQLite.instance?.exec(
			`CREATE TABLE IF NOT EXISTS ${table} (_id TEXT PRIMARY KEY NOT NULL, hash TEXT NOT NULL);`,
			(err) => {
				if (!!err) {
					console.error(err);
					process.exit(1);
				}
			}
		);
	}

	static insert(table: string, data: { [key: string]: string }) {
		if (!SQLite.instance) console.warn('Not affected: database is not initialized yet!');
		let query = '';
		const values = Object.values(data)
			.map((el) => `'${el}'`)
			.join(', ');
		query = `INSERT INTO ${table} (${Object.keys(data).join(', ')}) VALUES (${values});`;
		return SQLite.instance?.run(
			query,
			function (this: RunResult, err: { errno: number; code: string; message: string } | undefined) {
				if (err) {
					console.error(err.errno, 'Error executing query:', err.message);
					// 19 Error executing query: SQLITE_CONSTRAINT: UNIQUE constraint failed: Log._id
				}
			}
		);
	}

	static insertMany(table: string, data: { [key: string]: string[] }) {
		if (!SQLite.instance) console.warn('Not affected: database is not initialized yet!');
		let query = '';
		const listOfListOfValues = Object.values(data).reduce(
			(res, values) => {
				for (let i = 0; i < values.length; i++) res[i].push(`'${values[i]}'`);
				return res;
			},
			Object.values(data)[0].map((_) => [] as Array<string>)
		);
		const listOfValues = listOfListOfValues.map((listOfValues) => '(' + listOfValues.join(', ') + ')');

		query = `INSERT INTO ${table} (${Object.keys(data).join(', ')}) VALUES 
  ${listOfValues.join(',\n')};`;
		return SQLite.instance?.run(
			query,
			function (this: RunResult, err: { errno: number; code: string; message: string } | undefined) {
				if (err) {
					console.error(err.errno, 'Error executing query:', err.message);
					console.log(this);
				}
			}
		);
	}

	static runQuery<T>(
		sql: string,
		callback?: ((this: Statement, err: Error | null, rows: T[]) => void) | undefined
	) {
		return SQLite.instance?.all(sql, callback);
	}
}
