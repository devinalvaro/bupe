import { JSX, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { BookEntry } from "../../../common/book/BookEntry.ts";

export default function Index(): JSX.Element {
  const [dinosaurs, setDinosaurs] = useState<BookEntry[]>([]);

  useEffect(() => {
    (async () => {
      const response = await fetch(`/api/books/`);
      const bookEntries = (await response.json()) as BookEntry[];
      setDinosaurs(bookEntries);
    })();
  }, []);

  return (
    <main>
      <h1>Welcome to the Dinosaur app</h1>
      <p>Click on a dinosaur below to learn more.</p>
      {dinosaurs.map((bookEntry: BookEntry) => {
        return (
          <Link to={`/books/${bookEntry.id}`} key={bookEntry.title} className="dinosaur">
            {bookEntry.title}
          </Link>
        );
      })}
    </main>
  );
}
