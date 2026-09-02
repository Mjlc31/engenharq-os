import { Text, View, StyleSheet } from "react-native";
import { Link, useRouter } from "expo-router";
import Button from "../../lib/components/Button";
import Card from "../../lib/components/Card";

export default function Index() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Card title="EngenharQ OS" subtitle="Padrão Ouro em Segurança Operacional">
        <Text style={styles.text}>Resumo do Dia: 4 Auditorias Pendentes, 12 Trabalhadores Ativos</Text>
      </Card>
      
      {/* 
        Touch Target: > 44px (iOS) / 48px (Android)
        Thumb Zone: Positioned comfortably for one-handed use 
      */}
      <Button 
        title="Iniciar Inspeção Rápida" 
        onPress={() => router.push("/(tabs)/scanner")} 
        style={{ marginTop: 24 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb", // Tailwind gray-50
    padding: 20,
  },
  text: {
    color: "#4b5563",
    fontSize: 14,
    lineHeight: 20,
  }
});
