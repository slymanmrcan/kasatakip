import { openDatabaseSync } from "expo-sqlite";

const db = openDatabaseSync("items.db");

const initDB = () => {
  db.execSync(
    `
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS shopping_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      note TEXT
    );
    CREATE TABLE IF NOT EXISTS shopping_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      price REAL NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES shopping_sessions(id) ON DELETE CASCADE
    );
    `
  );
};

export { db, initDB };
