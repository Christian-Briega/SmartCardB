import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, DarkColors } from '../theme/colors';
import { InteractiveButton } from './InteractiveButton';
import { mercadoPagoService, MercadoPagoPixResponse } from '../services/mercadoPagoService';

interface MercadoPagoPixModalProps {
  visible: boolean;
  orderData: MercadoPagoPixResponse | null;
  cardTitle: string;
  operationLabel?: string;
  onClose: () => void;
  onPaymentApproved: (amount: number, txId: string) => void;
  showNotification: (title: string, message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  isDarkMode?: boolean;
}

export const MercadoPagoPixModal: React.FC<MercadoPagoPixModalProps> = ({
  visible,
  orderData,
  cardTitle,
  operationLabel = 'VALOR DA RECARGA',
  onClose,
  onPaymentApproved,
  showNotification,
  isDarkMode = false,
}) => {
  const themeColors = isDarkMode ? DarkColors : Colors;
  const styles = createStyles(themeColors);

  const [secondsLeft, setSecondsLeft] = useState(900); // 15 minutos
  const [copied, setCopied] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);

  useEffect(() => {
    if (!visible || !orderData) {
      setSecondsLeft(900);
      setCopied(false);
      return;
    }

    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    const statusPoll = setInterval(async () => {
      const status = await mercadoPagoService.checkPaymentStatus(
        orderData.paymentId,
        orderData.orderId
      );
      if (status === 'approved') {
        clearInterval(statusPoll);
        onPaymentApproved(orderData.amount, orderData.paymentId);
      }
    }, 4000);

    return () => {
      clearInterval(timer);
      clearInterval(statusPoll);
    };
  }, [visible, orderData]);

