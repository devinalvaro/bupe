import { JSX, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { BookEntry } from "../../../common/book/types.ts";

export default function Index(): JSX.Element {
	const [bookEntries, setBookEntries] = useState<BookEntry[]>([]);

	useEffect(() => {
		(async () => {
			const response = await fetch(`/api/books/`);
			const bookEntries = (await response.json()) as BookEntry[];
			setBookEntries(bookEntries);
		})();
	}, []);

	return (
		<main>
			<h1>Welcome to the Book app</h1>
			<p>Click on a book below to learn more.</p>
			{bookEntries.map((bookEntry: BookEntry) => {
				return (
					<Link to={`/books/${bookEntry.id}`} key={bookEntry.title} className="book-entry">
						{bookEntry.title}
					</Link>
				);
			})}
		</main>
	);
}
