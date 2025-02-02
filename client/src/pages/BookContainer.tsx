import { Effect } from "effect";
import { JSX, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { Book, createBook } from "../../../common/book/Book.ts";
import { Uint8ArrayReader, ZipReader } from "@zip.js/zip.js";

export default function BookContainer(): JSX.Element {
  const { bookId } = useParams();
  const [book, setBook] = useState<Book>({});

  useEffect(() => {
    (async () => {
      const resp = await fetch(`/api/books/${bookId}`);
      const data = await resp.bytes();

      const dataReader = new Uint8ArrayReader(data);
      const zipReader = new ZipReader(dataReader);
      const zipEntries = await zipReader.getEntries();

      const book = createBook(zipEntries);
      console.log(await Effect.runPromise(book.title));
      setBook(book);
    })();
  }, [bookId]);

  return (
    <div>
      <h1>{book.name}</h1>
      <p>{book.description}</p>
      <Link to="/">🠠 Back to all book</Link>
    </div>
  );
}
