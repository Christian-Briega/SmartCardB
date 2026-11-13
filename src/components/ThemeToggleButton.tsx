import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { Colors, DarkColors } from '../theme/colors';

export const ThemeToggleButton: React.FC = () => {
  const { isDarkMode, toggleTheme } = useApp();
  const themeColors = isDarkMode ? DarkColors : Colors;

  return (
    <TouchableOpacity
      onPress={toggleTheme}
      activeOpacity={0.85}
      accessibilityRole="switch"
      accessibilityState={{ checked: isDarkMode }}
      accessibilityLabel={isDarkMode ? 'Ativar tema claro' : 'Ativar tema escuro'}
      style={[
        styles.track,
        { backgroundColor: themeColors.surfaceContainerHigh },
      ]}
    >
      <MaterialIcons
        name="light-mode"
        size={16}
        color={isDarkMode ? themeColors.outline : themeColors.onPrimary}
      />
      <MaterialIcons
        name="dark-mode"
        size={16}
        color={isDarkMode ? themeColors.onPrimary : themeColors.outline}
      />
      <View
        style={[
          styles.thumb,
          {
            left: isDarkMode ? 33 : 3,
            backgroundColor: themeColors.primaryContainer,
          },
        ]}
      >
        <MaterialIcons
          name={isDarkMode ? 'dark-mode' : 'light-mode'}
          size={18}
          color={themeColors.onPrimaryContainer}
        />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  track: {
    width: 66,
    height: 36,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 7,
    position: 'relative',
  },
  thumb: {
    position: 'absolute',
    top: 3,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
});