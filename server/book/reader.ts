import { Array, Order, pipe } from "effect";
import { NoSuchElementException } from "effect/Cause";
import { Effect, andThen } from "effect/Effect";

import { createEpubReader, EpubReader, NavPoint, Rootfile, Toc } from "./reader-epub.ts";
import { ChapterEntry, ChapterId } from "../../common/book/types.ts";

export interface BookReader {
  title: Effect<string, NoSuchElementException>;
  creators: Effect<string[], NoSuchElementException>;
  chapterEntries: Effect<ChapterEntry[], NoSuchElementException>;
  getChapter: (id: ChapterId) => Effect<string, NoSuchElementException>;
  close: Effect<void>;
}

export async function createBookReader(data: Uint8Array): Promise<BookReader> {
  const epubReader = await createEpubReader(data);
  return {
    title: pipe(epubReader.rootfile, andThen(getTitle)),
    creators: pipe(epubReader.rootfile, andThen(getCreators)),
    chapterEntries: pipe(
      epubReader.toc,
      andThen((toc) => getChapterEntries(toc)),
    ),
    getChapter: getChapter(epubReader),
    close: epubReader.close,
  };
}

function getTitle(rootfile: Rootfile): string {
  return rootfile.package.metadata["dc:title"]["#text"];
}

function getCreators(rootfile: Rootfile): string[] {
  const creator = rootfile.package.metadata["dc:creator"];
  if (Array.isArray(creator)) {
    return creator.map(({ "#text": text }) => text);
  } else {
    return [creator["#text"]];
  }
}

function getChapterEntries(toc: Toc): ChapterEntry[] {
  const navPoints = Array.sort(
    toc.ncx.navMap.navPoint,
    Order.mapInput(Order.number, (navPoint: NavPoint) => navPoint["@playOrder"]),
  );

  return navPoints
    .filter((navPoint) => navPoint["@class"] == "chapter")
    .map((navPoint) => {
      const id = navPoint["@id"] as ChapterId;
      const title = navPoint.navLabel.text["#text"];
      return { id, title };
    });
}

function getChapter(
  epubReader: EpubReader,
): (id: ChapterId) => Effect<string, NoSuchElementException> {
  return (id) =>
    pipe(
      epubReader.toc,
      andThen((toc) => {
        const navPoints = toc.ncx.navMap.navPoint;
        return Array.findFirst(navPoints, (navPoint) => navPoint["@id"] == id);
      }),
      andThen((navPoint) => epubReader.getContent(navPoint.content["@src"])),
    );
}
