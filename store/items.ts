import { db } from "@/db/database";
import { create } from "zustand";

export interface Session {
  id: number;
  note: string | null;
  created_at: string;
}

export interface Item {
  id: number;
  session_id: number;
  product_name: string;
  price: number;
  quantity: number;
  created_at: string;
}

interface ItemState {
  sessions: Session[];
  currentSessionId: number | null;
  items: Item[];
  startSession: (note?: string) => Promise<number>;
  setCurrentSession: (sessionId: number | null) => Promise<void>;
  fetchSessions: (limit?: number) => Promise<void>;
  fetchItems: (sessionId?: number) => Promise<void>;
  getItemsForSession: (sessionId: number) => Promise<Item[]>;
  addItem: (
    item: Pick<Item, "product_name" | "price" | "quantity">,
    sessionId?: number
  ) => Promise<void>;
  updateItem: (
    itemId: number,
    updates: Partial<Pick<Item, "product_name" | "price" | "quantity">>
  ) => Promise<void>;
  deleteItem: (itemId: number, sessionId?: number) => Promise<void>;
  deleteSession: (sessionId: number) => Promise<void>;
  clearAll: () => Promise<void>;
}

const useItemStore = create<ItemState>((set, get) => ({
  sessions: [],
  currentSessionId: null,
  items: [],

  startSession: async (note) => {
    const result = await db.runAsync(
      "INSERT INTO shopping_sessions (note) VALUES (?)",
      [note ?? null]
    );
    if (!result.lastInsertRowId) {
      throw new Error("Session insert failed");
    }
    const sessionId = result.lastInsertRowId;
    await get().fetchSessions();
    await get().setCurrentSession(sessionId);
    return sessionId;
  },

  setCurrentSession: async (sessionId) => {
    set({ currentSessionId: sessionId });
    if (sessionId) {
      await get().fetchItems(sessionId);
    } else {
      set({ items: [] });
    }
  },

  fetchSessions: async (limit = 20) => {
    const rows = await db.getAllAsync<Session>(
      "SELECT id, note, created_at FROM shopping_sessions ORDER BY id DESC LIMIT ?",
      [limit]
    );
    set({ sessions: rows });
    if (!get().currentSessionId && rows.length > 0) {
      set({ currentSessionId: rows[0].id });
      await get().fetchItems(rows[0].id);
    }
  },

  fetchItems: async (sessionId) => {
    const sid = sessionId ?? get().currentSessionId;
    if (!sid) {
      set({ items: [] });
      return;
    }
    const rows = await db.getAllAsync<Item>(
      "SELECT * FROM shopping_items WHERE session_id = ? ORDER BY id DESC",
      [sid]
    );
    set({ items: rows });
  },

  getItemsForSession: async (sessionId) => {
    const rows = await db.getAllAsync<Item>(
      "SELECT * FROM shopping_items WHERE session_id = ? ORDER BY id DESC",
      [sessionId]
    );
    return rows;
  },

  addItem: async (item, sessionId) => {
    const sid = sessionId ?? get().currentSessionId;
    if (!sid) {
      throw new Error("No active session");
    }
    const result = await db.runAsync(
      "INSERT INTO shopping_items (session_id, product_name, price, quantity) VALUES (?, ?, ?, ?)",
      [sid, item.product_name, item.price, item.quantity]
    );

    if (result.lastInsertRowId != null) {
      set((state) => ({
        items: [
          {
            ...item,
            id: result.lastInsertRowId!,
            session_id: sid,
            created_at: new Date().toISOString(),
          },
          ...state.items,
        ],
      }));
    } else {
      await get().fetchItems(sid);
    }
  },

  updateItem: async (itemId, updates) => {
    const fields = [];
    const values = [];
    if (updates.product_name !== undefined) {
      fields.push("product_name = ?");
      values.push(updates.product_name);
    }
    if (updates.price !== undefined) {
      fields.push("price = ?");
      values.push(updates.price);
    }
    if (updates.quantity !== undefined) {
      fields.push("quantity = ?");
      values.push(updates.quantity);
    }

    if (fields.length === 0) return;

    values.push(itemId);
    await db.runAsync(
      `UPDATE shopping_items SET ${fields.join(", ")} WHERE id = ?`,
      values
    );
    
    const currentSessionId = get().currentSessionId;
    if (currentSessionId) {
        await get().fetchItems(currentSessionId);
    }
  },

  deleteItem: async (itemId, sessionId) => {
    await db.runAsync("DELETE FROM shopping_items WHERE id = ?", [itemId]);
    const sid = sessionId ?? get().currentSessionId;
    if (sid) {
      await get().fetchItems(sid);
    }
  },

  deleteSession: async (sessionId) => {
    await db.runAsync("DELETE FROM shopping_sessions WHERE id = ?", [sessionId]);
    const current = get().currentSessionId;
    await get().fetchSessions();
    if (current === sessionId) {
      const sessions = get().sessions;
      if (sessions.length > 0) {
        await get().setCurrentSession(sessions[0].id);
      } else {
        set({ currentSessionId: null, items: [] });
      }
    }
  },

  clearAll: async () => {
    await db.execAsync("DELETE FROM shopping_sessions");
    set({ sessions: [], currentSessionId: null, items: [] });
  },
}));

export default useItemStore;
