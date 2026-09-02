import { View, Text, StyleSheet } from "react-native";

export default function AuditsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Auditorias</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#f9fafb" },
  title: { fontSize: 20, fontWeight: "bold", marginBottom: 16 }
});
