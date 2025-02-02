import { xml_node as XmlNode } from "@libs/xml";
import * as zip from "@zip.js/zip.js";
import { Array, Effect, Order, pipe } from "effect";
import { NoSuchElementException } from "effect/Cause";

import { createEpub, Epub, NavPoint, Rootfile, Toc } from "../epub/Epub.ts";

export interface Book {
  title: Effect.Effect<string, NoSuchElementException>;
  creators: Effect.Effect<string[], NoSuchElementException>;
  chapters: Effect.Effect<Chapter[], NoSuchElementException>;
}

export interface Chapter {
  name: string;
  body: Effect.Effect<XmlNode, NoSuchElementException>;
}

export function createBook(entries: zip.Entry[]): Book {
  const epub = createEpub(entries);
  return {
    title: pipe(epub.rootfile, Effect.andThen(getTitle)),
    creators: pipe(epub.rootfile, Effect.andThen(getCreators)),
    chapters: pipe(
      epub.toc,
      Effect.andThen((toc) => getChapters(epub, toc)),
    ),
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

function getChapters(epub: Epub, toc: Toc): Chapter[] {
  const navPoints = Array.sort(
    toc.ncx.navMap.navPoint,
    Order.mapInput(Order.number, (navPoint: NavPoint) => navPoint["@playOrder"]),
  );

  return navPoints
    .filter((navPoint) => navPoint["@class"] == "chapter")
    .map((navPoint) => {
      const name = navPoint.navLabel.text["#text"];
      const src = navPoint.content["@src"];
      return {
        name,
        body: pipe(
          epub.getContent(src),
          Effect.andThen((content) => content.html.body),
        ),
      };
    });
}
