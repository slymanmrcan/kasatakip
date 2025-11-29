import { Tabs } from "expo-router";
import React from "react";
import { TabBarIcon } from "@/components/TabBarIcon";
import { useColorScheme } from "react-native";
import Colors from "@/constants/Colors";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
        tabBarInactiveTintColor: "#7A7A7A",
        tabBarStyle: {
          backgroundColor: colorScheme === "dark" ? "#0a0a0a" : "#ffffff",
          borderTopColor: colorScheme === "dark" ? "#1f1f1f" : "#e0e0e0",
        },
        tabBarLabelStyle: {
          fontWeight: "600",
          fontSize: 12,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Tara",
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              name={focused ? "scan" : "scan-outline"}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="list"
        options={{
          title: "Listeler",
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              name={focused ? "list" : "list-outline"}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="total"
        options={{
          title: "Toplam",
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              name={focused ? "calculator" : "calculator-outline"}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
