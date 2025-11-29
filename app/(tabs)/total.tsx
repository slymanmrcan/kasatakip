import Colors from "@/constants/Colors";
import useItemStore from "@/store/items";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, useColorScheme, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function TotalScreen() {
  const items = useItemStore((state) => state.items);
  const fetchItems = useItemStore((state) => state.fetchItems);
  const fetchSessions = useItemStore((state) => state.fetchSessions);
  const currentSessionId = useItemStore((state) => state.currentSessionId);
  const itemsState = useItemStore((state) => state.items);
  const [total, setTotal] = useState(0);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  useFocusEffect(
    useCallback(() => {
      (async () => {
        await fetchSessions(5);
        await fetchItems();
      })();
    }, [fetchSessions, fetchItems])
  );

  useEffect(() => {
    setTotal(itemsState.reduce((acc, item) => acc + item.price * item.quantity, 0));
  }, [itemsState]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Anlık Sepet</Text>
        <View style={styles.sessionBadge}>
            <Text style={styles.sessionBadgeText}>#{currentSessionId ?? "Yeni"}</Text>
        </View>
      </View>

      <View style={styles.content}>
        {/* Total Card */}
        <View style={[styles.totalCard, { backgroundColor: colors.tint }]}>
            <Text style={styles.totalLabel}>Toplam Tutar</Text>
            <Text style={styles.totalAmount}>{total.toFixed(2)} ₺</Text>
            <Text style={styles.itemCount}>{itemsState.length} Ürün</Text>
        </View>

        {/* Recent Items Header */}
        <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Son Eklenenler</Text>
        </View>

        {/* Items List */}
        <ScrollView 
            style={styles.listContainer} 
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
        >
            {itemsState.length === 0 ? (
                <View style={styles.emptyState}>
                    <Ionicons name="basket-outline" size={48} color={colors.tabIconDefault} />
                    <Text style={[styles.emptyText, { color: colors.tabIconDefault }]}>Sepetiniz boş.</Text>
                </View>
            ) : (
                itemsState.slice().reverse().map((item, index) => (
                    <View key={item.id} style={[styles.itemRow, { borderBottomColor: colorScheme === 'dark' ? '#2c2c2e' : '#f3f4f6' }]}>
                        <View style={styles.itemIcon}>
                            <Ionicons name="pricetag" size={20} color={colors.tint} />
                        </View>
                        <View style={styles.itemDetails}>
                            <Text style={[styles.itemName, { color: colors.text }]}>{item.product_name}</Text>
                            <Text style={[styles.itemQuantity, { color: colors.tabIconDefault }]}>{item.quantity} adet x {item.price.toFixed(2)} ₺</Text>
                        </View>
                        <Text style={[styles.itemTotal, { color: colors.text }]}>{(item.price * item.quantity).toFixed(2)} ₺</Text>
                    </View>
                ))
            )}
        </ScrollView>
      </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  sessionBadge: {
    backgroundColor: 'rgba(150, 150, 150, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sessionBadgeText: {
    fontWeight: '700',
    fontSize: 14,
    color: '#888',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  totalCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  totalLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  totalAmount: {
    color: '#fff',
    fontSize: 42,
    fontWeight: '800',
    marginBottom: 4,
  },
  itemCount: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 10,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  itemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(150, 150, 150, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  itemQuantity: {
    fontSize: 13,
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: '700',
  },
});
