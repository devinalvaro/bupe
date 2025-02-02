import { Database } from "@db/sqlite";
import * as path from "@std/path";
import { runPromise } from "effect/Effect";

import { BookReader, createBookReader } from "./reader.ts";
import { BookEntry, BookId } from "../../common/book/types.ts";

export interface BookStorage {
  addBook: (id: BookId, file: File) => Promise<void>;
  getBookEntries: () => BookEntry[];
  getBookReader: (id: BookId) => Promise<BookReader>;
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
	title CHAR(255) NOT NULL,
	authors CHAR(255) NOT NULL
)`).run();

    db.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS books_id ON books (id)`).run();

    this.db = db;
  }

  async addBook(id: BookId, file: File): Promise<void> {
    const filename = `${id}.epub`;

    const data = await file.bytes();
    await Deno.writeFile(path.join(this.dir, filename), data);

    const bookReader = await createBookReader(data);
    const title = (await runPromise(bookReader.title)) ?? "Untitled";
    const authors = (await runPromise(bookReader.creators))?.join("; ");
    await runPromise(bookReader.close);

    const stmt = this.db.prepare(`INSERT INTO books (id, title, authors) VALUES (?, ?, ?)`);
    stmt.run(id, title, authors);
  }

  getBookEntries(): BookEntry[] {
    const stmt = this.db.prepare(`SELECT id, title, authors FROM books`);
    return stmt
      .all<{ id: BookId; title: string; authors: string }>()
      .map(({ id, title, authors }) => ({ id, title, authors: authors.split("; ") }));
  }

  async getBookReader(id: BookId): Promise<BookReader> {
    const filename = `${id}.epub`;
    const data = await Deno.readFile(path.join(this.dir, filename));
    return createBookReader(data);
  }
}
