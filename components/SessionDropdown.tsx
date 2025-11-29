import React from "react";
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Session } from "@/store/items";

interface Props {
  sessions: Session[];
  currentSessionId: number | null;
  onSelect: (id: number) => void;
  onLoadMore?: () => void;
}

const SessionDropdown: React.FC<Props> = ({ sessions, currentSessionId, onSelect, onLoadMore }) => {
  const [open, setOpen] = React.useState(false);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.trigger}
        onPress={() => setOpen((p) => !p)}
        activeOpacity={0.7}
      >
        <Text style={styles.triggerText}>
          {currentSessionId ? `Seans #${currentSessionId}` : "Seans seç"}
        </Text>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={18}
          color="#e5e7eb"
        />
      </TouchableOpacity>
      {open && (
        <View style={styles.dropdown}>
          <ScrollView style={{ maxHeight: 220 }}>
            {sessions.map((s) => (
              <TouchableOpacity
                key={s.id}
                style={styles.option}
                onPress={() => {
                  setOpen(false);
                  onSelect(s.id);
                }}
              >
                <Text style={styles.optionText}>#{s.id} {s.note ?? ""}</Text>
              </TouchableOpacity>
            ))}
            {sessions.length === 0 && (
              <Text style={styles.optionText}>Henüz seans yok</Text>
            )}
          </ScrollView>
          {onLoadMore && (
            <TouchableOpacity style={styles.loadMore} onPress={onLoadMore}>
              <Text style={styles.optionText}>Daha fazla getir</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#111827",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 12 : 10,
    borderWidth: 1,
    borderColor: "#1f2937",
  },
  triggerText: {
    color: "#e5e7eb",
    fontWeight: "700",
  },
  dropdown: {
    marginTop: 6,
    backgroundColor: "#0f172a",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1f2937",
    overflow: "hidden",
  },
  option: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  optionText: {
    color: "#e5e7eb",
  },
  loadMore: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#1f2937",
  },
});

export default SessionDropdown;
