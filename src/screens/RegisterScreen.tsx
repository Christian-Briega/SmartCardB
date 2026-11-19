import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Modal,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Colors, DarkColors } from '../theme/colors';
import { useApp } from '../context/AppContext';
import { formatPersonName } from '../utils/formatPersonName';
import { isValidCpf } from '../utils/isValidCpf';
import { InteractiveButton } from '../components/InteractiveButton';
import { evaluatePasswordStrength, sanitizeInput } from '../utils/formSecurity';
import {
  formatBirthDateInput,
  formatCpfInput,
  formatPhoneInput,
  formatEmailInput,
  blockNonLetterKeyPress,
  blockNonDigitKeyPress,
  blockInvalidEmailKeyPress,
} from '../utils/inputMasks';

const parseBirthDate = (value: string): Date | null => {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date > new Date()
  ) {
    return null;
  }

  return date;
};

const isUnderMinimumAge = (birthDate: Date): boolean => {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const birthdayHasNotOccurred =
    today.getMonth() < birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate());

  if (birthdayHasNotOccurred) age -= 1;
  return age < 14;
};

export const RegisterScreen: React.FC = () => {
  const {
    registerAsync,
    setCurrentScreen,
    setTermsModalOpen,
    setPrivacyModalOpen,
    isDarkMode,
    showNotification,
    openSocialAuthModal,
  } = useApp();
  const { width } = useWindowDimensions();
  const isDesktopGrid = width > 640;
  const themeColors = isDarkMode ? DarkColors : Colors;
  const styles = createStyles(themeColors, isDesktopGrid);

  const [fullName, setFullName] = useState('');
  const [cpf, setCpf] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [pickerDate, setPickerDate] = useState(() => new Date());
  const lastUnderageWarning = useRef('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [whatsappAlerts, setWhatsappAlerts] = useState(false);

  // Password checklist validation & strength
  const hasLength = password.length >= 8;
  const hasNumber = /\d/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const passwordStrength = evaluatePasswordStrength(password);
  const cpfDigits = cpf.replace(/\D/g, '');
  const cpfIsInvalid = cpfDigits.length === 11 && !isValidCpf(cpf);
  const parsedBirthDate = parseBirthDate(birthDate);
  const underage = parsedBirthDate !== null && isUnderMinimumAge(parsedBirthDate);

  const showUnderageWarning = (dateValue: string) => {
    const date = parseBirthDate(dateValue);
    if (!date || !isUnderMinimumAge(date)) {
      lastUnderageWarning.current = '';
      return;
    }
    if (lastUnderageWarning.current === dateValue) return;

    lastUnderageWarning.current = dateValue;
    showNotification(
      'Idade mínima não atingida',
      'É necessário ter pelo menos 14 anos para criar uma conta.',
      'error'
    );
  };

  const handleBirthDateChange = (value: string) => {
    const formattedDate = formatBirthDateInput(value);
    setBirthDate(formattedDate);
    showUnderageWarning(formattedDate);
  };

  const openDatePicker = () => {
    setPickerDate(parsedBirthDate || new Date());
    setIsDatePickerOpen(true);
  };

  const selectBirthDate = (date: Date) => {
    const formattedDate = [
      String(date.getDate()).padStart(2, '0'),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getFullYear()).padStart(4, '0'),
    ].join('/');
    setBirthDate(formattedDate);
    setIsDatePickerOpen(false);
    showUnderageWarning(formattedDate);
  };

  const handleDatePickerChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'ios') {
      if (selectedDate) setPickerDate(selectedDate);
      return;
    }

    setIsDatePickerOpen(false);
    if (event.type === 'set' && selectedDate) selectBirthDate(selectedDate);
  };

  const handleWebDateChange = (value: string) => {
    if (!value) {
      handleBirthDateChange('');
      return;
    }

    const [year, month, day] = value.split('-');
    handleBirthDateChange(`${day}/${month}/${year}`);
  };

  const handleSubmit = async () => {
    const cleanName = sanitizeInput(fullName);
    const cleanEmail = sanitizeInput(email);
    const cleanCpf = sanitizeInput(cpf);
    const cleanPhone = sanitizeInput(phone);

    if (!cleanName) {
      showNotification('Atenção', 'Informe seu Nome Completo.', 'error');
      return;
    }
    if (!isValidCpf(cleanCpf)) {
      showNotification('CPF Inválido', 'Informe um CPF válido de 11 dígitos.', 'error');
      return;
    }
    if (!parsedBirthDate) {
      showNotification(
        'Data inválida',
        'Informe uma data de nascimento válida no formato DD/MM/AAAA.',
        'error'
      );
      return;
    }
    if (isUnderMinimumAge(parsedBirthDate)) {
      showNotification(
        'Idade mínima não atingida',
        'É necessário ter pelo menos 14 anos para criar uma conta.',
        'error'
      );
      return;
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      showNotification('E-mail Inválido', 'Informe um endereço de e-mail válido.', 'error');
      return;
    }
    const phoneDigits = cleanPhone.replace(/\D/g, '');
    if (phoneDigits.length < 10 || phoneDigits.length > 11) {
      showNotification('Celular inválido', 'Informe um número com DDD e 8 ou 9 dígitos.', 'error');
      return;
    }
    if (!hasLength || !hasNumber || !hasUpper) {
      showNotification(
        'Senha Insegura',
        'Sua senha precisa ter pelo menos 8 dígitos, 1 número e 1 letra maiúscula.',
        'error'
      );
      return;
    }
    if (password !== confirmPassword) {
      showNotification('Senhas Diferentes', 'A confirmação não confere com a senha.', 'error');
      return;
    }
    if (!termsAccepted) {
      showNotification(
        'Termos de Uso e Privacidade',
        'É necessário aceitar os Termos de Uso e a Política de Privacidade para criar sua conta.',
        'error'
      );
      return;
    }

    const result = await registerAsync(
      cleanName,
      cleanCpf,
      cleanEmail,
      cleanPhone,
      password,
      whatsappAlerts,
      birthDate
    );

    if (!result.ok) {
      showNotification(
        'Dados Pessoais Já Cadastrados',
        result.error ||
          'Este CPF, e-mail, celular ou nome já pertence a outra conta registrada no banco de dados.',
        'error'
      );
      return;
    }

    showNotification(
      'Cadastro Concluído',
      'Sua conta foi criada com sucesso. Entre com seus dados de acesso.',
      'success'
    );
  };

  const handleEnterKeyPress = (event: any) => {
    const key = event.nativeEvent?.key ?? event.key;
    if (key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.contentFrame}>
        {/* Top Bar with Back */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => setCurrentScreen('login')}>
            <MaterialIcons name="arrow-back" size={22} color={themeColors.onSurface} />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Criar Conta SmartCard BUS</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Hero Header */}
        <View style={styles.heroBanner}>
          <View style={styles.heroTag}>
            <MaterialIcons name="verified" size={14} color={themeColors.secondary} />
            <Text style={styles.heroTagText}>Emissão 100% gratuita</Text>
          </View>
          <Text style={styles.heroTitle}>Seu bilhete digital em minutos!</Text>
          <Text style={styles.heroSubtitle}>
            Cadastre-se para emitir seu primeiro passe digital, recarregar sem filas e embarcar
            direto com a catraca do seu celular.
          </Text>

          <View style={styles.benefitsRow}>
            <View style={styles.benefitItem}>
              <MaterialIcons name="bolt" size={16} color={themeColors.secondary} />
              <Text style={styles.benefitText}>Aprovação instantânea</Text>
            </View>
            <Text style={styles.bulletDot}>•</Text>
            <View style={styles.benefitItem}>
              <MaterialIcons name="contactless" size={16} color={themeColors.secondary} />
              <Text style={styles.benefitText}>NFC & QR Code</Text>
            </View>
          </View>
        </View>

        {/* Quick Social Sign-up */}
        <View style={styles.socialBox}>
          <Text style={styles.socialPrompt}>Cadastrar rapidamente com:</Text>
          <View style={styles.socialRow}>
            <TouchableOpacity
              style={styles.socialBtn}
              onPress={() => openSocialAuthModal('google', 'register')}
            >
              <Text style={styles.socialIconG}>G</Text>
              <Text style={styles.socialBtnText}>Google</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.socialBtn}
              onPress={() => openSocialAuthModal('apple', 'register')}
            >
              <MaterialIcons name="apple" size={20} color={themeColors.onSurface} />
              <Text style={styles.socialBtnText}>Apple</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Section 1: Dados do Titular */}
        <View style={styles.formSection}>
          <View style={styles.sectionTitleRow}>
            <MaterialIcons name="person-outline" size={20} color={themeColors.primary} />
            <Text style={styles.sectionTitle}>Dados do Titular</Text>
          </View>

          {/* Linha 1: Nome Completo (Largura Total) */}
          <View style={styles.fieldGroup}>
            <Text style={styles.inputLabel}>Nome Completo *</Text>
            <View style={styles.inputBox}>
              <MaterialIcons name="badge" size={18} color={themeColors.outline} />
              <TextInput
                style={[styles.input, { outlineStyle: 'none' } as any]}
                value={fullName}
                onChangeText={(value) => setFullName(formatPersonName(value))}
                onKeyPress={(e) => blockNonLetterKeyPress(e, handleSubmit)}
                onSubmitEditing={handleSubmit}
                returnKeyType="done"
                placeholder="Digite seu nome completo"
                placeholderTextColor={themeColors.outline}
                autoCapitalize="words"
              />
            </View>
          </View>

          {/* Linha 2: CPF (Esquerda) e Data de Nascimento (Direita) */}
          <View style={styles.gridRow}>
            <View style={styles.gridColumn}>
              <View style={styles.labelHeaderRow}>
                <Text style={styles.inputLabelInline}>CPF *</Text>
                <View style={styles.protectedTag}>
                  <MaterialIcons name="lock" size={12} color={themeColors.secondary} />
                  <Text style={styles.protectedTagText}>Protegido</Text>
                </View>
              </View>
              <View style={[styles.inputBox, cpfIsInvalid && styles.inputBoxError]}>
                <MaterialIcons name="fingerprint" size={18} color={themeColors.outline} />
                <TextInput
                  style={[styles.input, { outlineStyle: 'none' } as any]}
                  value={cpf}
                  onChangeText={(text) => setCpf(formatCpfInput(text))}
                  onKeyPress={(e) => blockNonDigitKeyPress(e, handleSubmit)}
                  onSubmitEditing={handleSubmit}
                  returnKeyType="done"
                  placeholder="000.000.000-00"
                  placeholderTextColor={themeColors.outline}
                  keyboardType="numeric"
                  maxLength={14}
                  accessibilityLabel="CPF"
                />
              </View>
              {cpfIsInvalid ? (
                <Text style={styles.birthDateError} accessibilityRole="alert">
                  CPF inválido. Confira os 11 dígitos informados.
                </Text>
              ) : null}
            </View>

            <View style={styles.gridColumn}>
              <View style={styles.labelHeaderRow}>
                <Text style={styles.inputLabelInline}>Data de Nascimento *</Text>
              </View>
              {Platform.OS === 'web' ? (
                <>
                  {React.createElement(
                    'style',
                    null,
                    '#birth-date-input { position: relative; padding-left: 32px; } #birth-date-input::-webkit-calendar-picker-indicator { position: absolute; left: 10px; right: auto; cursor: pointer; }'
                  )}
                  <View style={[styles.inputBox, underage && styles.inputBoxError]}>
                    {React.createElement('input', {
                      id: 'birth-date-input',
                      type: 'date',
                      value: parsedBirthDate
                        ? `${parsedBirthDate.getFullYear()}-${String(
                            parsedBirthDate.getMonth() + 1
                          ).padStart(2, '0')}-${String(parsedBirthDate.getDate()).padStart(2, '0')}`
                        : '',
                      max: (() => {
                        const today = new Date();
                        return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(
                          2,
                          '0'
                        )}-${String(today.getDate()).padStart(2, '0')}`;
                      })(),
                      onChange: (event) => handleWebDateChange(event.currentTarget.value),
                      'aria-label': 'Data de nascimento',
                      style: {
                        flex: 1,
                        height: '100%',
                        border: 'none',
                        outline: 'none',
                        backgroundColor: 'transparent',
                        color: themeColors.onSurface,
                        fontSize: 13,
                        fontFamily: 'inherit',
                        textAlign: 'left',
                      },
                    })}
                  </View>
                </>
              ) : (
                <>
                  <TouchableOpacity
                    style={[
                      styles.inputBox,
                      underage && styles.inputBoxError,
                      styles.nativeDateInput,
                    ]}
                    onPress={openDatePicker}
                    accessibilityRole="button"
                    accessibilityLabel={
                      parsedBirthDate
                        ? `Data de nascimento: ${birthDate}. Abrir seletor de data`
                        : 'Selecionar data de nascimento'
                    }
                  >
                    <Text
                      style={[styles.input, !parsedBirthDate && styles.datePickerPlaceholder]}
                    >
                      {birthDate || 'DD/MM/AAAA'}
                    </Text>
                  </TouchableOpacity>
                  {Platform.OS === 'android' && isDatePickerOpen ? (
                    <DateTimePicker
                      value={pickerDate}
                      mode="date"
                      display="default"
                      maximumDate={new Date()}
                      onChange={handleDatePickerChange}
                    />
                  ) : null}
                </>
              )}
              {underage ? (
                <Text style={styles.birthDateError}>
                  É necessário ter pelo menos 14 anos para criar uma conta.
                </Text>
              ) : null}
            </View>
          </View>

          <View style={styles.infoBox}>
            <MaterialIcons name="info" size={14} color={themeColors.primary} />
            <Text style={styles.infoText}>
              Necessário para vinculação nominal e segurança dos seus cartões.
            </Text>
          </View>
        </View>

        {/* Section 2: Contato & Senha */}
        <View style={styles.formSection}>
          <View style={styles.sectionTitleRow}>
            <MaterialIcons name="lock-outline" size={20} color={themeColors.primary} />
            <Text style={styles.sectionTitle}>Contato & Senha de Acesso</Text>
          </View>

          {/* Linha 1: E-mail (Esquerda) e Celular / WhatsApp (Direita) */}
          <View style={styles.gridRow}>
            <View style={styles.gridColumn}>
              <View style={styles.labelHeaderRow}>
                <Text style={styles.inputLabelInline}>E-mail *</Text>
              </View>
              <View style={styles.inputBox}>
                <MaterialIcons name="mail-outline" size={18} color={themeColors.outline} />
                <TextInput
                  style={[styles.input, { outlineStyle: 'none' } as any]}
                  value={email}
                  onChangeText={(text) => setEmail(formatEmailInput(text))}
                  onKeyPress={(e) => blockInvalidEmailKeyPress(e, email, handleSubmit)}
                  onSubmitEditing={handleSubmit}
                  returnKeyType="done"
                  placeholder="Digite seu e-mail"
                  placeholderTextColor={themeColors.outline}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            <View style={styles.gridColumn}>
              <View style={styles.labelHeaderRow}>
                <Text style={styles.inputLabelInline}>Celular / WhatsApp *</Text>
                <Text style={styles.smsTag}>Validação SMS</Text>
              </View>
              <View style={styles.inputBox}>
                <MaterialIcons name="smartphone" size={18} color={themeColors.outline} />
                <TextInput
                  style={[styles.input, { outlineStyle: 'none' } as any]}
                  value={phone}
                  onChangeText={(text) => setPhone(formatPhoneInput(text))}
                  onKeyPress={(e) => blockNonDigitKeyPress(e, handleSubmit)}
                  onSubmitEditing={handleSubmit}
                  returnKeyType="done"
                  placeholder="(99) 99999-9999"
                  placeholderTextColor={themeColors.outline}
                  keyboardType="phone-pad"
                  maxLength={15}
                />
              </View>
            </View>
          </View>

          {/* Linha 2: Criar Senha de Acesso (Esquerda) e Confirmar Senha (Direita) */}
          <View style={[styles.gridRow, { marginTop: 14 }]}>
            <View style={styles.gridColumn}>
              <View style={styles.labelHeaderRow}>
                <Text style={styles.inputLabelInline}>Criar Senha de Acesso *</Text>
              </View>
              <View style={styles.inputBox}>
                <MaterialIcons name="lock" size={18} color={themeColors.outline} />
                <TextInput
                  style={[styles.input, { outlineStyle: 'none' } as any]}
                  value={password}
                  onChangeText={setPassword}
                  onKeyPress={handleEnterKeyPress}
                  onSubmitEditing={handleSubmit}
                  returnKeyType="done"
                  placeholder="Digite uma senha forte"
                  placeholderTextColor={themeColors.outline}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <MaterialIcons
                    name={showPassword ? 'visibility-off' : 'visibility'}
                    size={18}
                    color={themeColors.outline}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.gridColumn}>
              <View style={styles.labelHeaderRow}>
                <Text style={styles.inputLabelInline}>Confirmar Senha *</Text>
              </View>
              <View style={styles.inputBox}>
                <MaterialIcons name="lock-outline" size={18} color={themeColors.outline} />
                <TextInput
                  style={[styles.input, { outlineStyle: 'none' } as any]}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  onKeyPress={handleEnterKeyPress}
                  onSubmitEditing={handleSubmit}
                  returnKeyType="done"
                  placeholder="Digite novamente sua senha"
                  placeholderTextColor={themeColors.outline}
                  secureTextEntry={!showConfirmPassword}
                />
                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                  <MaterialIcons
                    name={showConfirmPassword ? 'visibility-off' : 'visibility'}
                    size={18}
                    color={themeColors.outline}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Password Strength Meter */}
          {password.length > 0 && (
            <View style={styles.strengthMeterContainer}>
              <View style={styles.strengthMeterBarBackground}>
                <View
                  style={[
                    styles.strengthMeterBarFill,
                    {
                      width: `${(passwordStrength.score + 1) * 20}%`,
                      backgroundColor: passwordStrength.color,
                    },
                  ]}
                />
              </View>
              <View style={styles.strengthMetaRow}>
                <Text style={styles.strengthLabel}>Segurança da Senha:</Text>
                <Text style={[styles.strengthScoreText, { color: passwordStrength.color }]}>
                  {passwordStrength.label}
                </Text>
              </View>
            </View>
          )}

          {/* Password Requirements Checklist */}
          <View style={styles.checklistRow}>
            <View style={styles.checkItem}>
              <MaterialIcons
                name={hasLength ? 'check-circle' : 'radio-button-unchecked'}
                size={14}
                color={hasLength ? themeColors.secondary : themeColors.outline}
              />
              <Text style={[styles.checkText, hasLength && styles.checkTextActive]}>
                8+ dígitos
              </Text>
            </View>

            <View style={styles.checkItem}>
              <MaterialIcons
                name={hasNumber ? 'check-circle' : 'radio-button-unchecked'}
                size={14}
                color={hasNumber ? themeColors.secondary : themeColors.outline}
              />
              <Text style={[styles.checkText, hasNumber && styles.checkTextActive]}>
                1 número
              </Text>
            </View>

            <View style={styles.checkItem}>
              <MaterialIcons
                name={hasUpper ? 'check-circle' : 'radio-button-unchecked'}
                size={14}
                color={hasUpper ? themeColors.secondary : themeColors.outline}
              />
              <Text style={[styles.checkText, hasUpper && styles.checkTextActive]}>
                1 maiúscula
              </Text>
            </View>
          </View>
        </View>

        {/* Section 3: Termos & WhatsApp */}
        <View style={styles.formSection}>
          <TouchableOpacity
            style={styles.termsRow}
            activeOpacity={0.85}
            onPress={() => setTermsAccepted(!termsAccepted)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: termsAccepted }}
          >
            <MaterialIcons
              name={termsAccepted ? 'check-box' : 'check-box-outline-blank'}
              size={22}
              color={termsAccepted ? themeColors.primary : themeColors.outline}
            />
            <Text style={styles.termsText}>
              Li e concordo com os{' '}
              <Text
                style={styles.termsLink}
                onPress={(e) => {
                  e.stopPropagation?.();
                  setTermsModalOpen(true);
                }}
              >
                Termos de Uso
              </Text>{' '}
              e a{' '}
              <Text
                style={styles.termsLink}
                onPress={(e) => {
                  e.stopPropagation?.();
                  setPrivacyModalOpen(true);
                }}
              >
                Política de Privacidade
              </Text>{' '}
              do SmartCard BUS. *
            </Text>
          </TouchableOpacity>

          <View style={styles.whatsappBox}>
            <View style={styles.whatsappLeft}>
              <MaterialIcons
                name="notifications-active"
                size={20}
                color={themeColors.secondary}
              />
              <View style={styles.whatsappCopy}>
                <Text style={styles.whatsappTitle}>Avisos via WhatsApp</Text>
                <Text style={styles.whatsappDesc}>
                  Receba alertas de saldo baixo e comprovantes de recarga.
                </Text>
              </View>
            </View>
            <Switch
              value={whatsappAlerts}
              onValueChange={setWhatsappAlerts}
              trackColor={{ false: '#cbd5e1', true: themeColors.secondaryContainer }}
              thumbColor={whatsappAlerts ? themeColors.secondary : '#ffffff'}
            />
          </View>
        </View>

        {/* Submit CTA (Alinhado ao mesmo container centralizado) */}
        <View style={styles.submitBtnWrapper}>
          <InteractiveButton style={styles.submitBtn} onPress={handleSubmit}>
            <View style={styles.submitBtnContent}>
              <Text style={styles.submitBtnText}>Criar Minha Conta SmartCard BUS</Text>
              <MaterialIcons name="arrow-forward" size={20} color="#ffffff" />
            </View>
          </InteractiveButton>
        </View>

        <View style={{ height: 32 }} />
        <Modal
          visible={Platform.OS === 'ios' && isDatePickerOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setIsDatePickerOpen(false)}
        >
          <View style={styles.datePickerOverlay}>
            <View style={styles.datePickerModal}>
              <DateTimePicker
                value={pickerDate}
                mode="date"
                display="spinner"
                locale="pt-BR"
                themeVariant={isDarkMode ? 'dark' : 'light'}
                maximumDate={new Date()}
                onChange={handleDatePickerChange}
              />
              <View style={styles.datePickerActions}>
                <TouchableOpacity onPress={() => setIsDatePickerOpen(false)}>
                  <Text style={styles.datePickerActionText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => selectBirthDate(pickerDate)}>
                  <Text style={styles.datePickerActionText}>Confirmar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </ScrollView>
  );
};

const createStyles = (themeColors: typeof Colors, isDesktopGrid: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      width: '100%',
      backgroundColor: themeColors.surface,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 24,
    },
    contentFrame: {
      width: '100%',
      maxWidth: 680,
      alignSelf: 'center',
    },
    topBar: {
      width: '100%',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
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
    heroBanner: {
      width: '100%',
      backgroundColor: themeColors.surfaceContainerHigh,
      borderRadius: 20,
      padding: 16,
      marginBottom: 14,
    },
    heroTag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: themeColors.secondaryContainer,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 10,
      alignSelf: 'flex-start',
      marginBottom: 8,
    },
    heroTagText: {
      fontSize: 10,
      fontWeight: '700',
      color: themeColors.onSecondaryContainer,
    },
    heroTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: themeColors.onSurface,
      marginBottom: 4,
    },
    heroSubtitle: {
      fontSize: 12,
      color: themeColors.onSurfaceVariant,
      lineHeight: 17,
      marginBottom: 10,
    },
    benefitsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    benefitItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    benefitText: {
      fontSize: 11,
      fontWeight: '600',
      color: themeColors.onSurface,
    },
    bulletDot: {
      color: themeColors.outlineVariant,
    },
    socialBox: {
      width: '100%',
      backgroundColor: themeColors.surfaceContainerLowest,
      borderRadius: 16,
      padding: 12,
      marginBottom: 14,
    },
    socialPrompt: {
      fontSize: 11,
      fontWeight: '600',
      color: themeColors.outline,
      marginBottom: 8,
      textAlign: 'center',
    },
    socialRow: {
      flexDirection: 'row',
      gap: 12,
    },
    socialBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      height: 42,
      borderRadius: 12,
      backgroundColor: themeColors.surfaceContainerLow,
    },
    socialIconG: {
      fontSize: 16,
      fontWeight: '800',
      color: '#4285F4',
    },
    socialBtnText: {
      fontSize: 12,
      fontWeight: '700',
      color: themeColors.onSurface,
    },
    formSection: {
      width: '100%',
      backgroundColor: themeColors.surfaceContainerLowest,
      borderRadius: 20,
      padding: 16,
      marginBottom: 14,
      shadowColor: themeColors.onSurface,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 4,
      elevation: 1,
    },
    sectionTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 14,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: themeColors.onSurface,
    },
    fieldGroup: {
      width: '100%',
      marginBottom: 14,
    },
    gridRow: {
      width: '100%',
      flexDirection: isDesktopGrid ? 'row' : 'column',
      alignItems: 'flex-start',
      gap: 16,
    },
    gridColumn: {
      flex: isDesktopGrid ? 1 : undefined,
      width: isDesktopGrid ? undefined : '100%',
    },
    inputLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: themeColors.onSurface,
      marginBottom: 6,
    },
    inputLabelInline: {
      fontSize: 11,
      fontWeight: '600',
      color: themeColors.onSurface,
    },
    labelHeaderRow: {
      minHeight: 18,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    protectedTag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
    },
    protectedTagText: {
      fontSize: 10,
      color: themeColors.secondary,
      fontWeight: '600',
    },
    smsTag: {
      fontSize: 10,
      color: themeColors.outline,
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
    inputBoxError: {
      borderWidth: 1,
      borderColor: '#dc2626',
    },
    nativeDateInput: {
      justifyContent: 'center',
    },
    datePickerPlaceholder: {
      color: themeColors.outline,
    },
    birthDateError: {
      color: '#dc2626',
      fontSize: 11,
      marginTop: 5,
    },
    datePickerOverlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.45)',
      padding: 20,
    },
    datePickerModal: {
      width: '100%',
      maxWidth: 360,
      backgroundColor: themeColors.surfaceContainerLowest,
      borderRadius: 20,
      padding: 20,
    },
    datePickerActions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 8,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    datePickerActionText: {
      color: themeColors.primary,
      fontSize: 14,
      fontWeight: '700',
    },
    input: {
      flex: 1,
      fontSize: 13,
      color: themeColors.onSurface,
    },
    infoBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: themeColors.surfaceContainerHigh,
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 10,
      marginTop: 12,
    },
    infoText: {
      fontSize: 11,
      color: themeColors.onSurfaceVariant,
      flex: 1,
    },
    checklistRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 14,
      marginTop: 10,
    },
    checkItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    checkText: {
      fontSize: 11,
      color: themeColors.outline,
    },
    checkTextActive: {
      color: themeColors.secondary,
      fontWeight: '600',
    },
    termsRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      marginBottom: 12,
    },
    termsText: {
      fontSize: 12,
      color: themeColors.onSurface,
      lineHeight: 18,
      flex: 1,
    },
    termsLink: {
      color: themeColors.primary,
      fontWeight: '700',
      textDecorationLine: 'underline',
    },
    whatsappBox: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: themeColors.surfaceContainerLow,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 12,
    },
    whatsappLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
      paddingRight: 10,
    },
    whatsappCopy: {
      flex: 1,
    },
    whatsappTitle: {
      fontSize: 12.5,
      fontWeight: '700',
      color: themeColors.onSurface,
    },
    whatsappDesc: {
      fontSize: 11,
      color: themeColors.onSurfaceVariant,
      marginTop: 2,
      lineHeight: 15,
    },
    strengthMeterContainer: {
      marginTop: 10,
      marginBottom: 2,
    },
    strengthMeterBarBackground: {
      height: 4,
      backgroundColor: themeColors.surfaceContainerHigh,
      borderRadius: 2,
      overflow: 'hidden',
    },
    strengthMeterBarFill: {
      height: '100%',
      borderRadius: 2,
    },
    strengthMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 4,
    },
    strengthLabel: {
      fontSize: 10,
      color: themeColors.onSurfaceVariant,
      fontWeight: '600',
    },
    strengthScoreText: {
      fontSize: 10,
      fontWeight: '800',
    },
    submitBtnWrapper: {
      width: '100%',
      alignSelf: 'center',
    },
    submitBtn: {
      width: '100%',
      backgroundColor: themeColors.primaryContainer,
      height: 54,
      borderRadius: 16,
      shadowColor: themeColors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 4,
      justifyContent: 'center',
    },
    submitBtnContent: {
      width: '100%',
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
  });
