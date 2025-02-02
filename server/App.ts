import { Database } from "@db/sqlite";
import { Context, Hono } from "hono";

import { BookId } from "../common/book/BookEntry.ts";
import { Storage as BookStorage } from "./book/Storage.ts";

export class App {
  private handler: Hono;
  private bookService: BookStorage;

  constructor(db: Database) {
    const hono = new Hono();
    hono.get("/api/books/", (context) => this.getBookEntries(context));
    hono.get("/api/books/:id/", (context) => this.getBook(context));
    hono.post("/api/books/", (context) => this.addBook(context));

    this.handler = hono;
    this.bookService = new BookStorage(db);
  }

  public serve(): void {
    Deno.serve({ port: 8787 }, this.handler.fetch);
  }

  private getBookEntries(context: Context): Response {
    const books = this.bookService.getBookEntries();
    return context.json(books);
  }

  private async getBook(context: Context): Promise<Response> {
    const id = context.req.param("id") as BookId;
    const [filename, data] = await this.bookService.getBook(id);
    return new Response(data, {
      headers: {
        "Content-Type": "application/epub",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "Content-Length": data.length.toString(),
      },
    });
  }

  private async addBook(context: Context): Promise<void> {
    const body = await context.req.parseBody();
    const file = body["file"];

    if (typeof file === "string") return context.status(422);

    this.bookService.addBook(file);
  }
}
