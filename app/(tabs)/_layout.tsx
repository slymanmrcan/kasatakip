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
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Scan",
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
          title: "List",
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
          title: "Total",
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
