import { SafeAreaView, StyleSheet, Text, View } from "react-native";
import useItemStore from "@/store/items";

export default function TotalScreen() {
  const items = useItemStore((state) => state.items);

  const total = items.reduce((acc, item) => acc + item.price, 0);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.totalContainer}>
        <Text style={styles.totalText}>Total:</Text>
        <Text style={styles.totalText}>{total.toFixed(2)}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  totalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  totalText: {
    fontSize: 32,
    fontWeight: "bold",
  },
});
