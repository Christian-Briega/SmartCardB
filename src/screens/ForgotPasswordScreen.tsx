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
import { Colors, DarkColors, Spacing } from '../theme/colors';
import { useApp } from '../context/AppContext';
import {
  formatEmailInput,
  formatDigitsOnly,
  blockInvalidEmailKeyPress,
  blockNonDigitKeyPress,
} from '../utils/inputMasks';

export const ForgotPasswordScreen: React.FC = () => {
  const { setCurrentScreen, goBackScreen, resetPasswordAsync, isDarkMode, showNotification } = useApp();
  const themeColors = isDarkMode ? DarkColors : Colors;
  const styles = createStyles(themeColors);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [identifier, setIdentifier] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resendTimer, setResendTimer] = useState(30);
  const [missingAtWarning, setMissingAtWarning] = useState(false);
  const hasPasswordLength = newPassword.length >= 8;
  const hasPasswordNumber = /\d/.test(newPassword);
  const hasPasswordUppercase = /[A-Z]/.test(newPassword);

  const sanitizeEmail = formatEmailInput;

  const handleEmailKeyPress = (event: any) => {
    blockInvalidEmailKeyPress(event, identifier, handleSendCode);
  };

  const handleEmailInputChange = (text: string) => {
    const email = formatEmailInput(text);
    setIdentifier(email);
    if (email.includes('@')) setMissingAtWarning(false);
  };

  const handleSendCode = () => {
    const email = sanitizeEmail(identifier);
    if (email !== identifier) setIdentifier(email);

    if (!email.trim()) {
      showNotification('Atenção', 'Informe seu E-mail cadastrado.', 'error');
      return;
    }
    if (!email.includes('@')) {
      setMissingAtWarning(true);
      return;
    }
    setMissingAtWarning(false);
    setStep(2);
    setResendTimer(30);
  };

  const handleVerifyCode = () => {
    if (code.length < 4) {
      showNotification('Código Incompleto', 'Digite o código de 4 a 6 dígitos.', 'error');
      return;
    }
    setStep(3);
  };

  const handleFinishReset = async () => {
    if (!hasPasswordLength || !hasPasswordNumber || !hasPasswordUppercase) {
      showNotification(
        'Requisitos de Senha',
        'Sua senha precisa ter pelo menos 8 dígitos, 1 número e 1 letra maiúscula.',
        'error'
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      showNotification('Senhas não coincidem', 'Verifique se digitou a mesma senha nos dois campos.', 'error');
      return;
    }

    const ok = await resetPasswordAsync(sanitizeEmail(identifier), newPassword);
    if (!ok) {
      showNotification('Conta não encontrada', 'Confira se informou o e-mail usado no cadastro.', 'error');
      return;
    }
    showNotification(
      'Senha Atualizada',
      'Sua nova senha de acesso foi salva com sucesso. Você já pode acessar a carteira.',
      'success',
      () => setCurrentScreen('login')
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.contentFrame}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            if (step > 1) {
              setStep((prev) => (prev - 1) as 1 | 2 | 3);
            } else {
              goBackScreen('login');
            }
          }}
        >
          <MaterialIcons name="arrow-back" size={22} color={themeColors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Recuperação de Acesso</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Progress Indicator */}
      <View style={styles.stepProgressRow}>
        <View style={[styles.stepDot, step >= 1 && styles.stepDotActive]}>
          <Text style={[styles.stepDotNum, step >= 1 && styles.stepDotNumActive]}>1</Text>
        </View>
        <View style={[styles.stepLine, step >= 2 && styles.stepLineActive]} />
        <View style={[styles.stepDot, step >= 2 && styles.stepDotActive]}>
          <Text style={[styles.stepDotNum, step >= 2 && styles.stepDotNumActive]}>2</Text>
        </View>
        <View style={[styles.stepLine, step >= 3 && styles.stepLineActive]} />
        <View style={[styles.stepDot, step >= 3 && styles.stepDotActive]}>
          <Text style={[styles.stepDotNum, step >= 3 && styles.stepDotNumActive]}>3</Text>
        </View>
      </View>

      {/* Step 1: Identifier Input */}
      {step === 1 && (
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <MaterialIcons name="lock-reset" size={32} color={themeColors.primary} />
          </View>
          <Text style={styles.stepTitle}>Esqueceu sua senha?</Text>
          <Text style={styles.stepDesc}>
            Digite seu E-mail cadastrado. Enviaremos um código de verificação para validar sua identidade.
          </Text>

          <Text style={styles.inputLabel}>Digite seu E-mail</Text>
          <View style={styles.inputBox}>
            <MaterialIcons name="badge" size={20} color={themeColors.outline} />
            <TextInput
              style={[styles.textInput, { outlineStyle: 'none' } as any]}
              value={identifier}
              onChangeText={handleEmailInputChange}
              onKeyPress={handleEmailKeyPress}
              onSubmitEditing={handleSendCode}
              returnKeyType="done"
              placeholder="Digite seu E-mail"
              placeholderTextColor={themeColors.outline}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          {missingAtWarning && (
            <View style={styles.emailWarning} accessibilityRole="alert">
              <MaterialIcons name="error-outline" size={18} color={themeColors.tertiary} />
              <Text style={styles.emailWarningText}>
                Inclua @ no endereço para continuar com o e-mail.
              </Text>
            </View>
          )}

          <TouchableOpacity style={styles.submitBtn} onPress={handleSendCode}>
            <Text style={styles.submitBtnText}>Enviar Código de Segurança</Text>
            <MaterialIcons name="arrow-forward" size={18} color="#ffffff" />
          </TouchableOpacity>
        </View>
      )}

      {/* Step 2: Code Verification */}
      {step === 2 && (
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <MaterialIcons name="mark-email-read" size={32} color={themeColors.secondary} />
          </View>
          <Text style={styles.stepTitle}>Digite o código enviado</Text>
          <Text style={styles.stepDesc}>
            Enviamos um código de 6 dígitos para o número/e-mail associado a: <Text style={{ fontWeight: '700' }}>{identifier}</Text>
          </Text>

          <Text style={styles.inputLabel}>Código de 6 dígitos</Text>
          <View style={styles.inputBox}>
            <MaterialIcons name="security" size={20} color={themeColors.outline} />
            <TextInput
              style={[styles.textInput, { letterSpacing: 8, fontSize: 20, fontWeight: '700' }, { outlineStyle: 'none' } as any]}
              value={code}
              onChangeText={(text) => setCode(formatDigitsOnly(text, 6))}
              onSubmitEditing={handleVerifyCode}
              onKeyPress={(e: any) => blockNonDigitKeyPress(e, handleVerifyCode)}
              returnKeyType="done"
              placeholder="000000"
              placeholderTextColor={themeColors.outline}
              keyboardType="numeric"
              maxLength={6}
            />
          </View>

          <TouchableOpacity style={styles.submitBtn} onPress={handleVerifyCode}>
            <Text style={styles.submitBtnText}>Validar Código</Text>
            <MaterialIcons name="check" size={18} color="#ffffff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.resendBtn}
            onPress={() => {
              showNotification('Novo Código', 'Código reenviado por SMS e E-mail.', 'info');
              setResendTimer(30);
            }}
          >
            <Text style={styles.resendBtnText}>Reenviar código</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Step 3: Set New Password */}
      {step === 3 && (
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <MaterialIcons name="vpn-key" size={32} color={themeColors.primary} />
          </View>
          <Text style={styles.stepTitle}>Crie sua nova senha</Text>
          <Text style={styles.stepDesc}>
            Escolha uma senha forte para proteger seu saldo e seus passes digitais.
          </Text>

          <Text style={styles.inputLabel}>Nova Senha</Text>
          <View style={styles.inputBox}>
            <MaterialIcons name="lock" size={20} color={themeColors.outline} />
            <TextInput
              style={[styles.textInput, { outlineStyle: 'none' } as any]}
              value={newPassword}
              onChangeText={setNewPassword}
              onSubmitEditing={handleFinishReset}
              onKeyPress={(e: any) => {
                if ((e.nativeEvent?.key ?? e.key) === 'Enter') handleFinishReset();
              }}
              returnKeyType="done"
              placeholder="Mínimo 8 caracteres"
              placeholderTextColor={themeColors.outline}
              secureTextEntry={!showNewPassword}
            />
            <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)}>
              <MaterialIcons
                name={showNewPassword ? 'visibility-off' : 'visibility'}
                size={20}
                color={themeColors.outline}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.checklistRow}>
            <View style={styles.checkItem}>
              <MaterialIcons
                name={hasPasswordLength ? 'check-circle' : 'radio-button-unchecked'}
                size={14}
                color={hasPasswordLength ? themeColors.secondary : themeColors.outline}
              />
              <Text style={[styles.checkText, hasPasswordLength && styles.checkTextActive]}>
                8+ dígitos
              </Text>
            </View>

            <View style={styles.checkItem}>
              <MaterialIcons
                name={hasPasswordNumber ? 'check-circle' : 'radio-button-unchecked'}
                size={14}
                color={hasPasswordNumber ? themeColors.secondary : themeColors.outline}
              />
              <Text style={[styles.checkText, hasPasswordNumber && styles.checkTextActive]}>
                1 número
              </Text>
            </View>

            <View style={styles.checkItem}>
              <MaterialIcons
                name={hasPasswordUppercase ? 'check-circle' : 'radio-button-unchecked'}
                size={14}
                color={hasPasswordUppercase ? themeColors.secondary : themeColors.outline}
              />
              <Text style={[styles.checkText, hasPasswordUppercase && styles.checkTextActive]}>
                1 maiúscula
              </Text>
            </View>
          </View>

          <Text style={[styles.inputLabel, { marginTop: 10 }]}>Confirmar Nova Senha</Text>
          <View style={styles.inputBox}>
            <MaterialIcons name="lock-outline" size={20} color={themeColors.outline} />
            <TextInput
              style={[styles.textInput, { outlineStyle: 'none' } as any]}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              onSubmitEditing={handleFinishReset}
              onKeyPress={(e: any) => {
                if ((e.nativeEvent?.key ?? e.key) === 'Enter') handleFinishReset();
              }}
              returnKeyType="done"
              placeholder="Digite novamente a nova senha"
              placeholderTextColor={themeColors.outline}
              secureTextEntry={!showConfirmPassword}
            />
            <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
              <MaterialIcons
                name={showConfirmPassword ? 'visibility-off' : 'visibility'}
                size={20}
                color={themeColors.outline}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.submitBtn} onPress={handleFinishReset}>
            <Text style={styles.submitBtnText}>Redefinir e Concluir</Text>
            <MaterialIcons name="check-circle" size={18} color="#ffffff" />
          </TouchableOpacity>
        </View>
      )}

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
    paddingTop: 8,
  },
  contentFrame: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: themeColors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: themeColors.onSurface,
  },
  stepProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
    paddingHorizontal: 20,
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: themeColors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: {
    backgroundColor: themeColors.primaryContainer,
  },
  stepDotNum: {
    fontSize: 12,
    fontWeight: '700',
    color: themeColors.outline,
  },
  stepDotNumActive: {
    color: '#ffffff',
  },
  stepLine: {
    flex: 1,
    height: 3,
    backgroundColor: themeColors.surfaceContainerHigh,
    marginHorizontal: 8,
  },
  stepLineActive: {
    backgroundColor: themeColors.primaryContainer,
  },
  card: {
    backgroundColor: themeColors.surfaceContainerLowest,
    borderRadius: 22,
    padding: 20,
    alignItems: 'center',
    shadowColor: themeColors.onSurface,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: themeColors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: themeColors.onSurface,
    marginBottom: 6,
    textAlign: 'center',
  },
  stepDesc: {
    fontSize: 12,
    color: themeColors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
    paddingHorizontal: 10,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: themeColors.onSurface,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  inputBox: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeColors.surfaceContainerLow,
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 48,
    gap: 10,
    marginBottom: 16,
  },
  emailWarning: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 10,
    marginTop: -6,
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
  },
  checklistRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: -8,
    marginBottom: 8,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  checkText: {
    fontSize: 10,
    color: themeColors.outline,
  },
  checkTextActive: {
    color: themeColors.secondary,
    fontWeight: '600',
  },
  submitBtn: {
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
    shadowRadius: 6,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  resendBtn: {
    marginTop: 14,
    padding: 8,
  },
  resendBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: themeColors.primary,
  },
});
