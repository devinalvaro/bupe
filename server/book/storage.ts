import { Database } from "@db/sqlite";
import * as path from "@std/path";
import { NoSuchElementException } from "effect/Cause";

import { ZipReader } from "../eval/reader.ts";
import { BookId, BookMeta, BookPosition } from "../../common/book/types.ts";

export interface BookStorage {
	saveBook: (id: BookId, data: Uint8Array) => Promise<void>;
	readBook: (id: BookId) => Promise<ZipReader>;
	insertBook: (meta: BookMeta) => void;
	selectBook: (id: BookId) => BookMeta;
	selectBooks: () => BookMeta[];
	updateBookPosition: (id: BookId, position: BookPosition) => void;
}

export function createBookStorage(db: Database): BookStorage {
	return new BookStorageImpl(db);
}

class BookStorageImpl {
	private readonly dir = "./books/";

	private readonly db: Database;

	constructor(db: Database) {
		Deno.mkdir(this.dir, { recursive: true });

		db.prepare(`CREATE TABLE IF NOT EXISTS books (
	pk BIGINT PRIMARY KEY,
	id CHAR(8),
	title TEXT NOT NULL,
	authors TEXT NOT NULL,
	position TEXT NOT NULL
)`).run();

		db.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS books_id ON books (id)`).run();

		this.db = db;
	}

	async saveBook(id: BookId, data: Uint8Array): Promise<void> {
		const filename = `${id}.epub`;
		await Deno.writeFile(path.join(this.dir, filename), data);
	}

	async readBook(id: BookId): Promise<ZipReader> {
		const filename = `${id}.epub`;
		const data = await Deno.readFile(path.join(this.dir, filename));
		return ZipReader.from(data);
	}

	insertBook(meta: BookMeta): void {
		const stmt = this.db.prepare(
			`INSERT INTO books (id, title, authors, position) VALUES (?, ?, ?, ?)`,
		);
		const row = intoBookRow(meta);
		stmt.run(row.id, row.title, row.authors, row.position);
	}

	selectBook(id: BookId): BookMeta {
		const stmt = this.db.prepare(`SELECT id, title, authors, position FROM books WHERE id = ?`);
		const row = stmt.get<BookRow>(id);
		if (row === undefined) {
			throw NoSuchElementException;
		}
		return fromBookRow(row);
	}

	selectBooks(): BookMeta[] {
		const stmt = this.db.prepare(`SELECT id, title, authors, position FROM books`);
		return stmt.all<BookRow>().map(fromBookRow);
	}

	updateBookPosition(id: BookId, position: BookPosition): void {
		const stmt = this.db.prepare(`UPDATE books SET position = ? WHERE id = ?`);
		stmt.run(JSON.stringify(position), id);
	}
}

type BookRow = {
	id: string;
	title: string;
	authors: string;
	position: string;
};

function intoBookRow(meta: BookMeta): BookRow {
	return {
		id: meta.id,
		title: meta.title,
		authors: meta.authors.join(";"),
		position: JSON.stringify(meta.position),
	};
}

function fromBookRow(row: BookRow): BookMeta {
	return {
		id: row.id as BookId,
		title: row.title,
		authors: row.authors.split(";"),
		position: JSON.parse(row.position),
	};
}
