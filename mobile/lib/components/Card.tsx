import { View, Text, StyleSheet, ViewProps } from "react-native";

interface CardProps extends ViewProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

export default function Card({ title, subtitle, children, style, ...props }: CardProps) {
  return (
    <View style={[styles.card, style]} {...props}>
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3, // For Android
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 12,
  }
});
