/**
 * DDL idempotente. Se ejecuta al abrir la base, de modo que `npm run dev`
 * funciona en un clon limpio sin un paso manual de migraciones.
 * `schema.ts` sigue siendo la fuente de verdad de los tipos.
 */
export const DDL = `
CREATE TABLE IF NOT EXISTS chats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  folder_path TEXT NOT NULL UNIQUE,
  owner_name TEXT,
  avatar TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id INTEGER NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  ts INTEGER NOT NULL,
  sender TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  attachment_name TEXT,
  attachment_type TEXT,
  attachment_size INTEGER
);

CREATE INDEX IF NOT EXISTS messages_chat_id_idx ON messages (chat_id, id);

CREATE INDEX IF NOT EXISTS messages_media_idx
  ON messages (chat_id, attachment_type, id);

CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
  content,
  sender,
  content='messages',
  content_rowid='id',
  tokenize='unicode61 remove_diacritics 2',
  prefix='2 3'
);

CREATE TRIGGER IF NOT EXISTS messages_ai AFTER INSERT ON messages BEGIN
  INSERT INTO messages_fts (rowid, content, sender)
  VALUES (new.id, new.content, new.sender);
END;

CREATE TRIGGER IF NOT EXISTS messages_ad AFTER DELETE ON messages BEGIN
  INSERT INTO messages_fts (messages_fts, rowid, content, sender)
  VALUES ('delete', old.id, old.content, old.sender);
END;

CREATE TRIGGER IF NOT EXISTS messages_au AFTER UPDATE ON messages BEGIN
  INSERT INTO messages_fts (messages_fts, rowid, content, sender)
  VALUES ('delete', old.id, old.content, old.sender);
  INSERT INTO messages_fts (rowid, content, sender)
  VALUES (new.id, new.content, new.sender);
END;
`;
