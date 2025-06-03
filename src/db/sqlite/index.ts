import { isAbsolute, join } from 'path';
import { Database, OPEN_CREATE, OPEN_READWRITE, RunResult, Statement } from 'sqlite3';

export class SQLite {
	private static instance: Database | undefined;
	constructor(path: string, opts?: { recreate?: boolean }) {
		SQLite.init(path, opts);
	}

	static init(path: string, opts?: { recreate?: boolean }) {
		if (!SQLite.instance || opts?.recreate) {
			if (!isAbsolute(path)) path = join(process.cwd(), path);
			SQLite.instance = new Database(path, OPEN_READWRITE | OPEN_CREATE, (err: Error | null) => {
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
				if (err) {
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
			Object.values(data)[0].map(() => [] as Array<string>)
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
		params?: (string | number | boolean | null)[],
		callback?: ((this: Statement, err: Error | null, rows: T[]) => void) | undefined
	) {
		if (params && callback) {
			return SQLite.instance?.all(sql, params, callback);
		} else if (callback) {
			return SQLite.instance?.all(sql, callback);
		} else {
			return SQLite.instance?.all(sql, params);
		}
	}

	/**
	 * Delete records from a table based on conditions
	 */
	static delete(table: string, conditions: { [key: string]: string | string[] }): Promise<number> {
		return new Promise((resolve, reject) => {
			if (!SQLite.instance) {
				console.warn('Not affected: database is not initialized yet!');
				return resolve(0);
			}

			// Build WHERE clause
			const whereConditions = Object.entries(conditions).map(([key, value]) => {
				if (Array.isArray(value)) {
					const placeholders = value.map(() => '?').join(', ');
					return `${key} IN (${placeholders})`;
				} else {
					return `${key} = ?`;
				}
			});

			const whereClause = whereConditions.join(' AND ');
			const query = `DELETE FROM ${table} WHERE ${whereClause};`;

			// Flatten values for parameter binding
			const values = Object.values(conditions).flat();

			SQLite.instance.run(
				query,
				values,
				function (this: RunResult, err: { errno: number; code: string; message: string } | undefined) {
					if (err) {
						console.error(err.errno, 'Error executing delete query:', err.message);
						reject(new Error(`SQLite delete error: ${err.message}`));
					} else {
						resolve(this.changes || 0);
					}
				}
			);
		});
	}

	/**
	 * Delete specific records by IDs
	 */
	static deleteByIds(table: string, ids: string[]): Promise<number> {
		if (ids.length === 0) {
			return Promise.resolve(0);
		}
		return this.delete(table, { _id: ids });
	}
}
