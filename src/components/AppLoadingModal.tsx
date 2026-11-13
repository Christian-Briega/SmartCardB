import React from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, View } from 'react-native';
import { Colors, DarkColors } from '../theme/colors';
import { useApp } from '../context/AppContext';

export const AppLoadingModal: React.FC = () => {
  const { isScreenLoading, isDarkMode } = useApp();
  const themeColors = isDarkMode ? DarkColors : Colors;

  return (
    <Modal
      visible={isScreenLoading}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => undefined}
    >
      <View style={styles.overlay}>
        <View style={[styles.loaderCard, { backgroundColor: themeColors.surfaceContainerLowest }]}>
          <ActivityIndicator size="large" color={themeColors.primary} />
          <Text style={[styles.label, { color: themeColors.onSurface }]}>Carregando...</Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(19, 27, 46, 0.38)',
  },
  loaderCard: {
    minWidth: 150,
    minHeight: 120,
    padding: 22,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    elevation: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
});
