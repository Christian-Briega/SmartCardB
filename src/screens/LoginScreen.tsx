import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import { Colors, DarkColors, Spacing } from '../theme/colors';
import { useApp } from '../context/AppContext';
import { isValidCpf } from '../utils/isValidCpf';
import { getSecureItem, setSecureItem, SECURE_KEYS } from '../services/secureStorage';
import { InteractiveButton } from '../components/InteractiveButton';
import { SmartCardLogo } from '../components/SmartCardLogo';
import { loginRateLimiter, sanitizeInput } from '../utils/formSecurity';
import { createSecureSession } from '../services/sessionSecurity';
import { mysqlApiService } from '../services/mysqlApiService';
import {
  formatCpfInput,
  formatEmailInput,
  blockNonDigitKeyPress,
  blockInvalidEmailKeyPress,
} from '../utils/inputMasks';

export const LoginScreen: React.FC = () => {
  const {
    login,
    loginAsync,
    enterDemoMode,
    setCurrentScreen,
    isDarkMode,
    showNotification,
    openSocialAuthModal,
  } = useApp();
  const themeColors = isDarkMode ? DarkColors : Colors;
  const styles = createStyles(themeColors);

  const [tab, setTab] = useState<'cpf' | 'email' | null>('cpf');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [missingAtWarning, setMissingAtWarning] = useState(false);
  const cpfDigits = identifier.replace(/\D/g, '');
  const cpfIsInvalid = tab === 'cpf' && cpfDigits.length === 11 && !isValidCpf(identifier);

  const handleInputChange = (text: string) => {
    if (tab === 'cpf') {
      setIdentifier(formatCpfInput(text));
    } else if (tab === 'email') {
      const email = formatEmailInput(text);
      setIdentifier(email);
      if (email.includes('@')) setMissingAtWarning(false);
    }
  };

  const handleInputKeyPress = (event: any) => {
    if (tab === 'cpf') {
      blockNonDigitKeyPress(event, handleLogin);
    } else if (tab === 'email') {
      blockInvalidEmailKeyPress(event, identifier, handleLogin);
    }
  };

  const handlePasswordKeyPress = (event: any) => {
    const key = event.nativeEvent?.key ?? event.key;
    if (key === 'Enter') {
      handleLogin();
    }
  };

  const handleLogin = async () => {
    // 1. Verificação de Bloqueio por Força Bruta
    const lockStatus = loginRateLimiter.isLocked();
    if (lockStatus.locked) {
      showNotification(
        'Acesso Temporariamente Suspenso',
        `Muitas tentativas incorretas. Aguarde ${lockStatus.remainingSeconds}s antes de tentar novamente.`,
        'error'
      );
      return;
    }

    if (!tab) {
      showNotification('Escolha uma opção', 'Selecione se deseja entrar com CPF ou E-mail.', 'error');
      return;
    }

    const sanitized = sanitizeInput(identifier);
    const loginIdentifier =
      tab === 'email' ? formatEmailInput(sanitized) : formatCpfInput(sanitized);
    if (loginIdentifier !== identifier) setIdentifier(loginIdentifier);

    if (!loginIdentifier.trim()) {
      showNotification('Atenção', 'Informe seu CPF ou E-mail para entrar.', 'error');
      return;
    }
    if (tab === 'email' && !loginIdentifier.includes('@')) {
      setMissingAtWarning(true);
      return;
    }
    setMissingAtWarning(false);
    if (!password) {
      showNotification('Atenção', 'Informe sua senha para entrar.', 'error');
      return;
    }

    const success = await loginAsync(loginIdentifier, password);
    if (!success) {
      const attemptResult = loginRateLimiter.registerFailedAttempt();
      if (attemptResult.locked) {
        showNotification(
          'Muitas tentativas incorretas',
          '5 tentativas incorretas consecutivas. Acesso suspenso por 30 segundos.',
          'error'
        );
      } else {
        showNotification(
          'Não foi possível entrar',
          `Confira os dados informados. Tentativas restantes: ${attemptResult.attemptsLeft}.`,
          'error'
        );
      }
    } else {
      loginRateLimiter.resetAttempts();
      try {
        await setSecureItem('user_token', 'jwt_super_secreto_smartcard_session');
        await setSecureItem(SECURE_KEYS.SAVED_CPF, loginIdentifier);
        await createSecureSession(loginIdentifier, 'jwt_smartcard_token');
      } catch (err) {
        console.warn('[SecureStore] Failed to save session:', err);
      }
    }
  };

  const handleBiometrics = async () => {
    try {
      const savedBioKey = await getSecureItem(SECURE_KEYS.BIOMETRIC_PUB_KEY);
      const savedCpf = await getSecureItem(SECURE_KEYS.SAVED_CPF);
      if (savedCpf && !identifier) {
        setIdentifier(savedCpf);
      }

      showNotification(
        'Autenticação Biométrica',
        savedBioKey
          ? 'Identidade biométrica confirmada no dispositivo.'
          : 'Reconhecimento biométrico validado. Informe sua senha caso seja o primeiro acesso.',
        'success',
        () => {
          if (identifier && password) {
            loginAsync(identifier, password);
          } else {
            login(loginIdentifierOrCpf(), password);
          }
        }
      );
    } catch {
      showNotification(
        'Autenticação Biométrica',
        'Reconhecimento biométrico concluído.',
        'success',
        () => login(identifier || '', password)
      );
    }
  };

  const loginIdentifierOrCpf = () => {
    if (identifier) return identifier;
    return '123.456.789-00';
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.contentFrame}>
      {/* Top Navigation Row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 }}>
        <TouchableOpacity
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingVertical: 6,
            paddingHorizontal: 10,
            borderRadius: 10,
            backgroundColor: themeColors.surfaceContainerLow,
          }}
          onPress={() => setCurrentScreen('welcome')}
        >
          <MaterialIcons name="arrow-back" size={18} color={themeColors.onSurface} />
          <Text style={{ fontSize: 12, fontWeight: '600', color: themeColors.onSurface }}>Início</Text>
        </TouchableOpacity>
        <View style={{ width: 64 }} />
      </View>

      {/* Brand Header */}
      <View style={styles.brandHeroContainer}>
        <SmartCardLogo size="large" isDarkMode={isDarkMode} />
      </View>

      {/* Friendly Header */}
      <View style={styles.header}>
        <View style={styles.verifiedTag}>
          <MaterialIcons name="verified" size={14} color={themeColors.secondary} />
          <Text style={styles.verifiedTagText}>Bilhetagem Digital Integrada</Text>
        </View>
        <Text style={styles.title}>Acesse sua Carteira de Passes</Text>
        <Text style={styles.subtitle}>
          Gerencie seus passes de transporte, faça recargas via Mercado Pago e embarque com QR Code.
        </Text>
      </View>

      {/* Main Form Card */}
      <View style={styles.card}>
        {/* Toggle CPF vs Email */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'cpf' && styles.tabBtnActive]}
            onPress={() => {
              setTab('cpf');
              setIdentifier('');
              setMissingAtWarning(false);
            }}
          >
            <MaterialIcons
              name="badge"
              size={16}
              color={tab === 'cpf' ? themeColors.primary : themeColors.onSurfaceVariant}
            />
            <Text style={[styles.tabBtnText, tab === 'cpf' && styles.tabBtnTextActive]}>
              CPF
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, tab === 'email' && styles.tabBtnActive]}
            onPress={() => {
              setTab('email');
              setIdentifier('');
              setMissingAtWarning(false);
            }}
          >
            <MaterialIcons
              name="alternate-email"
              size={16}
              color={tab === 'email' ? themeColors.primary : themeColors.onSurfaceVariant}
            />
            <Text style={[styles.tabBtnText, tab === 'email' && styles.tabBtnTextActive]}>
              E-mail
            </Text>
          </TouchableOpacity>
        </View>

        {/* Input Identifier */}
        <Text style={styles.inputLabel}>
          {tab === 'cpf' ? 'CPF' : tab === 'email' ? 'E-mail' : 'Selecione como entrar'}
        </Text>
        <View style={[styles.inputBox, cpfIsInvalid && styles.inputBoxError]}>
          <MaterialIcons
            name={tab === 'cpf' ? 'badge' : tab === 'email' ? 'email' : 'person-outline'}
            size={20}
            color={themeColors.outline}
          />
          <TextInput
            style={[styles.textInput, { outlineStyle: 'none' } as any]}
            value={identifier}
            onChangeText={handleInputChange}
            onKeyPress={handleInputKeyPress}
            onSubmitEditing={handleLogin}
            returnKeyType="done"
            placeholder={
              tab === 'cpf'
                ? 'Digite seu CPF'
                : tab === 'email'
                  ? 'Digite seu e-mail'
                  : 'Escolha CPF ou E-mail'
            }
            placeholderTextColor={themeColors.outline}
            keyboardType={tab === 'cpf' ? 'numeric' : tab === 'email' ? 'email-address' : 'default'}
            maxLength={tab === 'cpf' ? 14 : undefined}
            editable={tab !== null}
          />
        </View>
        {cpfIsInvalid && (
          <Text style={styles.cpfError} accessibilityRole="alert">
            CPF inválido. Confira os 11 dígitos informados.
          </Text>
        )}
        {tab === 'email' && missingAtWarning && (
          <View style={styles.emailWarning} accessibilityRole="alert">
            <MaterialIcons name="error-outline" size={18} color={themeColors.tertiary} />
            <Text style={styles.emailWarningText}>
              Inclua @ no endereço para continuar com o e-mail.
            </Text>
          </View>
        )}

        {/* Input Password & Forgot Password Link */}
        <View style={styles.passwordLabelRow}>
          <Text style={styles.inputLabel}>Senha</Text>
          <TouchableOpacity onPress={() => setCurrentScreen('forgotPassword')}>
            <Text style={styles.forgotPassword}>Esqueci minha senha (?)</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.inputBox}>
          <MaterialIcons name="lock" size={20} color={themeColors.outline} />
          <TextInput
            style={[styles.textInput, { outlineStyle: 'none' } as any]}
            value={password}
            onChangeText={setPassword}
            onKeyPress={handlePasswordKeyPress}
            onSubmitEditing={handleLogin}
            returnKeyType="done"
            placeholder="Digite sua senha"
            placeholderTextColor={themeColors.outline}
            secureTextEntry={!showPassword}
            underlineColorAndroid="transparent"
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <MaterialIcons
              name={showPassword ? 'visibility-off' : 'visibility'}
              size={20}
              color={themeColors.outline}
            />
          </TouchableOpacity>
        </View>

        {/* Submit Button */}
        <InteractiveButton style={styles.submitBtn} onPress={handleLogin}>
          <View style={styles.submitBtnContent}>
            <MaterialIcons name="login" size={20} color="#ffffff" />
            <Text style={styles.submitBtnText}>Entrar</Text>
          </View>
        </InteractiveButton>

        {/* Biometrics Access */}
        <TouchableOpacity
          style={styles.biometricsBtn}
          activeOpacity={0.8}
          onPress={handleBiometrics}
        >
          <MaterialIcons name="fingerprint" size={22} color={themeColors.secondary} />
          <Text style={styles.biometricsBtnText}>Acessar com Biometria ou Face ID</Text>
        </TouchableOpacity>

        {/* Passwordless OTP Access Link */}
        <TouchableOpacity
          style={styles.smsLinkBtn}
          onPress={() => setCurrentScreen('smsVerification')}
        >
          <MaterialIcons name="smartphone" size={18} color={themeColors.primary} />
          <Text style={styles.smsLinkText}>Entrar com Código SMS / WhatsApp</Text>
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OU CONTINUE COM</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Social Logins */}
        <View style={styles.socialRow}>
          <TouchableOpacity
            style={styles.socialBtn}
            onPress={() => openSocialAuthModal('google', 'login')}
          >
            <Text style={styles.socialIconG}>G</Text>
            <Text style={styles.socialBtnText}>Google</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.socialBtn}
            onPress={() => openSocialAuthModal('apple', 'login')}
          >
            <MaterialIcons name="apple" size={20} color={themeColors.onSurface} />
            <Text style={styles.socialBtnText}>Apple</Text>
          </TouchableOpacity>
        </View>

        {__DEV__ && (
          <View style={styles.demoAccessContainer}>
            <TouchableOpacity
              style={styles.demoAccessButton}
              activeOpacity={0.85}
              onPress={enterDemoMode}
            >
              <MaterialIcons name="science" size={18} color={themeColors.primary} />
              <Text style={styles.demoAccessText}>Acesso rápido (teste)</Text>
            </TouchableOpacity>
            <Text style={styles.demoAccessHint}>Disponível somente no ambiente de desenvolvimento.</Text>
          </View>
        )}
      </View>

      {/* Register Prompt */}
      <TouchableOpacity
        style={styles.registerPromptCard}
        activeOpacity={0.8}
        onPress={() => setCurrentScreen('register')}
      >
        <View style={styles.regIconBox}>
          <MaterialIcons name="person-add" size={20} color={themeColors.secondary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.regTitle}>Não tem conta no SmartCard BUS?</Text>
          <Text style={styles.regSub}>Cadastre-se grátis em menos de 2 minutos</Text>
        </View>
        <MaterialIcons name="arrow-forward" size={20} color={themeColors.primary} />
      </TouchableOpacity>

      <View style={{ height: 32 }} />
      </View>
    </ScrollView>
  );
};

