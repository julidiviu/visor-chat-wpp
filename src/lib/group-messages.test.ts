import assert from "node:assert/strict";
import test from "node:test";
import { groupMessages } from "./group-messages.ts";
import type { ChatMessage } from "./types.ts";

let nextId = 1;

function photo(
  ts: number,
  sender = "Ana",
  name = `photo-${nextId}.jpg`,
): ChatMessage {
  const id = nextId++;
  return {
    id,
    ts,
    sender,
    content: "",
    attachmentName: name,
    attachmentType: "image",
    attachmentSize: null,
  };
}

function text(ts: number, content: string, sender = "Ana"): ChatMessage {
  return {
    id: nextId++,
    ts,
    sender,
    content,
    attachmentName: null,
    attachmentType: null,
    attachmentSize: null,
  };
}

test("agrupa dos fotos seguidas y conserva la hora del bloque", () => {
  const blocks = groupMessages([photo(1000), photo(2000)]);
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].kind, "images");
});

test("tres, cuatro y cinco fotos forman un solo bloque", () => {
  for (const count of [3, 4, 5, 21]) {
    nextId = 1;
    const blocks = groupMessages(
      Array.from({ length: count }, (_, index) => photo(1000 + index * 100)),
    );
    assert.equal(blocks.length, 1, `grupo de ${count}`);
    assert.equal(blocks[0].kind, "images");
  }
});

test("una foto sola se renderiza como mensaje normal", () => {
  const blocks = groupMessages([photo(1000)]);
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].kind, "message");
});

test("un mensaje de texto corta el álbum", () => {
  const blocks = groupMessages([
    photo(1000),
    photo(2000),
    text(3000, "hola"),
    photo(4000),
  ]);
  assert.deepEqual(
    blocks.map((block) => block.kind),
    ["images", "message", "message"],
  );
});

test("un cambio de remitente corta el álbum", () => {
  const blocks = groupMessages([photo(1000), photo(2000, "Beto")]);
  assert.deepEqual(
    blocks.map((block) => block.kind),
    ["message", "message"],
  );
});

test("más de 60 segundos corta el álbum", () => {
  const blocks = groupMessages([photo(1000), photo(62_000)]);
  assert.deepEqual(
    blocks.map((block) => block.kind),
    ["message", "message"],
  );
});

test("una foto con caption no se agrupa", () => {
  const withCaption = { ...photo(2000), content: "mira esto" };
  const blocks = groupMessages([photo(1000), withCaption]);
  assert.deepEqual(
    blocks.map((block) => block.kind),
    ["message", "message"],
  );
});

test("ignora mensajes vacíos sin adjunto y no corta el álbum", () => {
  const ghost: ChatMessage = {
    id: nextId++,
    ts: 1500,
    sender: "Ana",
    content: "",
    attachmentName: null,
    attachmentType: null,
    attachmentSize: null,
  };
  const blocks = groupMessages([photo(1000), ghost, photo(2000)]);
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].kind, "images");
});
