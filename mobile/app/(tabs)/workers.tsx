import { View, Text, StyleSheet, FlatList } from "react-native";

export default function WorkersScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Trabalhadores</Text>
      {/* FlatList goes here */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#f9fafb" },
  title: { fontSize: 20, fontWeight: "bold", marginBottom: 16 }
});
