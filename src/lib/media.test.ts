import assert from "node:assert/strict";
import test from "node:test";
import { groupByMonth, monthLabel } from "./media.ts";
import type { ChatMessage } from "./types.ts";

function message(id: number, ts: number): ChatMessage {
  return {
    id,
    ts,
    sender: "Ana",
    content: "",
    attachmentName: `00000${id}-PHOTO.jpg`,
    attachmentType: "image",
    attachmentSize: null,
  };
}

test("agrupa por mes y añade el año solo a los meses de otro año", () => {
  const now = new Date(2026, 10, 13).getTime();
  const sections = groupByMonth(
    [
      message(3, new Date(2026, 10, 2).getTime()),
      message(2, new Date(2026, 9, 20).getTime()),
      message(1, new Date(2020, 6, 28).getTime()),
    ],
    now,
  );

  assert.deepEqual(
    sections.map((section) => section.label),
    ["ESTE MES", "OCTUBRE", "JULIO 2020"],
  );
  assert.deepEqual(
    sections.map((section) => section.items.length),
    [1, 1, 1],
  );
});

test("etiqueta un solo elemento y no mezcla meses distintos", () => {
  const now = new Date(2026, 10, 13).getTime();
  const ts = new Date(2025, 4, 1).getTime();

  assert.equal(monthLabel(ts, now), "MAYO 2025");
  assert.equal(groupByMonth([message(1, ts)], now).length, 1);
});
