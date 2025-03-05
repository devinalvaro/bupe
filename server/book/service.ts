import { Database } from "@db/sqlite";

import { BookStorage, createBookStorage } from "./storage.ts";
import * as book from "../core/book.ts";
import { Book, BookEntry, BookId, BookPosition, makeBookId } from "../../common/book/types.ts";

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

		const zipReader = await this.storage.readBook(id);
		const title = await zipReader.eval(book.title);
		const authors = await zipReader.eval(book.authors);
		const chapterEntries = await zipReader.eval(book.chapterEntries);
		await zipReader.close();

		const position = chapterEntries.at(0)?.id;

		this.storage.insertBook({ id, title, authors, position });
	}

	async getBook(id: BookId): Promise<Book> {
		const { title, authors, position } = this.storage.selectBook(id);

		const zipReader = await this.storage.readBook(id);
		const chapterEntries = await zipReader.eval(book.chapterEntries);
		const currentChapter = await zipReader.eval(book.getChapter(chapterEntries[12].id));
		await zipReader.close();

		return { id, title, authors, chapterEntries, currentChapter, position };
	}

	getBookEntries(): BookEntry[] {
		return this.storage.selectBooks();
	}

	async updateBookPosition(id: BookId, position: BookPosition): Promise<void> {
		// TODO
	}
}
