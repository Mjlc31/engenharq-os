import { Text, StyleSheet, Pressable } from "react-native";
import { useTheme } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Index() {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>EngenharQ OS Mobile</Text>
      <Text style={[styles.subtitle, { color: colors.text, opacity: 0.7 }]}>Padrão Ouro em Segurança Operacional</Text>
      
      {/* 
        Touch Target: > 44px (iOS) / 48px (Android)
        Thumb Zone: Positioned comfortably for one-handed use 
      */}
      <Pressable 
        style={({ pressed }) => [
          styles.button,
          { opacity: pressed ? 0.8 : 1 }
        ]} 
        accessibilityLabel="Iniciar inspeção offline"
        android_ripple={{ color: 'rgba(255, 255, 255, 0.3)' }}
      >
        <Text style={styles.buttonText}>Iniciar Inspeção Offline</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 40,
  },
  button: {
    backgroundColor: "#ef4444", // Tailwind red-500 (EngenharQ theme primary color)
    paddingVertical: 16, // Ensures touch target is at least 48px height
    paddingHorizontal: 32,
    borderRadius: 12,
    minHeight: 48,
    minWidth: 200,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
  }
});
