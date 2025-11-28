import { create } from "zustand";
import * as SQLite from "expo-sqlite";

const db = SQLite.openDatabase("items.db");

interface Item {
  id: number;
  name: string;
  price: number;
}

interface ItemState {
  items: Item[];
  addItem: (item: Omit<Item, "id">) => void;
  clearAll: () => void;
  fetchItems: () => void;
}

const useItemStore = create<ItemState>((set) => ({
  items: [],
  addItem: (item) => {
    db.transaction(
      (tx) => {
        tx.executeSql(
          "INSERT INTO items (name, price) VALUES (?, ?)",
          [item.name, item.price],
          (_, { insertId }) => {
            if (insertId)
              set((state) => ({
                items: [...state.items, { ...item, id: insertId }],
              }));
          }
        );
      },
      (error) => console.log(error)
    );
  },
  clearAll: () => {
    db.transaction(
      (tx) => {
        tx.executeSql("DELETE FROM items", [], () => {
          set({ items: [] });
        });
      },
      (error) => console.log(error)
    );
  },
  fetchItems: () => {
    db.transaction(
      (tx) => {
        tx.executeSql("SELECT * FROM items", [], (_, { rows }) => {
          set({ items: rows._array });
        });
      },
      (error) => console.log(error)
    );
  },
}));

export default useItemStore;