const createStyles = (themeColors: typeof Colors) => StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    backgroundColor: themeColors.surface,
  },
  scrollContent: {
    paddingHorizontal: Spacing.margin,
    paddingTop: 12,
  },
  contentFrame: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  brandHeroContainer: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  topHeroBox: {
    paddingTop: 16,
    marginBottom: 12,
  },
  heroPassTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  heroPassBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroPassIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroPassTag: {
    fontSize: 9,
    color: themeColors.primaryFixedDim,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  heroPassTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  nfcPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  nfcPillText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#ffffff',
  },
  heroPassBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  heroPassSub: {
    fontSize: 10,
    color: themeColors.primaryFixedDim,
  },
  heroPassGate: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  scanBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: themeColors.surfaceContainerLowest,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  scanBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: themeColors.primary,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  verifiedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: themeColors.surfaceContainerHigh,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  verifiedTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: themeColors.onPrimaryFixedVariant,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: themeColors.onSurface,
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: themeColors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 12,
  },
  card: {
    backgroundColor: themeColors.surfaceContainerLowest,
    borderRadius: 20,
    padding: 18,
    shadowColor: themeColors.onSurface,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: themeColors.surfaceContainer,
    borderRadius: 12,
    padding: 4,
    marginBottom: 14,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
  },
  tabBtnActive: {
    backgroundColor: themeColors.surfaceContainerLowest,
    shadowColor: themeColors.onSurface,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: themeColors.onSurfaceVariant,
  },
  tabBtnTextActive: {
    color: themeColors.primary,
    fontWeight: '700',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: themeColors.onSurface,
    marginBottom: 6,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeColors.surfaceContainerLow,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    gap: 10,
    marginBottom: 12,
    // Garante que o container não tenha bordas pretas
    borderWidth: 0,
  },
  inputBoxError: {
    borderWidth: 1,
    borderColor: '#dc2626',
  },
  cpfError: {
    color: '#dc2626',
    fontSize: 11,
    marginTop: -7,
    marginBottom: 10,
  },
  emailWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: themeColors.tertiary,
    borderRadius: 8,
    backgroundColor: themeColors.tertiaryContainer,
  },
  emailWarningText: {
    flex: 1,
    color: themeColors.onTertiaryContainer,
    fontSize: 12,
    lineHeight: 17,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: themeColors.onSurface,
    // Garante que o input interno não tenha bordas pretas
    borderWidth: 0,
  },
  passwordLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  forgotPassword: {
    fontSize: 11,
    fontWeight: '700',
    color: themeColors.primary,
  },
  submitBtn: {
    backgroundColor: themeColors.primary,
    height: 50,
    borderRadius: 14,
    marginTop: 4,
    shadowColor: themeColors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    justifyContent: 'center',
  },
  submitBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: '100%',
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  biometricsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: themeColors.surfaceContainerHigh,
    height: 48,
    borderRadius: 14,
    marginTop: 10,
  },
  biometricsBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: themeColors.onSurface,
  },
  smsLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    marginTop: 4,
  },
  smsLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: themeColors.primary,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
    gap: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: themeColors.surfaceContainerHighest,
  },
  dividerText: {
    fontSize: 9,
    fontWeight: '700',
    color: themeColors.outline,
    letterSpacing: 0.5,
  },
  socialRow: {
    flexDirection: 'row',
    gap: 10,
  },
  demoAccessContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  demoAccessButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: themeColors.primary,
    backgroundColor: themeColors.surfaceContainerLow,
  },
  demoAccessText: {
    color: themeColors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  demoAccessHint: {
    color: themeColors.outline,
    fontSize: 10,
    textAlign: 'center',
    marginTop: 6,
  },
  socialBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: 12,
    backgroundColor: themeColors.surfaceContainerLow,
  },
  socialIconG: {
    fontSize: 16,
    fontWeight: '800',
    color: '#4285F4',
  },
  socialBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: themeColors.onSurface,
  },
  registerPromptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeColors.surfaceContainerHigh,
    borderRadius: 18,
    padding: 14,
    gap: 12,
  },
  regIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: themeColors.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  regTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: themeColors.onSurface,
  },
  regSub: {
    fontSize: 11,
    color: themeColors.onSurfaceVariant,
    marginTop: 1,
  },
});
