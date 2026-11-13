import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp, Platform } from 'react-native';
import { BlurView } from 'expo-blur';

interface GlassCardProps {
  children: React.ReactNode;
  intensity?: number;
  tint?: 'light' | 'dark' | 'default';
  isDarkMode?: boolean;
  style?: StyleProp<ViewStyle>;
  borderRadius?: number;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  intensity = 70,
  tint,
  isDarkMode = false,
  style,
  borderRadius = 20,
}) => {
  const resolvedTint = tint || (isDarkMode ? 'dark' : 'light');

  return (
    <View
      style={[
        styles.outerContainer,
        {
          borderRadius,
          borderColor: isDarkMode
            ? 'rgba(255, 255, 255, 0.12)'
            : 'rgba(255, 255, 255, 0.45)',
          backgroundColor: isDarkMode
            ? 'rgba(30, 41, 59, 0.65)'
            : 'rgba(255, 255, 255, 0.6)',
        },
        Platform.OS === 'web' && ({
          backdropFilter: `blur(${Math.round(intensity / 4)}px)`,
          WebkitBackdropFilter: `blur(${Math.round(intensity / 4)}px)`,
        } as any),
        style,
      ]}
    >
      <BlurView
        intensity={intensity}
        tint={resolvedTint}
        style={[styles.blurView, { borderRadius }]}
      >
        {children}
      </BlurView>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    overflow: 'hidden',
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },
  blurView: {
    width: '100%',
    padding: 0,
  },
});

