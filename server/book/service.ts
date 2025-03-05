import { Database } from "@db/sqlite";
import { runPromise } from "effect/Effect";

import { Book, BookEntry, BookId, BookPosition, makeBookId } from "../../common/book/types.ts";
import { BookStorage, createBookStorage } from "./storage.ts";

export interface BookService {
  addBook: (data: Uint8Array) => Promise<void>;
  getBookEntries: () => BookEntry[];
  getBook: (id: BookId) => Promise<Book>;
  updateBookPosition: (id: BookId, position: BookPosition) => Promise<void>;
}

export function createBookService(db: Database): BookService {
  const storage = createBookStorage(db);
  return new BookServiceImpl(storage);
}

class BookServiceImpl {
  private readonly storage: BookStorage;

  constructor(storage: BookStorage) {
    this.storage = storage;
  }

  async addBook(data: Uint8Array): Promise<void> {
    const id = makeBookId();
    await this.storage.saveBook(id, data);

    const bookReader = await this.storage.readBook(id);
    const title = await runPromise(bookReader.title);
    const authors = await runPromise(bookReader.creators);
    const chapterEntries = await runPromise(bookReader.chapterEntries);
    await runPromise(bookReader.close);

    const position = chapterEntries.at(0)?.id;

    this.storage.insertBook({ id, title, authors, position });
  }

  async getBook(id: BookId): Promise<Book> {
    const { title, authors, position } = this.storage.selectBook(id);

    const bookReader = await this.storage.readBook(id);
    const chapterEntries = await runPromise(bookReader.chapterEntries);
    const currentChapter = await runPromise(bookReader.getChapter(chapterEntries[12].id));
    await runPromise(bookReader.close);

    return { id, title, authors, chapterEntries, currentChapter, position };
  }

  getBookEntries(): BookEntry[] {
    return this.storage.selectBooks();
  }

  async updateBookPosition(id: BookId, position: BookPosition): Promise<void> {}
}
