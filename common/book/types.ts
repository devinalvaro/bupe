import { Brand } from "effect/Brand";

export type BookId = string & Brand<"BookId">;

export function makeBookId(): BookId {
	return crypto.randomUUID().substring(0, 8) as BookId;
}

export interface Book extends BookMeta {
	chapterEntries: ChapterEntry[];
	currentChapter: string;
}

export type BookMeta = BookEntry & {
	position?: BookPosition;
};

export interface BookEntry {
	id: BookId;
	title: string;
	authors: string[];
}

export type BookPosition = ChapterId | { src: string };

export type ChapterId = string & Brand<"ChapterId">;

export interface ChapterEntry {
	id: ChapterId;
	title: string;
}
