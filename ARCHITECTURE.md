# Mimari Özeti

Bu proje tamamen offline çalışan, seans bazlı alışveriş kayıt uygulaması. Kamera ile ürün etiketinden fiyat/metin yakalayıp seçili alışveriş seansına kaydeder.

## Ana Bileşenler
- **Veritabanı (SQLite)**: `db/database.ts`
  - Tablolar: `shopping_sessions`, `shopping_items` (FK cascade, `created_at` alanları dahil).
  - `initDB()` ilk açılışta tablo kurulumlarını yapar, foreign key desteğini açar.

- **Durum Yönetimi (Zustand)**: `store/items.ts`
  - Seanslar: `sessions`, `currentSessionId`
  - Ürünler: `items`
  - Metodlar:
    - `startSession(note?)`, `setCurrentSession(id)`, `fetchSessions(limit)`, `deleteSession(id)`, `clearAll()`
    - `fetchItems(sessionId?)`, `getItemsForSession(sessionId)`
    - `addItem({ product_name, price, quantity }, sessionId?)`, `deleteItem(itemId, sessionId?)`
  - Akış: Seans aç→aktif yap→ürün ekle; seans/ürünler DB’ye yazar, state senkron kalır.

- **Kamera / Tarama Ekranı**: `app/(tabs)/index.tsx`
  - Vision Camera ile periyodik fotoğraf çekip ML Kit (text-recognition) ile fiyat/metin çıkarır.
  - Seans kontrolleri: "Alışveriş Başlat", "Seansı Sil", durum etiketi, `SessionDropdown` (son seansları açılır liste).
  - Form: Ürün adı/fiyat, Kaydet (aktif seansa yazar), Yeniden Tara, Tüm Seansları Sil.
  - Temp dosya temizliği: Tanıma sonrası fotoğraf `expo-file-system` ile silinir (paket eklenmeli).
  - Loglar yalnızca `__DEV__` modda.

- **Liste Ekranı**: `app/(tabs)/list.tsx`
  - Seansları kartlar halinde gösterir; içinde ürünleri ve seans toplamını listeler.
  - Ürün satırında "Sil" butonu ile DB’den/seyans state’inden kaldırır.

- **Toplam Ekranı**: `app/(tabs)/total.tsx`
  - Aktif seans ID ve toplam tutar (price * quantity) gösterir.
  - İlk birkaç ürünü kısa listeler.

- **Seans Dropdown Bileşeni**: `components/SessionDropdown.tsx`
  - Son seansları açılır listede gösterir, isteğe bağlı "Daha fazla getir" çağrısı tetikler.

- **Tema Renkleri**: `constants/Colors.ts`
  - Açık/Koyu renk paleti, tab icon/tint ayarları.

## Veritabanı Şeması
```sql
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
```

## Kaydetme Akışı
1) Tarama fiyat bulur (yoksa bekler).
2) Formu kontrol et, **Kaydet**: Aktif seansa yazar (yoksa otomatik seans açar), state’i günceller.
3) Liste/Toplam sekmesi `useFocusEffect` ile DB’den en güncel veriyi çeker.

## Build Notu
- `expo-file-system` kullanıldığı için paketin kurulması ve EAS build’e dahil edilmesi gerekir.
  - Kurulum: `npm install expo-file-system@~17.0.0`
  - Build: `eas build --profile production --platform android|ios`

## Bilinen Davranışlar
- Kamera açıkken tab değiştirilirse "Camera is closed" hatası log’da yumuşakça atlanır.
- Tarama intervali ~1.8s; `paused` değilse devam eder, fiyat bulununca durur.
- Temp fotoğraflar tanıma sonrası silinir; kurulum yapılmazsa bu satır kaldırılabilir.
