# Kasatakip (Alışveriş Seansları)

Telefon/tablet üzerinde tamamen offline çalışan alışveriş seansı takip uygulaması. Kamera ile etiket okur, fiyat/ürün adını forma düşürür, seçili alışveriş seansına kaydeder. Seanslar ve ürünler lokal SQLite veritabanında tutulur.

## Özellikler
- **Alışveriş seansı**: "Alışveriş Başlat" ile yeni seans açılır; son 5 seans chip olarak gösterilir, chip'e dokunarak aktif seans seçilir.
- **Ürün ekleme**: Kamera etiket okur, fiyat/isim forma gelir; kontrol edip "DB'ye Kaydet" ile aktif seansa yazılır. Aktif seans yoksa otomatik yeni seans açılır.
- **Liste**: Seansları kart kart gösterir, altında ürünleri ve seans toplamını yazar.
- **Toplam**: Aktif seansın toplamını ve ilk birkaç ürününü özetler.
- **Tema**: Açık/Koyu renk desteği.

## Veritabanı
`db/database.ts` başlangıçta aşağıdaki tabloları oluşturur:
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

## Durum Yönetimi (Zustand)
`store/items.ts`:
- `startSession(note?)`: Yeni seans açar, aktif yapar.
- `setCurrentSession(id)`: Aktif seansı değiştirir.
- `fetchSessions(limit)`: Seans listesini çeker (varsayılan son 20).
- `fetchItems(sessionId?)`: Aktif/istenen seansın ürünlerini çeker.
- `addItem({ product_name, price, quantity }, sessionId?)`: Ürünü aktif veya verilen seansa ekler.
- `getItemsForSession(sessionId)`: Seansa ait ürünleri döner.
- `deleteSession(sessionId)`: Seansı ve ürünlerini (cascade) siler.
- `deleteItem(itemId, sessionId?)`: Ürünü siler, aktif seansı/ilgili seansı yeniler.
- `clearAll()`: Tüm seansları siler.
> Not: Kamera ekranında “Seansı Sil” butonu sadece aktif seansı siler; “Alışverişi Sıfırla” tüm seansları siler.

## Ekranlar
- `app/(tabs)/index.tsx` (Kamera)
  - "Alışveriş Başlat" butonu, son 5 seans chip'leri.
  - Seçili seans bilgisi; tarama sonucu form alanlarına düşer.
  - "DB'ye Kaydet" → aktif seansa yazar; "Yeniden Tara" taramayı temizler; "Alışverişi Sıfırla" tüm seansları siler.
- `app/(tabs)/list.tsx` (Liste)
  - Seans kartları, altında ürünler ve seans toplamı.
- `app/(tabs)/total.tsx` (Toplam)
  - Aktif seans ID'si, toplam, ilk 5 ürünün kısa listesi.

## Akış
1) Kamera sekmesinde **Alışveriş Başlat** → yeni seans açılır, chip olarak eklenir.
2) Etiketi okut, fiyat/isim forma düşer → gerekirse düzelt → **DB'ye Kaydet**.
   - Aktif seans yoksa kaydetmeden önce otomatik seans açılır.
3) Liste sekmesi: Seans ve ürünleri gör.
4) Toplam sekmesi: Aktif seans toplamını gör.

## Notlar
- Kamera hataları ("Camera is closed") yumuşakça loglanır, uygulama düşmez.
- Seanslar paralel tutulabilir; chip ile seçim yapıldığında yeni ürünler o seansa yazılır.
- Tema renkleri için `constants/Colors.ts` kullanılır.
 - Kaydet sonrası form altındaki mesaj “Kaydedildi” durumunu gösterir; fiyat geçersiz veya hata durumunda uyarı verir.
