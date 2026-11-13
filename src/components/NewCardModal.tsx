import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  useWindowDimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, DarkColors } from '../theme/colors';
import { useApp } from '../context/AppContext';
import { CardType } from '../types';
import { PASS_TYPE_OPTIONS, PASS_TYPES } from '../utils/passTypes';
import {
  formatCardNumberInput,
  formatAlphanumericTitle,
  blockNonDigitKeyPress,
} from '../utils/inputMasks';

export const NewCardModal: React.FC = () => {
  const { isNewCardModalOpen, setNewCardModalOpen, addNewCard, user, isDarkMode, showNotification } = useApp();
  const { width } = useWindowDimensions();
  const isWideScreen = width >= 768;
  const themeColors = isDarkMode ? DarkColors : Colors;
  const styles = createStyles(themeColors, isWideScreen);

  const [cardType, setCardType] = useState<CardType | null>(null);
  const [cardNumber, setCardNumber] = useState('');
  const [nickname, setNickname] = useState('');

  if (!isNewCardModalOpen) return null;

  const handleClose = () => {
    setNewCardModalOpen(false);
    setCardType(null);
    setCardNumber('');
    setNickname('');
  };

  const handleSubmit = () => {
    if (!cardType) {
      showNotification('Escolha o tipo de passe', 'Selecione o tipo de bilhete que deseja vincular.', 'error');
      return;
    }
    if (!cardNumber.trim() || cardNumber.length < 4) {
      showNotification('Atenção', 'Digite os 4 últimos dígitos do cartão ou número completo.', 'error');
      return;
    }

    const option = PASS_TYPE_OPTIONS[cardType];

    addNewCard({
      title: nickname.trim() || option.title,
      type: cardType,
      tag: option.tag,
      number: cardNumber.slice(-4),
      holder: user.name.toUpperCase(),
      colors: option.colors,
    });

    setCardNumber('');
    setNickname('');
    setCardType(null);
    setNewCardModalOpen(false);
    showNotification('Sucesso!', 'Novo passe digital vinculado com sucesso!', 'success');
  };

  return (
    <Modal
      visible={isNewCardModalOpen}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Vincular Novo Passe</Text>
              <Text style={styles.subtitle}>Adicione um cartão físico ou digital à sua carteira</Text>
            </View>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={handleClose}
            >
              <MaterialIcons name="close" size={22} color={themeColors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          {/* Type Selector */}
          <Text style={styles.fieldLabel}>Tipo de Bilhete</Text>
          <View style={styles.typeRow}>
            {PASS_TYPES.map((type) => {
              const option = PASS_TYPE_OPTIONS[type];
              const isSelected = cardType === type;
              return (
                <TouchableOpacity
                  key={type}
                  style={[styles.typeBtn, isSelected && styles.activeTypeBtn]}
                  onPress={() => setCardType(type)}
                >
                  <MaterialIcons
                    name={option.icon}
                    size={18}
                    color={isSelected ? themeColors.primary : themeColors.outline}
                  />
                  <Text style={[styles.typeBtnText, isSelected && styles.activeTypeBtnText]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Card Number Input */}
          <Text style={styles.fieldLabel}>Número do Cartão ou Serial</Text>
          <View style={styles.inputContainer}>
            <MaterialIcons name="credit-card" size={20} color={themeColors.outline} />
            <TextInput
              style={[styles.input, { outlineStyle: 'none' } as any]}
              placeholder="Número do passe ou os 4 últimos dígitos"
              placeholderTextColor={themeColors.outline}
              keyboardType="numeric"
              value={cardNumber}
              onChangeText={(value) => setCardNumber(formatCardNumberInput(value))}
              onKeyPress={(e) => blockNonDigitKeyPress(e, handleSubmit)}
              onSubmitEditing={handleSubmit}
              maxLength={19}
            />
          </View>

          {/* Nickname Input */}
          <Text style={styles.fieldLabel}>Apelido do Cartão (Opcional)</Text>
          <View style={styles.inputContainer}>
            <MaterialIcons name="edit" size={20} color={themeColors.outline} />
            <TextInput
              style={[styles.input, { outlineStyle: 'none' } as any]}
              placeholder="Digite um apelido (opcional)"
              placeholderTextColor={themeColors.outline}
              value={nickname}
              onChangeText={(value) => setNickname(formatAlphanumericTitle(value))}
              onSubmitEditing={handleSubmit}
            />
          </View>

          {/* Submit CTA */}
          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
            <MaterialIcons name="add-link" size={22} color="#ffffff" />
            <Text style={styles.submitBtnText}>Vincular à Carteira</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (themeColors: typeof Colors, isWideScreen: boolean) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(19, 27, 46, 0.6)',
    justifyContent: isWideScreen ? 'center' : 'flex-end',
    alignItems: 'center',
    paddingHorizontal: isWideScreen ? 24 : 0,
    paddingVertical: isWideScreen ? 24 : 0,
  },
  sheet: {
    width: '100%',
    maxWidth: isWideScreen ? 560 : undefined,
    backgroundColor: themeColors.surfaceContainerLowest,
    borderRadius: isWideScreen ? 28 : 0,
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
    marginBottom: 20,
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
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: themeColors.onSurface,
    marginBottom: 8,
    marginTop: 12,
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 8,
  },
  typeBtn: {
    flexBasis: '48%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: themeColors.surfaceContainerLow,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  activeTypeBtn: {
    backgroundColor: themeColors.surfaceContainerHigh,
    borderColor: themeColors.primaryContainer,
  },
  typeBtnText: {
    flexShrink: 1,
    fontSize: 11,
    fontWeight: '600',
    color: themeColors.outline,
  },
  activeTypeBtnText: {
    color: themeColors.primary,
    fontWeight: '700',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeColors.surfaceContainerLow,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: themeColors.onSurface,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: themeColors.primaryContainer,
    height: 52,
    borderRadius: 14,
    marginTop: 24,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
