import { Database } from "@db/sqlite";
import * as path from "@std/path";
import { Uint8ArrayReader, ZipReader } from "@zip.js/zip.js";
import { Effect } from "effect";

import { createBook } from "../../common/book/Book.ts";
import { BookEntry, BookId, makeBookId } from "../../common/book/BookEntry.ts";

export class Storage {
  private readonly dir = "./books/";

  private readonly db: Database;

  constructor(db: Database) {
    Deno.mkdir(this.dir, { recursive: true });

    db.prepare(`CREATE TABLE IF NOT EXISTS books (
	pk BIGINT PRIMARY KEY,
	id CHAR(8),
	title CHAR(255) NOT NULL,
	author CHAR(255) NOT NULL
)`).run();

    db.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS books_id ON books (id)`).run();

    this.db = db;
  }

  public getBookEntries(): BookEntry[] {
    const stmt = this.db.prepare(`SELECT id, title, author FROM books`);
    return stmt.all<{ id: BookId; title: string; author: string }>();
  }

  public async getBook(id: BookId): Promise<[string, Uint8Array]> {
    const filename = `${id}.epub`;
    const data = await Deno.readFile(path.join(this.dir, filename));
    return [filename, data];
  }

  public async addBook(file: File): Promise<void> {
    const id = makeBookId();
    const filename = `${id}.epub`;

    const data = await file.bytes();
    await Deno.writeFile(path.join(this.dir, filename), data);

    const dataReader = new Uint8ArrayReader(data);
    const zipReader = new ZipReader(dataReader);
    const zipEntries = await zipReader.getEntries();

    const book = createBook(zipEntries);
    const title = (await Effect.runPromise(book.title)) ?? "Untitled";
    const author = (await Effect.runPromise(book.creators))?.at(0) ?? "Unknown";

    await zipReader.close();

    const stmt = this.db.prepare(`INSERT INTO books (id, title, author) VALUES (?, ?, ?)`);
    stmt.run(id, title, author);
  }
}
