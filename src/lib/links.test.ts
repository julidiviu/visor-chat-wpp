import assert from "node:assert/strict";
import test from "node:test";
import { extractLinks } from "./links.ts";

test("extrae enlaces http y dominios www", () => {
  const links = extractLinks(
    "Mira https://youtube.com/shorts/abc?t=1 y www.ejemplo.com, listo.",
  );

  assert.deepEqual(
    links.map((link) => link.url),
    ["https://youtube.com/shorts/abc?t=1", "https://www.ejemplo.com"],
  );
  assert.deepEqual(
    links.map((link) => link.host),
    ["youtube.com", "ejemplo.com"],
  );
});

test("ignora texto sin enlaces y protocolos no web", () => {
  assert.deepEqual(extractLinks("hola, sin enlaces"), []);
  assert.deepEqual(extractLinks("javascript:alert(1)"), []);
});

test("recorta la puntuación que cierra la frase", () => {
  const [link] = extractLinks("(ver https://ejemplo.com/ruta).");

  assert.equal(link.url, "https://ejemplo.com/ruta");
});
