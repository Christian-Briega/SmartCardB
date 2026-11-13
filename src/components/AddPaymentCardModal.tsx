import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, DarkColors } from '../theme/colors';
import { useApp } from '../context/AppContext';
import { formatPersonName } from '../utils/formatPersonName';
import {
  formatAlphanumericTitle,
  formatCardNumberInput,
  formatCardExpiryInput,
  formatDigitsOnly,
  blockNonLetterKeyPress,
  blockNonDigitKeyPress,
} from '../utils/inputMasks';

export const AddPaymentCardModal: React.FC = () => {
  const { isAddCardModalOpen, setAddCardModalOpen, addPaymentCard, isDarkMode, showNotification } = useApp();
  const themeColors = isDarkMode ? DarkColors : Colors;
  const styles = createStyles(themeColors);

  const [cardNumber, setCardNumber] = useState('');
  const [holderName, setHolderName] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [bankName, setBankName] = useState('');

  if (!isAddCardModalOpen) return null;

  const handleClose = () => {
    setAddCardModalOpen(false);
    setCardNumber('');
    setHolderName('');
    setBankName('');
    setExpiry('');
    setCvv('');
  };

  const handleSaveCard = () => {
    if (!cardNumber.trim() || cardNumber.length < 4) {
      showNotification('Dados Incompletos', 'Informe o número do cartão.', 'error');
      return;
    }
    if (!bankName.trim() || !holderName.trim()) {
      showNotification('Dados Incompletos', 'Informe o apelido do cartão e o nome do titular.', 'error');
      return;
    }

    addPaymentCard({
      id: `card-${Date.now()}`,
      name: bankName.trim(),
      number: `•••• ${cardNumber.slice(-4)}`,
      holder: holderName.trim().toUpperCase(),
      brand: 'Cartão',
    });

    setAddCardModalOpen(false);
    setCardNumber('');
    setHolderName('');
    setBankName('');
    setExpiry('');
    setCvv('');
    showNotification('Cartão Adicionado! 💳', 'Cartão cadastrado com sucesso e disponível para pagamentos.', 'success');
  };

  return (
    <Modal
      visible={isAddCardModalOpen}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Adicionar Novo Cartão</Text>
              <Text style={styles.subtitle}>Crédito ou Débito para recargas instantâneas</Text>
            </View>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={handleClose}
            >
              <MaterialIcons name="close" size={22} color={themeColors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Apelido do Cartão / Banco *</Text>
          <View style={styles.inputBox}>
            <MaterialIcons name="credit-card" size={20} color={themeColors.outline} />
            <TextInput
              style={[styles.input, { outlineStyle: 'none' } as any]}
              value={bankName}
              onChangeText={(value) => setBankName(formatAlphanumericTitle(value))}
              onSubmitEditing={handleSaveCard}
              placeholder="Digite o banco ou apelido do cartão"
              placeholderTextColor={themeColors.outline}
            />
          </View>

          <Text style={styles.label}>Nome do Titular *</Text>
          <View style={styles.inputBox}>
            <MaterialIcons name="person-outline" size={20} color={themeColors.outline} />
            <TextInput
              style={[styles.input, { outlineStyle: 'none' } as any]}
              value={holderName}
              onChangeText={(value) => setHolderName(formatPersonName(value))}
              onKeyPress={(e) => blockNonLetterKeyPress(e, handleSaveCard)}
              onSubmitEditing={handleSaveCard}
              placeholder="Nome impresso no cartão"
              placeholderTextColor={themeColors.outline}
              autoCapitalize="words"
            />
          </View>

          <Text style={styles.label}>Número do Cartão</Text>
          <View style={styles.inputBox}>
            <MaterialIcons name="payment" size={20} color={themeColors.outline} />
            <TextInput
              style={[styles.input, { outlineStyle: 'none' } as any]}
              value={cardNumber}
              onChangeText={(value) => setCardNumber(formatCardNumberInput(value))}
              onKeyPress={(e) => blockNonDigitKeyPress(e, handleSaveCard)}
              onSubmitEditing={handleSaveCard}
              placeholder="0000 0000 0000 0000"
              placeholderTextColor={themeColors.outline}
              keyboardType="numeric"
              maxLength={19}
            />
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Validade</Text>
              <View style={styles.inputBox}>
                <TextInput
                  style={[styles.input, { outlineStyle: 'none' } as any]}
                  value={expiry}
                  onChangeText={(value) => setExpiry(formatCardExpiryInput(value))}
                  onKeyPress={(e) => blockNonDigitKeyPress(e, handleSaveCard)}
                  onSubmitEditing={handleSaveCard}
                  placeholder="MM/AA"
                  placeholderTextColor={themeColors.outline}
                  keyboardType="numeric"
                  maxLength={5}
                />
              </View>
            </View>

            <View style={{ width: 12 }} />

            <View style={{ flex: 1 }}>
              <Text style={styles.label}>CVV</Text>
              <View style={styles.inputBox}>
                <TextInput
                  style={[styles.input, { outlineStyle: 'none' } as any]}
                  value={cvv}
                  onChangeText={(value) => setCvv(formatDigitsOnly(value, 4))}
                  onKeyPress={(e) => blockNonDigitKeyPress(e, handleSaveCard)}
                  onSubmitEditing={handleSaveCard}
                  placeholder="123"
                  placeholderTextColor={themeColors.outline}
                  keyboardType="numeric"
                  maxLength={4}
                  secureTextEntry
                />
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.submitBtn} onPress={handleSaveCard}>
            <MaterialIcons name="add" size={20} color="#ffffff" />
            <Text style={styles.submitBtnText}>Salvar Cartão de Pagamento</Text>
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
    padding: 20,
    paddingBottom: 32,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: themeColors.outlineVariant,
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: themeColors.onSurface,
  },
  subtitle: {
    fontSize: 12,
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
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: themeColors.onSurface,
    marginBottom: 6,
    marginTop: 8,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeColors.surfaceContainerLow,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 13,
    color: themeColors.onSurface,
  },
  row: {
    flexDirection: 'row',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: themeColors.primaryContainer,
    height: 52,
    borderRadius: 14,
    marginTop: 20,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
