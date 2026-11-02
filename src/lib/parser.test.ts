import assert from "node:assert/strict";
import test from "node:test";
import { parseChat } from "./parser.ts";

const raw = [
  "\u200e[27/07/20, 9:04:36\u202fp.m.] Ana: Los mensajes están cifrados",
  "\u200e[27/07/20, 9:04:46\u202fp.m.] Beto: \u200e<adjunto: 00000003-STICKER-2020-07-27-21-04-46.webp>",
  "[27/07/20, 9:05:00 p.m.] Beto: Mira esto",
  "primera línea",
  "segunda línea",
  "[28/07/20, 12:09:51 a.m.] Ana: medianoche",
  "[2021-01-02, 03:04:05] Ana: formato iso",
  "[2021-01-02, 03:05:00] Ana: <attached: informe.pdf>",
  "[2021-01-02, 03:06:00] Ana: <adjunto: foto.jpg> con texto",
].join("\r\n");

test("parsea cabeceras, multilínea y adjuntos", () => {
  const parsed = parseChat(raw);

  assert.equal(parsed.messages.length, 7);
  assert.equal(parsed.attachmentCount, 3);

  assert.match(parsed.messages[0].content, /cifrados/);

  assert.equal(parsed.messages[1].attachmentType, "sticker");
  assert.equal(parsed.messages[1].content, "");
  assert.equal(
    parsed.messages[1].attachmentName,
    "00000003-STICKER-2020-07-27-21-04-46.webp",
  );

  assert.equal(
    parsed.messages[2].content,
    "Mira esto\nprimera línea\nsegunda línea",
  );

  assert.equal(
    parsed.messages[3].ts,
    new Date(2020, 6, 28, 0, 9, 51).getTime(),
  );

  assert.equal(
    parsed.messages[4].ts,
    new Date(2021, 0, 2, 3, 4, 5).getTime(),
  );

  assert.equal(parsed.messages[5].attachmentType, "document");
  assert.equal(parsed.messages[5].attachmentName, "informe.pdf");

  assert.equal(parsed.messages[6].content, "con texto");
  assert.equal(parsed.messages[6].attachmentType, "image");
});

test("cuenta remitentes en orden de aparición", () => {
  const parsed = parseChat(raw);

  assert.deepEqual(parsed.senders, [
    { name: "Ana", count: 5 },
    { name: "Beto", count: 2 },
  ]);
});
