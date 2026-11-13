import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, DarkColors } from '../theme/colors';
import { useApp } from '../context/AppContext';
import { InteractiveButton } from './InteractiveButton';
import { formatPersonName } from '../utils/formatPersonName';
import {
  formatEmailInput,
  blockNonLetterKeyPress,
  blockInvalidEmailKeyPress,
} from '../utils/inputMasks';

export const SocialAuthModal: React.FC = () => {
  const {
    socialAuthModal,
    closeSocialAuthModal,
    authenticateSocialAccount,
    setTermsModalOpen,
    setPrivacyModalOpen,
    user,
    isDarkMode,
    showNotification,
  } = useApp();

  const themeColors = isDarkMode ? DarkColors : Colors;
  const styles = createStyles(themeColors);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  useEffect(() => {
    if (socialAuthModal) {
      setName(user.name || '');
      if (socialAuthModal.provider === 'google' && user.googleAccount) {
        setEmail(user.googleAccount);
      } else if (socialAuthModal.provider === 'apple' && user.appleAccount) {
        setEmail(user.appleAccount);
      } else {
        setEmail(user.email || '');
      }
      setTermsAccepted(socialAuthModal.mode !== 'register');
    }
  }, [socialAuthModal, user]);

  if (!socialAuthModal) return null;

  const isGoogle = socialAuthModal.provider === 'google';
  const providerName = isGoogle ? 'Google' : 'Apple';
  const mode = socialAuthModal.mode;

  const sanitizeEmail = formatEmailInput;

  const handleConfirm = () => {
    const cleanName = name.trim();
    const cleanEmail = sanitizeEmail(email);

    if (mode !== 'link' && !cleanName) {
      showNotification('Nome obrigatório', `Informe seu nome para continuar com ${providerName}.`, 'error');
      return;
    }

    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      showNotification(
        'E-mail inválido',
        `Informe um endereço de e-mail válido da sua conta ${providerName}.`,
        'error'
      );
      return;
    }

    if (mode === 'register' && !termsAccepted) {
      showNotification(
        'Termos e Privacidade',
        'É obrigatório aceitar os Termos de Uso e a Política de Privacidade para criar sua conta.',
        'error'
      );
      return;
    }

    authenticateSocialAccount(
      socialAuthModal.provider,
      cleanName || user.name || 'Passageiro SmartCard',
      cleanEmail,
      mode
    );
  };

  const handleEnterKey = (event: any) => {
    const key = event.nativeEvent?.key ?? event.key;
    if (key === 'Enter') {
      handleConfirm();
    }
  };

  return (
    <Modal
      visible={!!socialAuthModal}
      transparent
      animationType="fade"
      onRequestClose={closeSocialAuthModal}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.providerBadgeRow}>
              <View style={[styles.providerCircle, isGoogle ? styles.googleCircle : styles.appleCircle]}>
                {isGoogle ? (
                  <Text style={styles.googleLetter}>G</Text>
                ) : (
                  <MaterialIcons name="apple" size={24} color="#ffffff" />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>
                  {mode === 'link'
                    ? `Vincular Conta ${providerName}`
                    : mode === 'register'
                      ? `Criar Conta com ${providerName}`
                      : `Entrar com ${providerName}`}
                </Text>
                <Text style={styles.subtitle}>
                  Autenticação segura integrada ao SmartCard BUS
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={closeSocialAuthModal}>
              <MaterialIcons name="close" size={22} color={themeColors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          {/* Form Fields */}
          {mode !== 'link' && (
            <>
              <Text style={styles.label}>Nome da Conta *</Text>
              <View style={styles.inputBox}>
                <MaterialIcons name="person-outline" size={20} color={themeColors.outline} />
                <TextInput
                  style={[styles.input, { outlineStyle: 'none' } as any]}
                  value={name}
                  onChangeText={(val) => setName(formatPersonName(val))}
                  onSubmitEditing={handleConfirm}
                  onKeyPress={(e) => blockNonLetterKeyPress(e, handleConfirm)}
                  returnKeyType="next"
                  placeholder="Seu nome completo"
                  placeholderTextColor={themeColors.outline}
                />
              </View>
            </>
          )}

          <Text style={styles.label}>
            {isGoogle ? 'E-mail Google (Gmail / Workspace) *' : 'ID Apple (iCloud / E-mail) *'}
          </Text>
          <View style={styles.inputBox}>
            <MaterialIcons name="mail-outline" size={20} color={themeColors.outline} />
            <TextInput
              style={[styles.input, { outlineStyle: 'none' } as any]}
              value={email}
              onChangeText={(val) => setEmail(formatEmailInput(val))}
              onSubmitEditing={handleConfirm}
              onKeyPress={(e) => blockInvalidEmailKeyPress(e, email, handleConfirm)}
              returnKeyType="done"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              placeholder={isGoogle ? 'seuemail@gmail.com' : 'seuemail@icloud.com'}
              placeholderTextColor={themeColors.outline}
            />
          </View>

          {mode === 'register' && (
            <TouchableOpacity
              style={styles.termsRow}
              activeOpacity={0.8}
              onPress={() => setTermsAccepted(!termsAccepted)}
            >
              <MaterialIcons
                name={termsAccepted ? 'check-box' : 'check-box-outline-blank'}
                size={22}
                color={termsAccepted ? themeColors.primary : themeColors.outline}
              />
              <Text style={styles.termsText}>
                Li e aceito os{' '}
                <Text style={styles.termsLink} onPress={() => setTermsModalOpen(true)}>
                  Termos de Uso
                </Text>{' '}
                e a{' '}
                <Text style={styles.termsLink} onPress={() => setPrivacyModalOpen(true)}>
                  Política de Privacidade
                </Text>
                . *
              </Text>
            </TouchableOpacity>
          )}

          <InteractiveButton style={styles.submitBtn} onPress={handleConfirm}>
            <View style={styles.submitBtnContent}>
              <MaterialIcons name="verified-user" size={18} color="#ffffff" />
              <Text style={styles.submitBtnText}>
                {mode === 'link'
                  ? `Conectar Conta ${providerName}`
                  : `Continuar com ${providerName}`}
              </Text>
            </View>
          </InteractiveButton>
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (themeColors: typeof Colors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(19, 27, 46, 0.72)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    container: {
      width: '100%',
      maxWidth: 420,
      backgroundColor: themeColors.surfaceContainerLowest,
      borderRadius: 24,
      padding: 22,
      borderWidth: 1,
      borderColor: themeColors.surfaceContainerHigh,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 18,
    },
    providerBadgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    providerCircle: {
      width: 44,
      height: 44,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    googleCircle: {
      backgroundColor: '#eff6ff',
      borderWidth: 1,
      borderColor: '#bfdbfe',
    },
    appleCircle: {
      backgroundColor: '#111827',
    },
    googleLetter: {
      fontSize: 22,
      fontWeight: '900',
      color: '#2563EB',
    },
    title: {
      fontSize: 17,
      fontWeight: '800',
      color: themeColors.onSurface,
    },
    subtitle: {
      fontSize: 12,
      color: themeColors.onSurfaceVariant,
      marginTop: 2,
    },
    closeBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: themeColors.surfaceContainerLow,
      alignItems: 'center',
      justifyContent: 'center',
    },
    label: {
      fontSize: 12,
      fontWeight: '700',
      color: themeColors.onSurface,
      marginBottom: 6,
      marginTop: 8,
    },
    inputBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: themeColors.surfaceContainerLow,
      borderRadius: 12,
      paddingHorizontal: 12,
      height: 48,
      borderWidth: 1,
      borderColor: themeColors.surfaceContainerHigh,
    },
    input: {
      flex: 1,
      fontSize: 14,
      color: themeColors.onSurface,
      height: '100%',
    },
    termsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: 14,
      paddingVertical: 4,
    },
    termsText: {
      flex: 1,
      fontSize: 12,
      color: themeColors.onSurfaceVariant,
      lineHeight: 18,
    },
    termsLink: {
      color: themeColors.primary,
      fontWeight: '700',
      textDecorationLine: 'underline',
    },
    submitBtn: {
      backgroundColor: themeColors.primaryContainer,
      height: 50,
      borderRadius: 14,
      marginTop: 18,
      justifyContent: 'center',
    },
    submitBtnContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      width: '100%',
      height: '100%',
    },
    submitBtnText: {
      color: '#ffffff',
      fontSize: 15,
      fontWeight: '700',
    },
  });

