import type { BufferPoint, BufferRange, SyntaxClass, SyntaxSpan } from "./structured-buffer-model.js";
import { rangeOverlaps } from "./structured-buffer-model.js";

interface XmlPointCursor {
  index: number;
  row: number;
  column: number;
}

function isXmlSpace(char: string | undefined): boolean {
  return char === " " || char === "\t" || char === "\n" || char === "\r";
}

function isNameStop(char: string | undefined): boolean {
  return char === undefined
    || isXmlSpace(char)
    || char === "="
    || char === "/"
    || char === "?"
    || char === ">"
    || char === "<";
}

function skipXmlSpace(source: string, index: number): number {
  let current = index;
  while (isXmlSpace(source[current])) {
    current += 1;
  }
  return current;
}

function readName(source: string, index: number): number {
  let current = index;
  while (!isNameStop(source[current])) {
    current += 1;
  }
  return current;
}

function pointAtCursor(cursor: XmlPointCursor): BufferPoint {
  return { row: cursor.row, column: cursor.column };
}

function advanceCursor(source: string, cursor: XmlPointCursor, targetIndex: number): BufferPoint {
  if (targetIndex < cursor.index) {
    throw new Error("XML syntax span cursor moved backwards");
  }
  while (cursor.index < targetIndex) {
    const char = source[cursor.index];
    cursor.index += 1;
    if (char === "\n") {
      cursor.row += 1;
      cursor.column = 0;
    } else {
      cursor.column += 1;
    }
  }
  return pointAtCursor(cursor);
}

function pushSpan(
  spans: SyntaxSpan[],
  source: string,
  cursor: XmlPointCursor,
  className: SyntaxClass,
  start: number,
  end: number,
): void {
  if (end <= start) {
    return;
  }
  spans.push({
    className,
    range: {
      start: advanceCursor(source, cursor, start),
      end: advanceCursor(source, cursor, end),
    },
    text: source.slice(start, end),
  });
}

function parseXmlMarkup(source: string, start: number, spans: SyntaxSpan[], cursor: XmlPointCursor): number {
  const declaration = source.startsWith("<!", start);
  const processingInstruction = source.startsWith("<?", start);
  let opener = "<";
  if (source.startsWith("</", start)) {
    opener = "</";
  } else if (processingInstruction) {
    opener = "<?";
  } else if (declaration) {
    opener = "<!";
  }

  pushSpan(spans, source, cursor, "punctuation", start, start + opener.length);
  let index = start + opener.length;
  index = skipXmlSpace(source, index);

  const nameStart = index;
  const nameEnd = readName(source, index);
  if (nameEnd > nameStart) {
    pushSpan(spans, source, cursor, declaration || processingInstruction ? "keyword" : "type", nameStart, nameEnd);
    index = nameEnd;
  }

  let expectingValue = false;
  while (index < source.length) {
    if (source.startsWith("?>", index) || source.startsWith("/>", index)) {
      pushSpan(spans, source, cursor, "punctuation", index, index + 2);
      return index + 2;
    }
    const char = source[index];
    if (char === ">") {
      pushSpan(spans, source, cursor, "punctuation", index, index + 1);
      return index + 1;
    }
    if (isXmlSpace(char)) {
      index = skipXmlSpace(source, index);
      continue;
    }
    if (char === "=") {
      pushSpan(spans, source, cursor, "operator", index, index + 1);
      expectingValue = true;
      index += 1;
      continue;
    }
    if (char === "\"" || char === "'") {
      const close = source.indexOf(char, index + 1);
      const end = close >= 0 ? close + 1 : source.length;
      pushSpan(spans, source, cursor, "string", index, end);
      expectingValue = false;
      index = end;
      continue;
    }

    const tokenStart = index;
    const tokenEnd = readName(source, index);
    if (tokenEnd <= tokenStart) {
      index += 1;
      continue;
    }
    pushSpan(spans, source, cursor, expectingValue ? "string" : "property", tokenStart, tokenEnd);
    expectingValue = false;
    index = tokenEnd;
  }

  return source.length;
}

export function buildXmlSyntaxSpans(
  source: string,
  opts: { viewport?: BufferRange | undefined } = {},
): SyntaxSpan[] {
  const spans: SyntaxSpan[] = [];
  const cursor: XmlPointCursor = { index: 0, row: 0, column: 0 };
  let index = 0;
  while (index < source.length) {
    const open = source.indexOf("<", index);
    if (open < 0) {
      break;
    }
    if (source.startsWith("<!--", open)) {
      const close = source.indexOf("-->", open + 4);
      const end = close >= 0 ? close + 3 : source.length;
      pushSpan(spans, source, cursor, "comment", open, end);
      index = end;
      continue;
    }
    if (source.startsWith("<![CDATA[", open)) {
      const close = source.indexOf("]]>", open + 9);
      const end = close >= 0 ? close + 3 : source.length;
      pushSpan(spans, source, cursor, "string", open, end);
      index = end;
      continue;
    }
    index = parseXmlMarkup(source, open, spans, cursor);
  }

  const viewport = opts.viewport;
  return viewport === undefined
    ? spans
    : spans.filter((span) => rangeOverlaps(span.range, viewport));
}
