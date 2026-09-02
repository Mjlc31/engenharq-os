import { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { useAppStore } from "../store/useAppStore";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function OfflineIndicator() {
  const { isOnline, setOnline } = useAppStore();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setOnline(!!state.isConnected && !!state.isInternetReachable);
    });
    return () => unsubscribe();
  }, []);

  if (isOnline) return null;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.text}>Modo Offline - Dados salvos localmente</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#f59e0b", // yellow-500
    paddingBottom: 4,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  text: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  }
});
