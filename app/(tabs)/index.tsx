import SessionDropdown from "@/components/SessionDropdown";
import useItemStore from "@/store/items";
import TextRecognition, {
  TextRecognitionResult,
  TextRecognitionScript,
} from "@react-native-ml-kit/text-recognition";
import { useIsFocused } from "@react-navigation/native";
import * as FileSystem from "expo-file-system";
import * as Haptics from "expo-haptics";
import { useEffect, useRef, useState } from "react";
import {
  Dimensions,
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
import {
  Camera,
  useCameraDevice,
  useCameraFormat,
  useCameraPermission,
} from "react-native-vision-camera";

const { width, height } = Dimensions.get("window");

export default function ScanScreen() {
  const colorScheme = useColorScheme();
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice("back");
  const isFocused = useIsFocused();
  
  // 1. KAMERA FORMATI: En yüksek fotoğraf çözünürlüğünü seçiyoruz (OCR kalitesi için kritik)
  const format = useCameraFormat(device, [
    { photoResolution: 'max' },
    { videoResolution: 'max' }
  ]);

  const addItem = useItemStore((state) => state.addItem);
  const startSession = useItemStore((state) => state.startSession);
  const fetchSessions = useItemStore((state) => state.fetchSessions);
  const setCurrentSession = useItemStore((state) => state.setCurrentSession);
  const sessions = useItemStore((state) => state.sessions);
  const currentSessionId = useItemStore((state) => state.currentSessionId);

  const cameraRef = useRef<Camera>(null);
  const isProcessingRef = useRef(false);
  
  // Tarama sıklığını artırdık (Daha hızlı tepki)
  const SCAN_INTERVAL = 600; 
  
  const [pendingName, setPendingName] = useState("");
  const [pendingPrice, setPendingPrice] = useState("");
  const [paused, setPaused] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [zoom, setZoom] = useState(device?.neutralZoom || 1);
  const [showZoomControls, setShowZoomControls] = useState(false);

  useEffect(() => {
    fetchSessions(5);
  }, []);

  useEffect(() => {
    if (!hasPermission) requestPermission();
  }, [hasPermission]);

  // Zoom Kontrolü
  const handleZoom = (factor: number) => {
    if (!device) return;
    const newZoom = Math.min(Math.max(zoom + factor, device.minZoom), Math.min(device.maxZoom, 5)); // Max 5x zoom
    setZoom(newZoom);
    Haptics.selectionAsync();
  };

  // Taramayı Sıfırla / Tekrar Dene
  const handleRetry = () => {
    setPaused(false);
    setPendingName("");
    setPendingPrice("");
    setSaveStatus(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  useEffect(() => {
    if (!device || !hasPermission || paused) return;

    let active = true;
    const interval = setInterval(async () => {
      if (!active || !isFocused || paused || isProcessingRef.current) return;
      if (!cameraRef.current) return;

      try {
        isProcessingRef.current = true;
        
        const photo = await cameraRef.current.takePhoto({
          // qualityPrioritization ve skipMetadata kaldırıldı
          flash: "off",
          enableShutterSound: false,
        });

        if (!photo?.path) return;

        const uri = `file://${photo.path}`;
        const result = await TextRecognition.recognize(uri, TextRecognitionScript.LATIN);
        
        // OCR Kalitesini artırmak için filtreleme fonksiyonuna gönderiyoruz
        processOCRResult(result, photo.width, photo.height);

        FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
      } catch (error) {
        console.log("OCR Error skipping frame");
      } finally {
        isProcessingRef.current = false;
      }
    }, SCAN_INTERVAL);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [device, hasPermission, isFocused, paused]);

  // 2. GELİŞMİŞ OCR İŞLEME VE FİLTRELEME
  const processOCRResult = (result: TextRecognitionResult, imgWidth: number, imgHeight: number) => {
    if (!result?.blocks || result.blocks.length === 0) return;

    const centerY = imgHeight / 2;
    const candidates: any[] = [];
    const weightPattern = /\b\d+\s*(g|gr|kg|adet|x)\b/i;

    // Bloklar ve satırlar üzerinde dönerek konum bazlı puanlama yap
    result.blocks.forEach(block => {
        block.lines.forEach(line => {
            const frame = line.frame;
            if (!frame) return;

            const lineCenterY = frame.top + (frame.height / 2);
            const distY = Math.abs(centerY - lineCenterY);
            
            // 1. Alan Kontrolü: Sadece orta şeritteki (%40) yazılara bak
            // Çok aşağıda veya çok yukarıda olanları direkt ele
            if (distY > (imgHeight * 0.20)) return; 

            const text = line.text.trim();
            if (text.length < 2) return;

            // Regex Analizi
            let score = 0;
            
            const hasCurrency = /₺|tl/i.test(text);
            const hasDecimal = /\d+[.,]\d{2}\b/.test(text);
            const isInteger = /^\d{1,4}$/.test(text);
            
            if (hasCurrency) score += 20;
            if (hasDecimal) score += 10;
            if (isInteger) score += 5;

            // Eğer hiç sayı yoksa geç
            if (!/\d/.test(text)) return;

            // 2. Konum Puanı: Merkeze ne kadar yakınsa o kadar iyi
            // Maksimum 10 puan (Tam merkezde) -> Uzaklaştıkça düşer
            const positionScore = 10 * (1 - (distY / (imgHeight * 0.20)));
            score += Math.max(0, positionScore);

            // 3. Boyut Puanı: Yazı ne kadar büyükse o kadar iyi (Fiyatlar genelde büyüktür)
            // Frame yüksekliğini puana ekle (Örn: 40px yükseklik -> +4 puan)
            score += (frame.height / 10);

            // Ağırlık birimlerini ele (gr, kg, adet) - Fiyat değildir
            if (weightPattern.test(text)) {
                score -= 50;
            }

            // Temizleme
            // Sadece sayıları ve noktayı al
            const matches = text.match(/(\d+[.,]?\d*)/);
            if (matches) {
                candidates.push({
                    raw: matches[0],
                    score: score,
                    text: text,
                    frame: frame // İsim bulmak için konumu sakla
                });
            }
        });
    });

    // En yüksek puanlıyı seç
    candidates.sort((a, b) => b.score - a.score);
    const chosen = candidates[0];

    if (chosen) {
      const normalized = chosen.raw.replace(",", ".").replace(/\s+/g, "");
      const parsed = parseFloat(normalized);

      if (!Number.isNaN(parsed) && parsed > 0 && parsed < 100000) {
        
        // İsim bulma: Seçilen fiyatın hemen üstündeki satırı bul
        let potentialName = "";
        let minDistance = Infinity;

        // Tüm satırları tekrar gez ve fiyatın üstünde en yakın olanı bul
        result.blocks.forEach(block => {
            block.lines.forEach(line => {
                if (!line.frame || !chosen.frame) return;
                
                // Fiyat satırının kendisi olmasın
                if (line.text === chosen.text) return;

                // Fiyatın üstünde olmalı (Y koordinatı daha küçük olmalı)
                if (line.frame.top < chosen.frame.top) {
                    const distance = chosen.frame.top - (line.frame.top + line.frame.height);
                    // Çok uzakta olmasın (maks 100px yukarıda) ve aynı hizada olsun (kabaca)
                    if (distance > 0 && distance < 100 && distance < minDistance) {
                        minDistance = distance;
                        potentialName = line.text;
                    }
                }
            });
        });

        // Eğer isim bulamadıysak ve aday listesi boş değilse, en üstteki satırı al (eski yöntem)
        if (!potentialName && result.blocks.length > 0 && result.blocks[0].lines.length > 0) {
             const firstLine = result.blocks[0].lines[0].text;
             if (firstLine !== chosen.text) potentialName = firstLine;
        }

        // İsim temizleme
        if (potentialName) {
             // İsim içinde sayı varsa ve TL yoksa, muhtemelen barkod veya başka bir sayıdır, temizle
            if (/\d{4,}/.test(potentialName)) potentialName = "";
            if (potentialName.length < 3) potentialName = "";
        }

        if (!pendingName && potentialName) {
            setPendingName(potentialName);
        }
        
        setPendingPrice(normalized);
        setPaused(true); // Durdur
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }
  };

  const handleSave = async () => {
    const numericPrice = parseFloat(pendingPrice.replace(",", "."));
    if (Number.isNaN(numericPrice)) return;

    let sessionId = currentSessionId;
    if (!sessionId) {
      sessionId = await startSession();
      await fetchSessions(5);
      await setCurrentSession(sessionId);
    }

    try {
      await addItem({ product_name: pendingName.trim() || "Ürün", price: numericPrice, quantity: 1 }, sessionId || undefined);
      setSaveStatus("✓ Eklendi");
      
      // Kayıttan sonra hemen yeni taramaya geç
      setTimeout(() => {
          handleRetry();
      }, 800);
      
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (err) {
      setSaveStatus("❌ Hata");
    }
  };

  const handleStartSession = async () => {
    const newId = await startSession();
    await fetchSessions(5);
    await setCurrentSession(newId);
    handleRetry();
  };

  const isDark = colorScheme === "dark";
  const bgStyle = { backgroundColor: isDark ? "#0A0E13" : "#F1F5F9" };
  const cardBg = { backgroundColor: isDark ? "#1E293B" : "#FFFFFF" };
  const textColor = { color: isDark ? "#F1F5F9" : "#0F172A" };

  if (!hasPermission || !device) return <View style={styles.centerContainer}><Text>Kamera yok</Text></View>;

  return (
    <SafeAreaView style={[styles.container, bgStyle]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          
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
              <Text style={styles.newSessionText}>+ Yeni</Text>
            </TouchableOpacity>
          </View>

          {/* Session Dropdown */}
          {sessions.length > 0 && (
            <View style={[styles.sessionSelector, cardBg]}>
              <SessionDropdown
                sessions={sessions}
                currentSessionId={currentSessionId}
                onSelect={async (id) => { await setCurrentSession(id); handleRetry(); }}
                onLoadMore={() => fetchSessions(sessions.length + 20)}
              />
            </View>
          )}

          {/* KAMERA ALANI */}
          {/* 3. DOKUNARAK ODAKLA VE YENİDEN DENE */}
          <TouchableOpacity 
            activeOpacity={1} 
            onPress={paused ? handleRetry : undefined} // Paused ise tıklayınca resetle
            style={[
                styles.cameraContainer,
                { borderColor: paused ? "#F59E0B" : (isDark ? "#10B981" : "#059669") }
            ]}
          >
            <Camera
              style={StyleSheet.absoluteFill}
              device={device}
              isActive={!paused && isFocused}
              ref={cameraRef}
              format={format} // Yüksek kalite format
              photo={true}
              enableZoomGesture={true} // Elle zoom yapabilme
              zoom={zoom}
            />
            
            {/* Rehber Çizgiler */}
            {!paused && (
                <View style={styles.scanOverlay}>
                    <View style={styles.cornerTL} />
                    <View style={styles.cornerTR} />
                    <View style={styles.cornerBL} />
                    <View style={styles.cornerBR} />
                    <View style={styles.scanLine} />
                    <Text style={styles.scanText}>Etiketi ortalayın</Text>
                    {isProcessingRef.current && <Text style={{ position: 'absolute', top: 100, color: '#F59E0B', fontWeight: 'bold' }}>Taranıyor...</Text>}
                    
                    {/* Zoom Kontrolleri */}
                    <View style={styles.zoomControls}>
                        <TouchableOpacity onPress={() => handleZoom(-0.5)} style={styles.zoomBtn}>
                            <Text style={styles.zoomText}>-</Text>
                        </TouchableOpacity>
                        <View style={styles.zoomValueContainer}>
                            <Text style={styles.zoomValueText}>{zoom.toFixed(1)}x</Text>
                        </View>
                        <TouchableOpacity onPress={() => handleZoom(0.5)} style={styles.zoomBtn}>
                            <Text style={styles.zoomText}>+</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
            
            {/* PAUSED Overlay - Tıklanabilir hissi veriyoruz */}
            {paused && (
                <View style={styles.pausedOverlay}>
                    <Text style={styles.pausedIcon}>↺</Text>
                    <Text style={styles.pausedText}>Tekrar Taramak İçin Dokun</Text>
                </View>
            )}
          </TouchableOpacity>

          {/* INPUT KARTI */}
          <View style={[styles.inputCard, cardBg]}>
            {saveStatus && <Text style={styles.statusText}>{saveStatus}</Text>}

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: isDark ? "#94A3B8" : "#64748B" }]}>Ürün</Text>
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
              <Text style={[styles.label, { color: isDark ? "#94A3B8" : "#64748B" }]}>Fiyat</Text>
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
              />
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.btn, styles.skipBtn, { borderColor: isDark ? "#475569" : "#CBD5E1" }]}
                onPress={handleRetry}
              >
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
                <Text style={[styles.btnText, { color: "#fff" }]}>Kaydet</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#000" },
  scrollContent: { padding: 16, gap: 16 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderRadius: 16 },
  sessionLabel: { fontSize: 12, fontWeight: "700" },
  sessionNumber: { fontSize: 20, fontWeight: "800" },
  newSessionBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  newSessionText: { color: "#fff", fontWeight: "600" },
  sessionSelector: { padding: 12, borderRadius: 12 },
  
  // Kamera stilleri
  cameraContainer: {
    height: 300,
    width: "100%",
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 3,
    backgroundColor: "#000",
    position: "relative",
  },
  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cornerTL: { position: 'absolute', top: 40, left: 40, width: 30, height: 30, borderTopWidth: 4, borderLeftWidth: 4, borderColor: '#34D399', borderRadius: 4 },
  cornerTR: { position: 'absolute', top: 40, right: 40, width: 30, height: 30, borderTopWidth: 4, borderRightWidth: 4, borderColor: '#34D399', borderRadius: 4 },
  cornerBL: { position: 'absolute', bottom: 40, left: 40, width: 30, height: 30, borderBottomWidth: 4, borderLeftWidth: 4, borderColor: '#34D399', borderRadius: 4 },
  cornerBR: { position: 'absolute', bottom: 40, right: 40, width: 30, height: 30, borderBottomWidth: 4, borderRightWidth: 4, borderColor: '#34D399', borderRadius: 4 },
  scanLine: { width: 150, height: 2, backgroundColor: 'rgba(52, 211, 153, 0.5)' },
  scanText: { color: 'rgba(255,255,255,0.8)', marginTop: 10, fontSize: 12, fontWeight: '600', backgroundColor: 'rgba(0,0,0,0.3)', padding: 4, borderRadius: 4 },
  
  zoomControls: {
    position: 'absolute',
    bottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 4,
  },
  zoomBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  zoomValueContainer: {
    paddingHorizontal: 8,
  },
  zoomValueText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },

  pausedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10
  },
  pausedIcon: { fontSize: 40, color: '#fff', fontWeight: 'bold' },
  pausedText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  
  inputCard: { padding: 20, borderRadius: 20, gap: 16 },
  statusText: { textAlign: 'center', fontWeight: 'bold', color: '#10B981', marginBottom: 8 },
  inputGroup: { gap: 6 },
  label: { fontSize: 12, fontWeight: "700", textTransform: "uppercase" },
  input: { height: 54, borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, fontSize: 18, fontWeight: "600" },
  priceInput: { fontSize: 24, fontWeight: "700", textAlign: "right" },
  actionButtons: { flexDirection: "row", gap: 12, marginTop: 8 },
  btn: { flex: 1, height: 56, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  skipBtn: { borderWidth: 2, backgroundColor: "transparent", flex: 0.6 },
  saveBtn: { flex: 1.4 },
  btnText: { fontSize: 16, fontWeight: "700" },
});