import * as SQLite from "expo-sqlite";

const db = SQLite.openDatabase("items.db");

const initDB = () => {
  db.transaction((tx) => {
    tx.executeSql(
      "CREATE TABLE IF NOT EXISTS items (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, price REAL)"
    );
  });
};

export { db, initDB };
