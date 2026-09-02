import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, TouchableOpacityProps } from "react-native";

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  loading?: boolean;
  variant?: "primary" | "secondary" | "danger";
}

export default function Button({ title, loading, variant = "primary", style, disabled, ...props }: ButtonProps) {
  const getBackgroundColor = () => {
    if (disabled) return "#d1d5db"; // gray-300
    switch (variant) {
      case "primary": return "#ef4444"; // red-500
      case "secondary": return "#4b5563"; // gray-600
      case "danger": return "#b91c1c"; // red-700
      default: return "#ef4444";
    }
  };

  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor: getBackgroundColor() }, style]}
      disabled={disabled || loading}
      activeOpacity={0.8}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={styles.text}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  text: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  }
});
