import { Database } from "@db/sqlite";
import { runPromise } from "effect/Effect";

import { Book, BookEntry, BookId, makeBookId } from "../../common/book/types.ts";
import { BookStorage, createBookStorage } from "./storage.ts";

export interface BookService {
  addBook: (file: File) => Promise<void>;
  getBookEntries: () => BookEntry[];
  getBook: (id: BookId) => Promise<Book>;
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

  addBook(file: File): Promise<void> {
    const id = makeBookId();
    return this.storage.addBook(id, file);
  }

  getBookEntries(): BookEntry[] {
    return this.storage.getBookEntries();
  }

  async getBook(id: BookId): Promise<Book> {
    const bookReader = await this.storage.getBookReader(id);

    const title = await runPromise(bookReader.title);
    const authors = await runPromise(bookReader.creators);
    const chapterEntries = await runPromise(bookReader.chapterEntries);
    const currentChapter = await runPromise(bookReader.getChapter(chapterEntries[12].id));
    await runPromise(bookReader.close);

    return {
      id,
      title,
      authors,
      chapterEntries,
      currentChapter,
    };
  }
}
