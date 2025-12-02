import SessionDropdown from "@/components/SessionDropdown";
import useItemStore from "@/store/items";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useEffect, useState } from "react";
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useColorScheme,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AddItemScreen() {
  const colorScheme = useColorScheme();

  const addItem = useItemStore((state) => state.addItem);
  const startSession = useItemStore((state) => state.startSession);
  const fetchSessions = useItemStore((state) => state.fetchSessions);
  const setCurrentSession = useItemStore((state) => state.setCurrentSession);
  const sessions = useItemStore((state) => state.sessions);
  const currentSessionId = useItemStore((state) => state.currentSessionId);
  
  const [pendingName, setPendingName] = useState("");
  const [pendingPrice, setPendingPrice] = useState("");
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  useEffect(() => {
    fetchSessions(5);
  }, []);

  const handleClear = () => {
    setPendingName("");
    setPendingPrice("");
    setSaveStatus(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Hızlı kuruş ekleme butonları için
  const addQuickPrice = (cents: string) => {
    const currentPrice = pendingPrice || "0";
    const wholePart = currentPrice.split('.')[0] || "0";
    setPendingPrice(`${wholePart}.${cents}`);
    Haptics.selectionAsync();
  };

  const handleSave = async () => {
    const numericPrice = parseFloat(pendingPrice.replace(",", "."));
    if (Number.isNaN(numericPrice) || numericPrice <= 0) return;

    let sessionId = currentSessionId;
    if (!sessionId) {
      sessionId = await startSession();
      await fetchSessions(5);
      await setCurrentSession(sessionId);
    }

    try {
      await addItem({ 
        product_name: pendingName.trim() || null, 
        price: numericPrice, 
        quantity: 1 
      }, sessionId || undefined);
      setSaveStatus("✓ Eklendi");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      setTimeout(() => {
          handleClear();
      }, 600);
    } catch (err) {
      setSaveStatus("❌ Hata");
    }
  };

  const handleStartSession = async () => {
    const newId = await startSession();
    await fetchSessions(5);
    await setCurrentSession(newId);
    handleClear();
  };

  const isDark = colorScheme === "dark";
  const bgStyle = { backgroundColor: isDark ? "#0A0E13" : "#F1F5F9" };
  const cardBg = { backgroundColor: isDark ? "#1E293B" : "#FFFFFF" };
  const textColor = { color: isDark ? "#F1F5F9" : "#0F172A" };

  return (
    <SafeAreaView style={[styles.container, bgStyle]}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          
          {/* Header */}
          <View style={[styles.header, cardBg]}>
            <View>
              <Text style={[styles.sessionLabel, { color: isDark ? "#94A3B8" : "#64748B" }]}>ALIŞVERİŞ</Text>
              <Text style={[styles.sessionNumber, textColor]}>#{currentSessionId || "-"}</Text>
            </View>
            <TouchableOpacity 
                style={[styles.newSessionBtn, { backgroundColor: isDark ? "#10B981" : "#059669" }]} 
                onPress={handleStartSession}
            >
              <Text style={styles.newSessionText}>+ Alışveriş Başlat</Text>
            </TouchableOpacity>
          </View>

          {/* Session Dropdown */}
          {sessions.length > 0 && (
            <View style={[styles.sessionSelector, cardBg]}>
              <SessionDropdown
                sessions={sessions}
                currentSessionId={currentSessionId}
                onSelect={async (id) => { await setCurrentSession(id); handleClear(); }}
                onLoadMore={() => fetchSessions(sessions.length + 20)}
              />
            </View>
          )}

          {/* INPUT KARTI */}
          <View style={[styles.inputCard, cardBg]}>
            {saveStatus && <Text style={[styles.statusText, { color: saveStatus.includes('✓') ? '#10B981' : '#ef4444' }]}>{saveStatus}</Text>}

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: isDark ? "#94A3B8" : "#64748B" }]}>Ürün Adı (Opsiyonel)</Text>
              <TextInput
                style={[styles.input, { 
                    backgroundColor: isDark ? "#0F172A" : "#F8FAFC", 
                    borderColor: isDark ? "#334155" : "#CBD5E1",
                    color: isDark ? "#fff" : "#000"
                }]}
                value={pendingName}
                onChangeText={setPendingName}
                placeholder="Ürün adı..."
                placeholderTextColor="#64748B"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: isDark ? "#94A3B8" : "#64748B" }]}>Fiyat *</Text>
              <TextInput
                style={[styles.input, styles.priceInput, { 
                    backgroundColor: isDark ? "#0F172A" : "#F8FAFC", 
                    borderColor: isDark ? "#334155" : "#CBD5E1",
                    color: isDark ? "#FCD34D" : "#D97706"
                }]}
                value={pendingPrice}
                onChangeText={setPendingPrice}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor="#64748B"
                autoFocus
              />
            </View>

            {/* Hızlı Kuruş Butonları */}
            <View style={styles.quickButtonsContainer}>
              <Text style={[styles.quickButtonsLabel, { color: isDark ? "#94A3B8" : "#64748B" }]}>Hızlı Kuruş:</Text>
              <View style={styles.quickButtons}>
                {['90', '95', '99', '50'].map((cents) => (
                  <TouchableOpacity
                    key={cents}
                    style={[styles.quickBtn, { backgroundColor: isDark ? '#334155' : '#e2e8f0' }]}
                    onPress={() => addQuickPrice(cents)}
                  >
                    <Text style={[styles.quickBtnText, { color: isDark ? '#fff' : '#1e293b' }]}>.{cents}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.btn, styles.clearBtn, { borderColor: isDark ? "#475569" : "#CBD5E1" }]}
                onPress={handleClear}
              >
                <Ionicons name="refresh" size={20} color={isDark ? "#94A3B8" : "#64748B"} />
                <Text style={[styles.btnText, { color: isDark ? "#94A3B8" : "#64748B" }]}>
                    Temizle
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                    styles.btn, 
                    styles.saveBtn, 
                    { backgroundColor: isDark ? "#10B981" : "#059669", opacity: !pendingPrice ? 0.5 : 1 }
                ]}
                onPress={handleSave}
                disabled={!pendingPrice}
              >
                <Ionicons name="add-circle" size={20} color="#fff" />
                <Text style={[styles.btnText, { color: "#fff" }]}>Ekle</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Bottom spacing for keyboard */}
          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, gap: 16 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderRadius: 16 },
  sessionLabel: { fontSize: 12, fontWeight: "700" },
  sessionNumber: { fontSize: 20, fontWeight: "800" },
  newSessionBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  newSessionText: { color: "#fff", fontWeight: "600" },
  sessionSelector: { padding: 12, borderRadius: 12 },
  
  inputCard: { padding: 16, borderRadius: 20, gap: 12 },
  statusText: { textAlign: 'center', fontWeight: 'bold', marginBottom: 4, fontSize: 14 },
  inputGroup: { gap: 4 },
  label: { fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  input: { height: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, fontSize: 16, fontWeight: "600" },
  priceInput: { fontSize: 24, fontWeight: "700", textAlign: "center", letterSpacing: 1 },
  
  quickButtonsContainer: { gap: 6 },
  quickButtonsLabel: { fontSize: 10, fontWeight: "700", textTransform: "uppercase" },
  quickButtons: { flexDirection: "row", gap: 6 },
  quickBtn: { 
    flex: 1, 
    paddingVertical: 10, 
    borderRadius: 8, 
    alignItems: "center",
    justifyContent: "center"
  },
  quickBtnText: { fontSize: 14, fontWeight: "700" },
  
  actionButtons: { flexDirection: "row", gap: 10, marginTop: 6 },
  btn: { flex: 1, height: 50, borderRadius: 12, justifyContent: "center", alignItems: "center", flexDirection: "row", gap: 6 },
  clearBtn: { borderWidth: 2, backgroundColor: "transparent", flex: 0.8 },
  saveBtn: { flex: 1.2 },
  btnText: { fontSize: 15, fontWeight: "700" },
});