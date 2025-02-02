import { Brand } from "effect";

export type BookId = string & Brand.Brand<"BookId">;

export function makeBookId(): BookId {
  return crypto.randomUUID().substring(0, 8) as BookId;
}

export interface BookEntry {
  id: BookId;
  title: string;
  author: string;
}
