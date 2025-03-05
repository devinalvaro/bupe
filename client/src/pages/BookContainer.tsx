import { JSX, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { Book } from "../../../common/book/types.ts";

export default function BookContainer(): JSX.Element {
	const { bookId } = useParams();
	const [book, setBook] = useState<Book>();

	useEffect(() => {
		(async () => {
			const resp = await fetch(`/api/books/${bookId}/`);
			const data = await resp.bytes();
			const json = new TextDecoder().decode(data);
			const book = JSON.parse(json) as Book;
			setBook(book);
		})();
	}, [bookId]);

	if (book === undefined) {
		return <div>Loading...</div>;
	}

	return (
		<div>
			<h1>{book.title}</h1>
			<ul>
				{book.authors.map((author) => (
					<li key={author}>{author}</li>
				))}
			</ul>
			<ul>
				{book.chapterEntries.map((chapterEntry) => (
					<li key={chapterEntry.id}>
						<a href={`#${chapterEntry.id}`}>{chapterEntry.title}</a>
					</li>
				))}
			</ul>
			<Link to="/">🠠 Back to all books</Link>
			<div dangerouslySetInnerHTML={{ __html: book.currentChapter }} />
		</div>
	);
}
