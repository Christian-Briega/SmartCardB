import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, DarkColors, Spacing } from '../theme/colors';
import { useApp } from '../context/AppContext';
import { mysqlApiService } from '../services/mysqlApiService';
import {
  formatPhoneInput,
  formatDigitsOnly,
  blockNonDigitKeyPress,
} from '../utils/inputMasks';

export const SmsVerificationScreen: React.FC = () => {
  const {
    user,
    updateUser,
    loginWithPhoneAsync,
    setCurrentScreen,
    goBackScreen,
    isDarkMode,
    isLoggedIn,
    showNotification,
  } = useApp();
  const themeColors = isDarkMode ? DarkColors : Colors;
  const styles = createStyles(themeColors);
  const [phone, setPhone] = useState(user.phone || '');
  const [channel, setChannel] = useState<'sms' | 'whatsapp' | null>('whatsapp');
  const [code, setCode] = useState('');
  const [countdown, setCountdown] = useState(45);
  const [codeSent, setCodeSent] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [needsPairing, setNeedsPairing] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [isNetworkBlocked, setIsNetworkBlocked] = useState(false);
  const [callmebotApiKey, setCallmebotApiKey] = useState('');

  useEffect(() => {
    if (user.phone && !phone) {
      setPhone(user.phone);
    }
  }, [user.phone]);

  useEffect(() => {
    if (!codeSent || countdown <= 0) return;
    const t = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [codeSent, countdown]);

  // Monitora a conexão do QR Code do WhatsApp Baileys e dispara automaticamente assim que conectar
  useEffect(() => {
    if (!needsPairing || isNetworkBlocked) return;
    const poll = setInterval(async () => {
      const st = await mysqlApiService.getWhatsAppStatus();
      if (st?.status === 'network_blocked') {
        setIsNetworkBlocked(true);
        return;
      }
      if (st?.qrCodeDataUrl) {
        setQrCodeDataUrl(st.qrCodeDataUrl);
      }
      if (st?.connected) {
        clearInterval(poll);
        setNeedsPairing(false);
        setQrCodeDataUrl(null);
        handleSendCode();
      }
    }, 2500);
    return () => clearInterval(poll);
  }, [needsPairing, isNetworkBlocked, phone, channel]);

  const handlePhoneChange = (text: string) => {
    setPhone(formatPhoneInput(text));
  };

  const handleSendCode = async () => {
    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length < 10 || phoneDigits.length > 11) {
      showNotification(
        'Número inválido',
        'Informe um número de celular com DDD e 8 ou 9 dígitos.',
        'error'
      );
      return;
    }
    if (!channel) {
      showNotification(
        'Escolha uma opção',
        'Selecione se deseja receber o código por SMS ou WhatsApp.',
        'error'
      );
      return;
    }

    setIsSending(true);
    const res = await mysqlApiService.sendOtpCode({
      phone,
      channel,
      mode: isLoggedIn ? 'verify' : 'login',
      ...(callmebotApiKey.trim() ? { callmebotApiKey: callmebotApiKey.trim() } : {}),
    });
    setIsSending(false);

    if (res.inactive) {
      setCurrentScreen('register');
      setTimeout(() => {
        showNotification(
          'Conta Inativada',
          res.error ||
            'Esta conta está inativada. Realize o cadastro novamente para reativar seu acesso.',
          'error'
        );
      }, 60);
      return;
    }

    if (res.needsWhatsAppPairing) {
      setNeedsPairing(true);
      setIsNetworkBlocked(res.whatsappStatus?.status === 'network_blocked');
      setQrCodeDataUrl(res.whatsappStatus?.qrCodeDataUrl || null);
      return;
    }

    if (!res.ok) {
      showNotification(
        'Não foi possível enviar o código',
        res.error || 'Confira o número de celular informado.',
        'error'
      );
      return;
    }

    setNeedsPairing(false);
    setCode('');
    setCodeSent(true);
    setCountdown(45);

    showNotification(
      channel === 'whatsapp' ? 'Código Enviado no WhatsApp' : 'Código SMS Enviado',
      `Enviamos um código de 6 dígitos para ${phone}.`,
      'info'
    );
  };

  const handleBack = () => {
    if (codeSent) {
      setCodeSent(false);
      setCode('');
      return;
    }
    goBackScreen(isLoggedIn ? 'profile' : 'login');
  };

  const handleVerify = async () => {
    if (code.length < 6) {
      showNotification(
        'Código Incompleto',
        'Digite os 6 dígitos do código de segurança.',
        'error'
      );
      return;
    }

    setIsVerifying(true);
    const verifyRes = await mysqlApiService.verifyOtpCode({
      phone,
      code,
      mode: isLoggedIn ? 'verify' : 'login',
    });
    setIsVerifying(false);

    if (verifyRes.inactive) {
      setCurrentScreen('register');
      setTimeout(() => {
        showNotification(
          'Conta Inativada',
          verifyRes.error ||
            'Esta conta está inativada. Realize o cadastro novamente para reativar seu acesso.',
          'error'
        );
      }, 60);
      return;
    }

    if (!verifyRes.ok) {
      showNotification(
        'Código Inválido',
        verifyRes.error ||
          'O código informado não confere com o código enviado para o seu celular.',
        'error'
      );
      return;
    }

    if (isLoggedIn) {
      updateUser({ phone, twoFactorEnabled: true });
      showNotification(
        'Celular Validado',
        `O número ${phone} foi verificado para autenticação rápida em dois fatores.`,
        'success',
        () => goBackScreen('profile')
      );
      return;
    }

    const ok = await loginWithPhoneAsync(phone);
    if (!ok) {
      showNotification(
        'Número não cadastrado',
        'Confira se informou o número de telefone associado à sua conta ativa.',
        'error'
      );
      return;
    }
    showNotification('Acesso Autorizado', 'Código verificado com sucesso.', 'success');
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
          onPress={handleBack}
        >
          <MaterialIcons name="arrow-back" size={22} color={themeColors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Validação de Acesso</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.card}>
        <View style={styles.iconCircle}>
          <MaterialIcons
            name={codeSent ? 'smartphone' : 'phone-android'}
            size={32}
            color={themeColors.primary}
          />
        </View>

        <Text style={styles.title}>
          {codeSent ? 'Digite o código enviado' : 'Acesso rápido por código'}
        </Text>
        <Text style={styles.desc}>
          {codeSent
            ? `Enviamos um código de verificação via ${channel === 'sms' ? 'SMS' : 'WhatsApp'} para ${phone}.`
            : 'Informe seu número de celular e escolha como deseja receber o código de verificação.'}
        </Text>

        {!codeSent ? (
          <>
            <Text style={[styles.inputLabel, styles.fieldLabel]}>Número de celular com DDD</Text>
            <View style={styles.phoneBox}>
              <MaterialIcons name="phone" size={20} color={themeColors.outline} />
              <TextInput
                style={[styles.phoneInput, { outlineStyle: 'none' } as any]}
                value={phone}
                onChangeText={handlePhoneChange}
                onSubmitEditing={handleSendCode}
                onKeyPress={(e: any) => blockNonDigitKeyPress(e, handleSendCode)}
                returnKeyType="done"
                placeholder="(99) 99999-9999"
                placeholderTextColor={themeColors.outline}
                keyboardType="phone-pad"
                maxLength={15}
                accessibilityLabel="Número de celular com DDD"
              />
            </View>

            <Text style={[styles.inputLabel, styles.fieldLabel]}>Receber código por</Text>
            <View style={styles.channelList}>
              <TouchableOpacity
                style={[
                  styles.channelOption,
                  channel === 'sms' && styles.channelOptionSelected,
                ]}
                onPress={() => setChannel('sms')}
                accessibilityRole="radio"
                accessibilityState={{ checked: channel === 'sms' }}
              >
                <MaterialIcons name="sms" size={20} color={themeColors.primary} />
                <Text style={styles.channelText}>SMS</Text>
                <MaterialIcons
                  name={channel === 'sms' ? 'radio-button-checked' : 'radio-button-unchecked'}
                  size={20}
                  color={themeColors.primary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.channelOption,
                  channel === 'whatsapp' && styles.channelOptionSelected,
                ]}
                onPress={() => setChannel('whatsapp')}
                accessibilityRole="radio"
                accessibilityState={{ checked: channel === 'whatsapp' }}
              >
                <MaterialIcons name="chat" size={20} color={themeColors.secondary} />
                <Text style={styles.channelText}>WhatsApp</Text>
                <MaterialIcons
                  name={channel === 'whatsapp' ? 'radio-button-checked' : 'radio-button-unchecked'}
                  size={20}
                  color={themeColors.primary}
                />
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, styles.fieldLabel]}>
              API Key do WhatsApp / SMS (CallMeBot)
            </Text>
            <View style={styles.phoneBox}>
              <MaterialIcons name="vpn-key" size={20} color={themeColors.outline} />
              <TextInput
                style={[styles.phoneInput, { outlineStyle: 'none' } as any]}
                value={callmebotApiKey}
                onChangeText={setCallmebotApiKey}
                onSubmitEditing={handleSendCode}
                returnKeyType="done"
                placeholder="Cole aqui a API Key recebida no WhatsApp"
                placeholderTextColor={themeColors.outline}
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel="API Key do WhatsApp"
              />
              {callmebotApiKey.trim().length > 0 && (
                <TouchableOpacity
                  style={{
                    backgroundColor: themeColors.primaryContainer,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 10,
                  }}
                  onPress={async () => {
                    await mysqlApiService.saveWhatsAppConfig(callmebotApiKey.trim());
                    showNotification(
                      'API Key Salva',
                      'Sua API Key foi salva no servidor. Agora clique em Enviar código!',
                      'success'
                    );
                  }}
                >
                  <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '700' }}>
                    Salvar
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            <Text
              style={{
                alignSelf: 'flex-start',
                fontSize: 11,
                lineHeight: 16,
                color: themeColors.onSurfaceVariant,
                marginBottom: 16,
              }}
            >
              Para gerar sua chave gratuita: envie{' '}
              <Text style={{ fontWeight: '700', color: themeColors.primary }}>
                I allow callmebot to send me messages
              </Text>{' '}
              no WhatsApp para <Text style={{ fontWeight: '700' }}>+34 644 51 95 23</Text> e cole a
              chave acima.
            </Text>

            <TouchableOpacity
              style={styles.verifyBtn}
              onPress={handleSendCode}
              disabled={isSending}
            >
              <MaterialIcons name="send" size={20} color="#ffffff" />
              <Text style={styles.verifyBtnText}>
                {isSending ? 'Enviando código...' : 'Enviar código'}
              </Text>
            </TouchableOpacity>

            {needsPairing && (
              <View style={styles.qrPairingBox}>
                {isNetworkBlocked ? (
                  <>
                    <Text style={styles.qrPairingTitle}>
                      Ativar Disparo Real no seu WhatsApp (1ª vez)
                    </Text>
                    <Text style={styles.qrPairingSub}>
                      A rede escolar bloqueia o WhatsApp Web local (`web.whatsapp.com`). Para
                      receber o código de verdade no seu celular via API externa:
                    </Text>
                    <Text style={styles.qrPairingSub}>
                      1. No WhatsApp do seu celular, envie a frase:{'\n'}
                      <Text style={{ fontWeight: '700', color: themeColors.primary }}>
                        I allow callmebot to send me messages
                      </Text>
                      {'\n'}para o número <Text style={{ fontWeight: '700' }}>+34 644 51 95 23</Text>
                    </Text>
                    <Text style={styles.qrPairingSub}>
                      2. Cole abaixo a <Text style={{ fontWeight: '700' }}>API Key</Text> que o bot
                      responder no seu WhatsApp e clique em Enviar código:
                    </Text>
                    <View style={[styles.phoneBox, { marginTop: 8, marginBottom: 4 }]}>
                      <MaterialIcons name="vpn-key" size={18} color={themeColors.outline} />
                      <TextInput
                        style={[styles.phoneInput, { height: 44, fontSize: 14, outlineStyle: 'none' } as any]}
                        value={callmebotApiKey}
                        onChangeText={setCallmebotApiKey}
                        onSubmitEditing={handleSendCode}
                        placeholder="Cole sua API Key (ex: 123456)"
                        placeholderTextColor={themeColors.outline}
                        autoCapitalize="none"
                      />
                    </View>
                  </>
                ) : (
                  <>
                    <Text style={styles.qrPairingTitle}>
                      Conecte o WhatsApp do Servidor (1ª vez)
                    </Text>
                    <Text style={styles.qrPairingSub}>
                      Para o servidor disparar a mensagem real para {phone}, abra o{' '}
                      <Text style={{ fontWeight: '700' }}>
                        WhatsApp &gt; Aparelhos conectados &gt; Conectar um aparelho
                      </Text>{' '}
                      e escaneie o QR Code abaixo. Assim que conectar, o código será enviado na hora!
                    </Text>
                    {qrCodeDataUrl ? (
                      <Image
                        source={{ uri: qrCodeDataUrl }}
                        style={{ width: 220, height: 220, borderRadius: 12, marginTop: 8 }}
                      />
                    ) : (
                      <Text style={styles.qrPairingSub}>Gerando QR Code do WhatsApp...</Text>
                    )}
                  </>
                )}
              </View>
            )}
          </>
        ) : (
          <>
            <View style={styles.badgeRow}>
              <View style={styles.badge}>
                <MaterialIcons name="bolt" size={14} color={themeColors.secondary} />
                <Text style={styles.badgeText}>Validação Segura 2FA</Text>
              </View>
            </View>

            <Text style={styles.inputLabel}>Código de 6 dígitos</Text>
            <View style={styles.codeBox}>
              <TextInput
                style={[styles.codeInput, { outlineStyle: 'none' } as any]}
                value={code}
                onChangeText={(text) => setCode(formatDigitsOnly(text, 6))}
                onSubmitEditing={handleVerify}
                onKeyPress={(e: any) => blockNonDigitKeyPress(e, handleVerify)}
                returnKeyType="done"
                placeholder="000000"
                placeholderTextColor={themeColors.outline}
                keyboardType="numeric"
                maxLength={6}
                autoFocus
              />
            </View>

            <TouchableOpacity
              style={styles.verifyBtn}
              onPress={handleVerify}
              disabled={isVerifying}
            >
              <MaterialIcons name="check-circle" size={20} color="#ffffff" />
              <Text style={styles.verifyBtnText}>
                {isVerifying ? 'Validando...' : 'Confirmar e Acessar'}
              </Text>
            </TouchableOpacity>

            <View style={styles.timerRow}>
              {countdown > 0 ? (
                <Text style={styles.timerText}>
                  Reenviar código em <Text style={{ fontWeight: '700' }}>{countdown}s</Text>
                </Text>
              ) : (
                <TouchableOpacity onPress={handleSendCode}>
                  <Text style={styles.resendLink}>
                    Reenviar código por {channel === 'sms' ? 'SMS' : 'WhatsApp'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}
      </View>

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
  card: {
    backgroundColor: themeColors.surfaceContainerLowest,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginTop: 12,
    shadowColor: themeColors.onSurface,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: themeColors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: themeColors.onSurface,
    marginBottom: 6,
    textAlign: 'center',
  },
  desc: {
    fontSize: 12,
    color: themeColors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 14,
    paddingHorizontal: 10,
  },
  badgeRow: {
    marginBottom: 18,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: themeColors.secondaryContainer,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: themeColors.onSecondaryContainer,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: themeColors.outline,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  fieldLabel: {
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  phoneBox: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: themeColors.surfaceContainerLow,
    borderRadius: 16,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  phoneInput: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: themeColors.onSurface,
  },
  channelList: {
    width: '100%',
    gap: 10,
    marginBottom: 20,
  },
  channelOption: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: themeColors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: 14,
    padding: 14,
  },
  channelOptionSelected: {
    borderColor: themeColors.primary,
    backgroundColor: themeColors.surfaceContainerHigh,
  },
  channelText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: themeColors.onSurface,
  },
  codeBox: {
    width: '100%',
    backgroundColor: themeColors.surfaceContainerLow,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  codeInput: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 10,
    color: themeColors.primary,
    textAlign: 'center',
  },
  verifyBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: themeColors.primaryContainer,
    height: 52,
    borderRadius: 16,
    shadowColor: themeColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  verifyBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  timerRow: {
    marginTop: 18,
  },
  timerText: {
    fontSize: 12,
    color: themeColors.outline,
  },
  resendLink: {
    fontSize: 12,
    fontWeight: '700',
    color: themeColors.primary,
  },
  qrPairingBox: {
    width: '100%',
    marginTop: 18,
    padding: 16,
    borderRadius: 16,
    backgroundColor: themeColors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: themeColors.outlineVariant,
    alignItems: 'center',
    gap: 6,
  },
  qrPairingTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: themeColors.onSurface,
    textAlign: 'center',
  },
  qrPairingSub: {
    fontSize: 12,
    lineHeight: 18,
    color: themeColors.onSurfaceVariant,
    textAlign: 'center',
  },
});
