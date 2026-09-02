import { View, Text, StyleSheet } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useIsFocused } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import Button from "../../lib/components/Button";

export default function ScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const isFocused = useIsFocused(); // Only render camera when screen is focused (Battery-conscious)

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Precisamos da sua permissão para usar a câmera.</Text>
        <Button title="Permitir Câmera" onPress={requestPermission} />
      </View>
    );
  }

  const handleBarcodeScanned = ({ type, data }: { type: string; data: string }) => {
    // Feedback tátil no escaneamento
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    console.log("Scanned:", type, data);
    // TODO: Processar o scan (offline first logic here)
  };

  return (
    <View style={styles.container}>
      {isFocused ? (
        <CameraView
          style={styles.camera}
          facing="back"
          onBarcodeScanned={handleBarcodeScanned}
        >
          <View style={styles.overlay}>
            <View style={styles.scanFrame} />
            <Text style={styles.instruction}>Posicione o QR Code no quadro</Text>
          </View>
        </CameraView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", backgroundColor: "#000" },
  text: { textAlign: "center", marginBottom: 16, color: "#fff" },
  camera: { flex: 1 },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center"
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: "#ef4444",
    backgroundColor: "transparent",
    borderRadius: 16,
  },
  instruction: {
    color: "#fff",
    marginTop: 24,
    fontSize: 16,
    fontWeight: "600",
  }
});
