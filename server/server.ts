import { Database } from "@db/sqlite";
import { Context, Hono } from "hono";

import { BookId, BookPosition } from "../common/book/types.ts";
import { BookService, createBookService } from "./book/service.ts";

export function serve(db: Database): void {
	const server = new Server(db);

	const handler = new Hono();
	handler.post("/api/books/", (context) => server.addBook(context));
	handler.get("/api/books/", (context) => server.getBookEntries(context));
	handler.get("/api/books/:id/", (context) => server.getBook(context));
	handler.patch("/api/books/:id/position", (context) => server.updateBookPosition(context));

	Deno.serve({ port: 8787 }, handler.fetch);
}

class Server {
	private bookService: BookService;

	constructor(db: Database) {
		this.bookService = createBookService(db);
	}

	async addBook(context: Context): Promise<void> {
		const body = await context.req.parseBody();
		const file = body["file"];

		if (typeof file === "string") return context.status(422);

		const data = await file.bytes();
		this.bookService.addBook(data);
	}

	getBookEntries(context: Context): Response {
		const books = this.bookService.getBookEntries();
		return context.json(books);
	}

	async getBook(context: Context): Promise<Response> {
		const id = context.req.param("id") as BookId;
		const book = await this.bookService.getBook(id);
		return context.json(book);
	}

	async updateBookPosition(context: Context): Promise<void> {
		const id = context.req.param("id") as BookId;
		const position = (await context.req.json()) as BookPosition;
		await this.bookService.updateBookPosition(id, position);
	}
}
