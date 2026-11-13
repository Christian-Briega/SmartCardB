import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, DarkColors } from '../theme/colors';
import { useApp } from '../context/AppContext';

export const SuccessReceiptModal: React.FC = () => {
  const { successReceipt, selectedCard, closeSuccessReceipt, setQrModalOpen, isDarkMode } = useApp();
  const themeColors = isDarkMode ? DarkColors : Colors;
  const styles = createStyles(themeColors);

  if (!successReceipt) return null;

  return (
    <Modal
      visible={Boolean(successReceipt)}
      transparent
      animationType="slide"
      onRequestClose={closeSuccessReceipt}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.checkBadge}>
            <MaterialIcons name="check" size={32} color="#ffffff" />
          </View>

          <Text style={styles.title}>{successReceipt.title}</Text>
          <Text style={styles.subtitle}>{successReceipt.subtitle}</Text>

          {/* Amount Box */}
          <View style={styles.amountBox}>
            <Text style={styles.amountLabel}>VALOR PROCESSADO</Text>
            <Text style={styles.amountValue}>
              R$ {successReceipt.amount.toFixed(2).replace('.', ',')}
            </Text>
          </View>

          {/* Receipt Lines */}
          <View style={styles.receiptDetails}>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Passe de Destino</Text>
              <Text style={styles.receiptVal}>{successReceipt.cardTitle}</Text>
            </View>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Forma Utilizada</Text>
              <Text style={styles.receiptVal}>{successReceipt.method}</Text>
            </View>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Data e Horário</Text>
              <Text style={styles.receiptVal}>{successReceipt.date}</Text>
            </View>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Autenticação Digital</Text>
              <Text style={styles.receiptVal}>{successReceipt.txId}</Text>
            </View>
          </View>

          {/* Action buttons */}
          {selectedCard?.number && (
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => {
                closeSuccessReceipt();
                setQrModalOpen(true);
              }}
            >
              <MaterialIcons name="qr-code-scanner" size={20} color="#ffffff" />
              <Text style={styles.primaryBtnText}>Acessar Catraca QR</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.closeBtn} onPress={closeSuccessReceipt}>
            <Text style={styles.closeBtnText}>Fechar Comprovante</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (themeColors: typeof Colors) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(19, 27, 46, 0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: themeColors.surfaceContainerLowest,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    alignItems: 'center',
  },
  checkBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: themeColors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -46,
    borderWidth: 4,
    borderColor: '#ffffff',
    shadowColor: themeColors.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: themeColors.onSurface,
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    color: themeColors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: 16,
  },
  amountBox: {
    width: '100%',
    backgroundColor: themeColors.surfaceContainerLow,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  amountLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: themeColors.outline,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  amountValue: {
    fontSize: 28,
    fontWeight: '800',
    color: themeColors.primary,
  },
  receiptDetails: {
    width: '100%',
    backgroundColor: themeColors.surfaceContainerLow,
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
    gap: 8,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  receiptLabel: {
    fontSize: 12,
    color: themeColors.outline,
  },
  receiptVal: {
    fontSize: 12,
    fontWeight: '700',
    color: themeColors.onSurface,
  },
  primaryBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: themeColors.primaryContainer,
    height: 50,
    borderRadius: 14,
    shadowColor: themeColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    marginBottom: 10,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  closeBtn: {
    paddingVertical: 8,
  },
  closeBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: themeColors.outline,
  },
});
