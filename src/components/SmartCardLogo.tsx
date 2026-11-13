import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';

interface SmartCardLogoProps {
  size?: 'small' | 'medium' | 'large';
  variant?: 'light' | 'dark' | 'auto';
  isDarkMode?: boolean;
}

export const SmartCardLogo: React.FC<SmartCardLogoProps> = ({
  size = 'medium',
  variant = 'auto',
  isDarkMode = false,
}) => {
  const isDark = variant === 'auto' ? isDarkMode : variant === 'dark';

  const logoDimensions = {
    small: 38,
    medium: 48,
    large: 56,
  };

  const titleSizes = {
    small: 16,
    medium: 20,
    large: 24,
  };

  const subSizes = {
    small: 9,
    medium: 10,
    large: 11,
  };

  const currentLogoSize = logoDimensions[size];
  const currentTitleSize = titleSizes[size];
  const currentSubSize = subSizes[size];

  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/logo.png')}
        style={[
          styles.logoImage,
          {
            width: currentLogoSize,
            height: currentLogoSize,
            borderRadius: currentLogoSize * 0.25,
          },
        ]}
        resizeMode="contain"
        accessibilityLabel="Logo SmartCard BUS"
      />

      <View style={styles.textContainer}>
        <View style={styles.titleRow}>
          <Text
            style={[
              styles.titleMain,
              { fontSize: currentTitleSize, color: isDark ? '#FFFFFF' : '#131b2e' },
            ]}
          >
            SmartCard BUS
          </Text>
        </View>
        <View style={styles.metaRow}>
          <View style={styles.activeDot} />
          <Text
            style={[
              styles.tagline,
              { fontSize: currentSubSize, color: isDark ? '#94A3B8' : '#434656' },
            ]}
          >
            SISTEMA DIGITAL{'\n'}DE MOBILIDADE
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoImage: {
    borderRadius: 14,
  },
  textContainer: {
    justifyContent: 'center',
    flexShrink: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  titleMain: {
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00D68F',
  },
  tagline: {
    fontWeight: '700',
    letterSpacing: 0.8,
    lineHeight: 14,
  },
});
