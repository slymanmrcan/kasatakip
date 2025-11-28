import { StyleSheet, Text, View } from "react-native";
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useFrameProcessor,
} from "react-native-vision-camera";
import {
  recognize,
  TextRecognitionResult,
} from "@react-native-ml-kit/text-recognition";
import { useIsFocused } from "@react-navigation/native";
import { useSharedValue } from "react-native-worklets-core";
import useItemStore from "@/store/items";
import { useEffect } from "react";
import { runOnJS } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

export default function ScanScreen() {
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice("back");
  const isFocused = useIsFocused();
  const addItem = useItemStore((state) => state.addItem);
  const lastScanTime = useSharedValue(0);
  const SCAN_INTERVAL = 1000; // 1 second

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission]);

  const frameProcessor = useFrameProcessor(
    (frame) => {
      "worklet";
      const currentTime = new Date().getTime();
      if (currentTime - lastScanTime.value > SCAN_INTERVAL) {
        lastScanTime.value = currentTime;
        const result = recognize(frame);
        runOnJS(handleRecognize)(result);
      }
    },
    [lastScanTime]
  );

  const handleRecognize = (result: TextRecognitionResult) => {
    const price = result.text.match(/(\d+([,.]\d{1,2})?)/);
    if (price) {
      addItem({
        name: "Scanned Item",
        price: parseFloat(price[0].replace(",", ".")),
      });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  if (!hasPermission) {
    return <Text>Requesting for camera permission</Text>;
  }

  if (device == null) {
    return <Text>No camera device found</Text>;
  }

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isFocused}
        frameProcessor={frameProcessor}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