  if (!visible || !orderData) return null;

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const handleCopyCode = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(orderData.pixCopiaECola);
      }
      setCopied(true);
      showNotification('Código Copiado!', 'Cole no aplicativo do seu banco para pagar.', 'success');
      setTimeout(() => setCopied(false), 3000);
    } catch {
      setCopied(true);
      showNotification('Código Pix Selecionado', 'Copie o código do campo de texto.', 'info');
    }
  };

  const handleSimulatePayment = async () => {
    setIsSimulating(true);
    setTimeout(async () => {
      try {
        await mercadoPagoService.simulatePixApproval(
          orderData.orderId,
          orderData.orderId,
          orderData.amount
        );
        setIsSimulating(false);
        onPaymentApproved(orderData.amount, orderData.paymentId);
      } catch (err) {
        setIsSimulating(false);
        showNotification('Erro na Simulação', 'Não foi possível aprovar o teste.', 'error');
      }
    }, 1200);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header Mercado Pago & SmartCard BUS */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.mpBadge}>
                <MaterialIcons name="bolt" size={20} color="#009EE3" />
              </View>
              <View>
                <Text style={styles.title}>Pagamento via Pix</Text>
                <Text style={styles.subtitle}>Mercado Pago Gateway Oficial</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <MaterialIcons name="close" size={22} color={themeColors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          {/* Amount Highlight */}
          <LinearGradient
            colors={['#009EE3', '#007EB5', '#00557A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.amountBanner}
          >
            <View>
              <Text style={styles.amountLabel}>{operationLabel}</Text>
              <Text style={styles.amountValue}>
                R$ {orderData.amount.toFixed(2).replace('.', ',')}
              </Text>
            </View>
            <View style={styles.targetCardPill}>
              <MaterialIcons name="directions-bus" size={14} color="#ffffff" />
              <Text style={styles.targetCardText} numberOfLines={1}>
                {cardTitle}
              </Text>
            </View>
          </LinearGradient>

          {/* QR Code Real do Mercado Pago */}
          <View style={styles.qrCard}>
            <View style={styles.qrWrapper}>
              {orderData.qrCodeBase64 ? (
                <Image
                  source={{ uri: orderData.qrCodeBase64 }}
                  style={styles.qrImage}
                  resizeMode="contain"
                  accessibilityLabel="QR Code Pix Mercado Pago"
                />
              ) : (
                <ActivityIndicator size="large" color="#009EE3" />
              )}
            </View>

            <View style={styles.timerRow}>
              <MaterialIcons name="timer" size={16} color={secondsLeft < 120 ? '#EF4444' : '#009EE3'} />
              <Text style={styles.timerText}>
                Expira em: <Text style={styles.timerBold}>{timeFormatted}</Text>
              </Text>
            </View>
          </View>

          {/* Copia e Cola Code */}
          <View style={styles.copyBox}>
            <Text style={styles.copyLabel}>PIX COPIA E COLA</Text>
            <View style={styles.copyInputRow}>
              <Text style={styles.copySnippet} numberOfLines={1} ellipsizeMode="middle">
                {orderData.pixCopiaECola}
              </Text>
              <TouchableOpacity
                style={[styles.copyBtn, copied && styles.copyBtnDone]}
                onPress={handleCopyCode}
              >
                <MaterialIcons
                  name={copied ? 'check' : 'content-copy'}
                  size={16}
                  color="#ffffff"
                />
                <Text style={styles.copyBtnText}>{copied ? 'Copiado' : 'Copiar'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Status Instruction */}
          <View style={styles.infoBox}>
            <MaterialIcons name="sync" size={18} color="#009EE3" />
            <Text style={styles.infoText}>
              Assim que o pagamento for concluído no seu banco, o saldo cairá automaticamente no seu passe.
            </Text>
          </View>

          {/* Sandbox Test Button & Close */}
          <View style={styles.actionsRow}>
            <InteractiveButton
              style={styles.simulateBtn}
              onPress={handleSimulatePayment}
              disabled={isSimulating}
            >
              <View style={styles.simulateBtnContent}>
                {isSimulating ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <MaterialIcons name="verified" size={18} color="#ffffff" />
                    <Text style={styles.simulateBtnText}>Simular Aprovação Pix</Text>
                  </>
                )}
              </View>
            </InteractiveButton>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (themeColors: typeof Colors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(11, 19, 43, 0.85)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    container: {
      width: '100%',
      maxWidth: 420,
      backgroundColor: themeColors.surfaceContainerLowest,
      borderRadius: 28,
      padding: 22,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.35,
      shadowRadius: 24,
      elevation: 12,
      borderWidth: 1,
      borderColor: themeColors.surfaceContainerHigh,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    mpBadge: {
      width: 42,
      height: 42,
      borderRadius: 14,
      backgroundColor: 'rgba(0, 158, 227, 0.12)',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'rgba(0, 158, 227, 0.3)',
    },
    title: {
      fontSize: 17,
      fontWeight: '800',
      color: themeColors.onSurface,
      letterSpacing: -0.3,
    },
    subtitle: {
      fontSize: 11,
      color: themeColors.onSurfaceVariant,
      marginTop: 2,
    },
    closeBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: themeColors.surfaceContainerLow,
      alignItems: 'center',
      justifyContent: 'center',
    },
    amountBanner: {
      borderRadius: 18,
      padding: 16,
      marginBottom: 16,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      shadowColor: '#009EE3',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
    },
    amountLabel: {
      fontSize: 10,
      fontWeight: '800',
      color: 'rgba(255, 255, 255, 0.85)',
      letterSpacing: 1,
    },
    amountValue: {
      fontSize: 24,
      fontWeight: '900',
      color: '#ffffff',
      marginTop: 2,
    },
    targetCardPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 12,
      maxWidth: 160,
    },
    targetCardText: {
      color: '#ffffff',
      fontSize: 11,
      fontWeight: '700',
    },
    qrCard: {
      alignItems: 'center',
      backgroundColor: themeColors.surfaceContainerLow,
      borderRadius: 22,
      padding: 16,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: themeColors.surfaceContainerHigh,
    },
    qrWrapper: {
      width: 200,
      height: 200,
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      padding: 8,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    },
    qrImage: {
      width: '100%',
      height: '100%',
    },
    timerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 12,
    },
    timerText: {
      fontSize: 12,
      color: themeColors.onSurfaceVariant,
      fontWeight: '600',
    },
    timerBold: {
      fontWeight: '800',
      color: '#009EE3',
    },
    copyBox: {
      backgroundColor: themeColors.surfaceContainerLow,
      borderRadius: 14,
      padding: 12,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: themeColors.surfaceContainerHigh,
    },
    copyLabel: {
      fontSize: 9,
      fontWeight: '800',
      color: themeColors.onSurfaceVariant,
      letterSpacing: 0.8,
      marginBottom: 6,
    },
    copyInputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    copySnippet: {
      flex: 1,
      fontSize: 11,
      fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
      color: themeColors.onSurface,
    },
    copyBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: '#009EE3',
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 10,
    },
    copyBtnDone: {
      backgroundColor: '#10B981',
    },
    copyBtnText: {
      color: '#ffffff',
      fontSize: 11,
      fontWeight: '700',
    },
    infoBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: 'rgba(0, 158, 227, 0.08)',
      padding: 12,
      borderRadius: 14,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: 'rgba(0, 158, 227, 0.2)',
    },
    infoText: {
      fontSize: 11,
      color: themeColors.onSurfaceVariant,
      flex: 1,
      lineHeight: 16,
    },
    actionsRow: {
      gap: 10,
    },
    simulateBtn: {
      backgroundColor: '#00D68F',
      height: 48,
      borderRadius: 14,
      justifyContent: 'center',
      shadowColor: '#00D68F',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 6,
      elevation: 3,
    },
    simulateBtnContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      height: '100%',
    },
    simulateBtnText: {
      color: '#06281E',
      fontSize: 14,
      fontWeight: '800',
    },
  });

