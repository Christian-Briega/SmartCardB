import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, DarkColors } from '../theme/colors';
import { useApp } from '../context/AppContext';

export const AppNotificationModal: React.FC = () => {
  const { notification, closeNotification, isDarkMode } = useApp();
  const themeColors = isDarkMode ? DarkColors : Colors;

  if (!notification) return null;

  const isError = notification.type === 'error';
  const isSuccess = notification.type === 'success';
  const backgroundColor = isError
    ? themeColors.errorContainer
    : isSuccess
    ? themeColors.secondaryContainer
    : '#fff3cd';
  const accentColor = isError
    ? themeColors.error
    : isSuccess
    ? themeColors.secondary
    : '#8a6100';
  const icon = isError ? 'error-outline' : isSuccess ? 'check-circle' : 'info-outline';

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={closeNotification}
    >
      <View style={styles.overlay}>
        <View style={[styles.box, { backgroundColor, borderColor: accentColor }]}>
          <View style={styles.header}>
            <MaterialIcons name={icon} size={24} color={accentColor} />
            <Text style={[styles.title, { color: accentColor }]}>{notification.title}</Text>
          </View>
          <Text style={[styles.message, { color: themeColors.onSurface }]}>
            {notification.message}
          </Text>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: accentColor }]}
            onPress={closeNotification}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Entendi</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(19, 27, 46, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  box: {
    width: '100%',
    maxWidth: 380,
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 18,
  },
  button: {
    minHeight: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
