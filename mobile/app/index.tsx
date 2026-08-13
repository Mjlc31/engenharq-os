import { Text, View, StyleSheet, TouchableOpacity } from "react-native";
import { Link } from "expo-router";

export default function Index() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>EngenharQ OS Mobile</Text>
      <Text style={styles.subtitle}>Padrão Ouro em Segurança Operacional</Text>
      
      {/* 
        Touch Target: > 44px (iOS) / 48px (Android)
        Thumb Zone: Positioned comfortably for one-handed use 
      */}
      <TouchableOpacity style={styles.button} accessibilityLabel="Iniciar inspeção offline">
        <Text style={styles.buttonText}>Iniciar Inspeção Offline</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9fafb", // Tailwind gray-50
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111827", // Tailwind gray-900
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#4b5563", // Tailwind gray-600
    textAlign: "center",
    marginBottom: 40,
  },
  button: {
    backgroundColor: "#ef4444", // Tailwind red-500 (EngenharQ theme)
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
