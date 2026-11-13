import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, DarkColors } from '../theme/colors';
import { useApp } from '../context/AppContext';

export const ConfirmDialogModal: React.FC = () => {
  const { confirmDialog, closeConfirmDialog, isDarkMode } = useApp();
  const themeColors = isDarkMode ? DarkColors : Colors;
  const styles = createStyles(themeColors);

  if (!confirmDialog) return null;

  const handleConfirm = () => {
    const fn = confirmDialog.onConfirm;
    closeConfirmDialog();
    if (fn) fn();
  };

  return (
    <Modal
      visible={Boolean(confirmDialog)}
      transparent
      animationType="fade"
      onRequestClose={closeConfirmDialog}
    >
      <View style={styles.overlay}>
        <View style={styles.box}>
          <View
            style={[
              styles.iconCircle,
              confirmDialog.isDestructive
                ? styles.iconCircleDestructive
                : styles.iconCircleNormal,
            ]}
          >
            <MaterialIcons
              name={confirmDialog.isDestructive ? 'warning' : 'help-outline'}
              size={28}
              color={confirmDialog.isDestructive ? themeColors.error : themeColors.primary}
            />
          </View>

          <Text style={styles.title}>{confirmDialog.title}</Text>
          <Text style={styles.message}>{confirmDialog.message}</Text>

          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={closeConfirmDialog}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelBtnText}>
                {confirmDialog.cancelText || 'Cancelar'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.confirmBtn,
                confirmDialog.isDestructive && styles.confirmBtnDestructive,
              ]}
              onPress={handleConfirm}
              activeOpacity={0.8}
            >
              <Text style={styles.confirmBtnText}>
                {confirmDialog.confirmText || 'Confirmar'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (themeColors: typeof Colors) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(19, 27, 46, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  box: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: themeColors.surfaceContainerLowest,
    borderRadius: 24,
    padding: 22,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  iconCircleNormal: {
    backgroundColor: themeColors.surfaceContainerHigh,
  },
  iconCircleDestructive: {
    backgroundColor: themeColors.errorContainer,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: themeColors.onSurface,
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 13,
    color: themeColors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
    paddingHorizontal: 6,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    backgroundColor: themeColors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: themeColors.onSurface,
  },
  confirmBtn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    backgroundColor: themeColors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnDestructive: {
    backgroundColor: themeColors.error,
  },
  confirmBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
});
