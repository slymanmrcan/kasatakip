import Colors from "@/constants/Colors";
import useItemStore, { Item, Session } from "@/store/items";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ListScreen() {
  const fetchSessions = useItemStore((state) => state.fetchSessions);
  const getItemsForSession = useItemStore((state) => state.getItemsForSession);
  const deleteItem = useItemStore((state) => state.deleteItem);
  const deleteSession = useItemStore((state) => state.deleteSession);
  const sessions = useItemStore((state) => state.sessions);
  const currentSessionId = useItemStore((state) => state.currentSessionId);
  const setCurrentSession = useItemStore((state) => state.setCurrentSession);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const [sessionItems, setSessionItems] = useState<Record<number, Item[]>>({});

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      (async () => {
        await fetchSessions(50);
        const latest = useItemStore.getState().sessions;
        const data: Record<number, Item[]> = {};
        for (const s of latest) {
          data[s.id] = await getItemsForSession(s.id);
        }
        if (mounted) setSessionItems(data);
      })();
      return () => {
        mounted = false;
      };
    }, [fetchSessions, getItemsForSession])
  );

  const handleDeleteItem = async (itemId: number, sessionId: number) => {
    Alert.alert("Sil", "Bu ürünü silmek istediğinize emin misiniz?", [
      { text: "İptal", style: "cancel" },
      {
        text: "Sil",
        style: "destructive",
        onPress: async () => {
            await deleteItem(itemId, sessionId);
            const updated = await getItemsForSession(sessionId);
            setSessionItems((prev) => ({ ...prev, [sessionId]: updated }));
            if (sessionId === currentSessionId) {
                // Refresh current session if needed
            }
        }
      }
    ]);
  };

  const handleDeleteSession = async (sessionId: number) => {
    Alert.alert("Fişi Sil", "Bu alışveriş fişini ve içindeki tüm ürünleri silmek istediğinize emin misiniz?", [
      { text: "İptal", style: "cancel" },
      {
        text: "Tümünü Sil",
        style: "destructive",
        onPress: async () => {
            await deleteSession(sessionId);
        }
      }
    ]);
  };

  const renderSession = ({ item }: { item: Session }) => {
    const items = sessionItems[item.id] || [];
    const total = items.reduce((acc, it) => acc + it.price * it.quantity, 0);
    const dateObj = new Date(item.created_at);
    const dateLabel = dateObj.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });

    return (
      <View
        style={[
          styles.card,
          { backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#ffffff' },
        ]}
      >
        {/* Header Section */}
        <View style={styles.cardHeader}>
            <View style={{flex: 1}}>
                <Text style={[styles.dateText, { color: colors.tabIconDefault }]}>{dateLabel}</Text>
                {item.note ? <Text style={[styles.noteText, { color: colors.text }]}>{item.note}</Text> : null}
            </View>
            <View style={{ alignItems: 'flex-end', gap: 8 }}>
                <View style={styles.totalBadge}>
                    <Text style={[styles.totalText, { color: colors.tint }]}>{total.toFixed(2)} ₺</Text>
                </View>
                <TouchableOpacity 
                    onPress={() => handleDeleteSession(item.id)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4, opacity: 0.8 }}
                >
                    <Ionicons name="trash-bin-outline" size={14} color="#ef4444" />
                    <Text style={{ color: '#ef4444', fontSize: 12, fontWeight: '600' }}>Fişi Sil</Text>
                </TouchableOpacity>
            </View>
        </View>

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: colorScheme === 'dark' ? '#2c2c2e' : '#f3f4f6' }]} />

        {/* Items List */}
        {items.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.tabIconDefault }]}>Bu fişte ürün yok.</Text>
        ) : (
          items.map((it, index) => (
            <View key={it.id} style={[styles.itemRow, index !== items.length - 1 && { borderBottomWidth: 1, borderBottomColor: colorScheme === 'dark' ? '#2c2c2e' : '#f3f4f6' }]}>
              <View style={styles.itemInfo}>
                <Text style={[styles.itemName, { color: colors.text }]}>{it.product_name || "Ürün"}</Text>
                <Text style={[styles.itemMeta, { color: colors.tabIconDefault }]}>
                  {it.quantity} x {it.price.toFixed(2)} ₺
                </Text>
              </View>
              <View style={styles.itemRight}>
                  <Text style={[styles.itemTotal, { color: colors.text }]}>{(it.price * it.quantity).toFixed(2)} ₺</Text>
                  <TouchableOpacity onPress={() => handleDeleteItem(it.id, item.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name="trash-outline" size={20} color="#ef4444" />
                  </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Geçmiş Alışverişler</Text>
      </View>
      
      {sessions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="receipt-outline" size={64} color={colors.tabIconDefault} />
          <Text style={[styles.emptyStateText, { color: colors.tabIconDefault }]}>Henüz kayıtlı alışveriş yok.</Text>
        </View>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderSession}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
    gap: 16,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  dateText: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 4,
  },
  noteText: {
    fontSize: 15,
    fontWeight: "500",
  },
  totalBadge: {
    backgroundColor: "rgba(47, 149, 220, 0.1)", // Light tint
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  totalText: {
    fontSize: 18,
    fontWeight: "800",
  },
  divider: {
    height: 1,
    marginBottom: 12,
  },
  emptyText: {
    fontStyle: "italic",
    textAlign: "center",
    marginVertical: 10,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  itemMeta: {
    fontSize: 13,
  },
  itemRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  itemTotal: {
    fontSize: 15,
    fontWeight: "700",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    marginTop: 100,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: "500",
  },
});
