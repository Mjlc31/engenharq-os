import { Tabs } from "expo-router";
import { Platform } from "react-native";
import { Map, Users, ClipboardCheck, ScanLine, LayoutDashboard } from "lucide-react-native";
import OfflineIndicator from "../../lib/components/OfflineIndicator";

export default function TabLayout() {
  return (
    <>
      <OfflineIndicator />
      <Tabs
        screenOptions={{
          headerShown: true,
          tabBarActiveTintColor: "#ef4444", // Tailwind red-500
          tabBarInactiveTintColor: "#6b7280", // Tailwind gray-500
          tabBarStyle: {
            backgroundColor: "#ffffff",
            borderTopWidth: 1,
            borderTopColor: "#e5e7eb",
            height: Platform.OS === "ios" ? 88 : 60,
            paddingBottom: Platform.OS === "ios" ? 28 : 8,
            paddingTop: 8,
          },
          headerStyle: {
            backgroundColor: "#ffffff",
          },
          headerTitleStyle: {
            fontWeight: "bold",
            color: "#111827",
          }
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Painel",
            tabBarIcon: ({ color }) => <LayoutDashboard size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="workers"
          options={{
            title: "Equipe",
            tabBarIcon: ({ color }) => <Users size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="scanner"
          options={{
            title: "Scanner",
            tabBarIcon: ({ color }) => <ScanLine size={32} color={color} />,
            tabBarLabel: () => null, // Hide label to make it look like a FAB
          }}
        />
        <Tabs.Screen
          name="audits"
          options={{
            title: "Auditorias",
            tabBarIcon: ({ color }) => <ClipboardCheck size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="map"
          options={{
            title: "Mapa",
            tabBarIcon: ({ color }) => <Map size={24} color={color} />,
          }}
        />
      </Tabs>
    </>
  );
}
