import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, DarkColors, Spacing } from '../theme/colors';
import { useApp } from '../context/AppContext';
import { InteractiveButton } from '../components/InteractiveButton';
import { mercadoPagoService } from '../services/mercadoPagoService';

export const SettingsScreen: React.FC = () => {
  const {
    user,
    updateUser,
    isDarkMode,
    toggleTheme,
    goBackScreen,
    setCurrentScreen,
    openSocialAuthModal,
    unlinkSocialAccount,
    setTermsModalOpen,
    setPrivacyModalOpen,
    deleteAccountAsync,
    showNotification,
  } = useApp();

  const themeColors = isDarkMode ? DarkColors : Colors;
  const styles = createStyles(themeColors);
  const [mpTokenInput, setMpTokenInput] = useState(mercadoPagoService.getActiveAccessToken());
  const [isDeleteFormOpen, setIsDeleteFormOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const handleConfirmDeleteAccount = async () => {
    if (!deletePassword.trim()) {
      showNotification(
        'Senha Obrigatória',
        'Digite a senha da sua conta para confirmar a inativação.',
        'error'
      );
      return;
    }

    setIsDeletingAccount(true);
    const result = await deleteAccountAsync(deletePassword);
    setIsDeletingAccount(false);

    if (!result.ok) {
      showNotification(
        'Não foi possível inativar a conta',
        result.error || 'Senha incorreta. Digite a senha correta da sua conta.',
        'error'
      );
      return;
    }

    setDeletePassword('');
    setIsDeleteFormOpen(false);
    showNotification(
      'Conta Inativada',
      'Sua conta foi inativada no banco de dados. Realize um novo cadastro para voltar a utilizar o app.',
      'success'
    );
  };

  const handleSaveMpToken = () => {
    mercadoPagoService.setCustomAccessToken(mpTokenInput);
    showNotification(
      'Credencial Mercado Pago Salva',
      mpTokenInput.trim()
        ? 'Seu Access Token do Mercado Pago foi ativado para cobranças Pix e Cartão.'
        : 'Modo padrão EMV / Sandbox Mercado Pago ativado.',
      'success'
    );
  };

  const handleToggleWhatsapp = (val: boolean) => {
    updateUser({ whatsappAlerts: val });
    showNotification(
      'Alertas via WhatsApp',
      val
        ? 'Você receberá avisos de saldo baixo e confirmações de recarga no WhatsApp.'
        : 'Alertas via WhatsApp desativados.',
      'info'
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
            onPress={() => goBackScreen('profile')}
          >
            <MaterialIcons name="arrow-back" size={22} color={themeColors.onSurface} />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Configurações</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Aparência (Modo Escuro oculto em Configurações) */}
        <Text style={styles.sectionHeader}>APARÊNCIA & TEMA</Text>
        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={[styles.iconBox, { backgroundColor: themeColors.surfaceContainerHigh }]}>
              <MaterialIcons
                name={isDarkMode ? 'dark-mode' : 'light-mode'}
                size={22}
                color={themeColors.primary}
              />
            </View>
            <View style={styles.settingTextBox}>
              <Text style={styles.settingTitle}>Modo Escuro</Text>
              <Text style={styles.settingSub}>
                {isDarkMode
                  ? 'Tema escuro ativado em todo o aplicativo'
                  : 'Ative para reduzir o brilho em ambientes escuros'}
              </Text>
            </View>
            <Switch
              value={isDarkMode}
              onValueChange={toggleTheme}
              trackColor={{ false: '#cbd5e1', true: themeColors.primaryContainer }}
              thumbColor="#ffffff"
            />
          </View>
        </View>

        {/* Contas Conectadas (Google & Apple) */}
        <Text style={styles.sectionHeader}>CONTAS VINCULADAS (GOOGLE & APPLE)</Text>
        <View style={styles.card}>
          {/* Google Account */}
          <View style={styles.settingRow}>
            <View style={[styles.iconBox, { backgroundColor: '#eff6ff' }]}>
              <Text style={styles.googleLetter}>G</Text>
            </View>
            <View style={styles.settingTextBox}>
              <Text style={styles.settingTitle}>Conta Google</Text>
              <Text style={styles.settingSub}>
                {user.googleAccount
                  ? `Conectado como ${user.googleAccount}`
                  : 'Não vinculada • Conecte para login rápido'}
              </Text>
            </View>
            {user.googleAccount ? (
              <TouchableOpacity
                style={styles.unlinkBtn}
                onPress={() => unlinkSocialAccount('google')}
              >
                <Text style={styles.unlinkBtnText}>Desvincular</Text>
              </TouchableOpacity>
            ) : (
              <InteractiveButton
                style={styles.linkBtn}
                onPress={() => openSocialAuthModal('google', 'link')}
              >
                <Text style={styles.linkBtnText}>Conectar</Text>
              </InteractiveButton>
            )}
          </View>

          <View style={styles.divider} />

          {/* Apple Account */}
          <View style={styles.settingRow}>
            <View style={[styles.iconBox, { backgroundColor: '#111827' }]}>
              <MaterialIcons name="apple" size={22} color="#ffffff" />
            </View>
            <View style={styles.settingTextBox}>
              <Text style={styles.settingTitle}>ID Apple</Text>
              <Text style={styles.settingSub}>
                {user.appleAccount
                  ? `Conectado como ${user.appleAccount}`
                  : 'Não vinculado • Conecte seu ID Apple'}
              </Text>
            </View>
            {user.appleAccount ? (
              <TouchableOpacity
                style={styles.unlinkBtn}
                onPress={() => unlinkSocialAccount('apple')}
              >
                <Text style={styles.unlinkBtnText}>Desvincular</Text>
              </TouchableOpacity>
            ) : (
              <InteractiveButton
                style={styles.linkBtn}
                onPress={() => openSocialAuthModal('apple', 'link')}
              >
                <Text style={styles.linkBtnText}>Conectar</Text>
              </InteractiveButton>
            )}
          </View>
        </View>

        {/* Notificações & Preferências */}
        <Text style={styles.sectionHeader}>COMUNICAÇÕES & PRIVACIDADE</Text>
        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={[styles.iconBox, { backgroundColor: themeColors.secondaryContainer }]}>
              <MaterialIcons
                name="notifications-active"
                size={20}
                color={themeColors.secondary}
              />
            </View>
            <View style={styles.settingTextBox}>
              <Text style={styles.settingTitle}>Alertas via WhatsApp</Text>
              <Text style={styles.settingSub}>
                Avisos de saldo baixo e comprovantes de recarga
              </Text>
            </View>
            <Switch
              value={user.whatsappAlerts}
              onValueChange={handleToggleWhatsapp}
              trackColor={{ false: '#cbd5e1', true: themeColors.secondaryContainer }}
              thumbColor={user.whatsappAlerts ? themeColors.secondary : '#ffffff'}
            />
          </View>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => setCurrentScreen('security')}
          >
            <View style={[styles.iconBox, { backgroundColor: themeColors.surfaceContainerHigh }]}>
              <MaterialIcons name="security" size={20} color={themeColors.primary} />
            </View>
            <View style={styles.settingTextBox}>
              <Text style={styles.settingTitle}>Segurança & Senha</Text>
              <Text style={styles.settingSub}>Gerenciar senha e verificação em duas etapas</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={themeColors.outline} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => setTermsModalOpen(true)}
          >
            <View style={[styles.iconBox, { backgroundColor: themeColors.surfaceContainerHigh }]}>
              <MaterialIcons name="description" size={20} color={themeColors.onSurfaceVariant} />
            </View>
            <View style={styles.settingTextBox}>
              <Text style={styles.settingTitle}>Termos de Uso</Text>
              <Text style={styles.settingSub}>Regras de utilização do SmartCard BUS</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={themeColors.outline} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => setPrivacyModalOpen(true)}
          >
            <View style={[styles.iconBox, { backgroundColor: themeColors.surfaceContainerHigh }]}>
              <MaterialIcons name="privacy-tip" size={20} color={themeColors.onSurfaceVariant} />
            </View>
            <View style={styles.settingTextBox}>
              <Text style={styles.settingTitle}>Política de Privacidade (LGPD)</Text>
              <Text style={styles.settingSub}>Proteção de dados e consentimento</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={themeColors.outline} />
          </TouchableOpacity>
        </View>

        {/* Integração Mercado Pago */}
        <Text style={styles.sectionHeader}>INTEGRAÇÃO MERCADO PAGO & PAGAMENTOS</Text>
        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={[styles.iconBox, { backgroundColor: 'rgba(0, 158, 227, 0.14)' }]}>
              <MaterialIcons name="payments" size={20} color="#009EE3" />
            </View>
            <View style={styles.settingTextBox}>
              <Text style={styles.settingTitle}>Gateway Oficial Mercado Pago</Text>
              <Text style={styles.settingSub}>
                Ativo para Recargas, Transferências, Auto-Recarga e Crédito Emergencial
              </Text>
            </View>
          </View>
          <View style={{ paddingBottom: 12, gap: 8 }}>
            <TextInput
              style={[
                {
                  backgroundColor: themeColors.surfaceContainerLow,
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  height: 42,
                  fontSize: 12,
                  color: themeColors.onSurface,
                },
                { outlineStyle: 'none' } as any,
              ]}
              value={mpTokenInput}
              onChangeText={setMpTokenInput}
              placeholder="Access Token Mercado Pago (Opcional: APP_USR-...)"
              placeholderTextColor={themeColors.outline}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <InteractiveButton
              style={[styles.linkBtn, { width: '100%', height: 40 }]}
              onPress={handleSaveMpToken}
            >
              <Text style={styles.linkBtnText}>Salvar Credencial Mercado Pago</Text>
            </InteractiveButton>
          </View>
        </View>

        {/* Inativação de Conta */}
        <Text style={[styles.sectionHeader, { color: themeColors.error }]}>
          ZONA DE PERIGO & INATIVAÇÃO DE CONTA
        </Text>
        <View style={[styles.card, styles.dangerCard]}>
          <View style={styles.settingRow}>
            <View style={[styles.iconBox, { backgroundColor: themeColors.errorContainer }]}>
              <MaterialIcons name="person-off" size={22} color={themeColors.error} />
            </View>
            <View style={styles.settingTextBox}>
              <Text style={[styles.settingTitle, { color: themeColors.error }]}>
                Inativar Minha Conta
              </Text>
              <Text style={styles.settingSub}>
                Inativa seu acesso no banco de dados e exige um novo cadastro para voltar a usar o app
              </Text>
            </View>
            {!isDeleteFormOpen && (
              <InteractiveButton
                style={styles.deleteTriggerBtn}
                onPress={() => setIsDeleteFormOpen(true)}
              >
                <Text style={styles.deleteTriggerBtnText}>Inativar Conta</Text>
              </InteractiveButton>
            )}
          </View>

          {isDeleteFormOpen && (
            <View style={styles.deleteConfirmBox}>
              <Text style={styles.deleteWarningText}>
                Para confirmar a inativação da sua conta (exigindo um novo cadastro para reativar o
                acesso), digite a senha atual da sua conta:
              </Text>

              <View style={styles.deletePasswordInputBox}>
                <MaterialIcons name="lock-outline" size={18} color={themeColors.outline} />
                <TextInput
                  style={[styles.deletePasswordInput, { outlineStyle: 'none' } as any]}
                  value={deletePassword}
                  onChangeText={setDeletePassword}
                  onSubmitEditing={handleConfirmDeleteAccount}
                  placeholder="Digite a senha da sua conta"
                  placeholderTextColor={themeColors.outline}
                  secureTextEntry={!showDeletePassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowDeletePassword(!showDeletePassword)}>
                  <MaterialIcons
                    name={showDeletePassword ? 'visibility-off' : 'visibility'}
                    size={18}
                    color={themeColors.outline}
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.deleteActionsRow}>
                <TouchableOpacity
                  style={styles.cancelDeleteBtn}
                  onPress={() => {
                    setIsDeleteFormOpen(false);
                    setDeletePassword('');
                  }}
                >
                  <Text style={styles.cancelDeleteBtnText}>Cancelar</Text>
                </TouchableOpacity>

                <InteractiveButton
                  style={styles.confirmDeleteBtn}
                  onPress={handleConfirmDeleteAccount}
                  disabled={isDeletingAccount}
                >
                  <View style={styles.confirmDeleteBtnContent}>
                    <MaterialIcons name="person-off" size={18} color="#ffffff" />
                    <Text style={styles.confirmDeleteBtnText}>
                      {isDeletingAccount ? 'Inativando...' : 'Confirmar Inativação'}
                    </Text>
                  </View>
                </InteractiveButton>
              </View>
            </View>
          )}
        </View>
      </View>
      <View style={{ height: 32 }} />
    </ScrollView>
  );
};

const createStyles = (themeColors: typeof Colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      width: '100%',
      backgroundColor: themeColors.surface,
    },
    scrollContent: {
      paddingHorizontal: Spacing.margin,
      paddingVertical: 12,
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
      fontSize: 17,
      fontWeight: '800',
      color: themeColors.onSurface,
    },
    sectionHeader: {
      fontSize: 11,
      fontWeight: '700',
      color: themeColors.outline,
      letterSpacing: 0.6,
      marginBottom: 8,
      marginTop: 10,
      marginLeft: 4,
    },
    card: {
      backgroundColor: themeColors.surfaceContainerLowest,
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 6,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: themeColors.surfaceContainerHigh,
    },
    settingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      gap: 12,
    },
    iconBox: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    googleLetter: {
      fontSize: 18,
      fontWeight: '900',
      color: '#2563EB',
    },
    settingTextBox: {
      flex: 1,
    },
    settingTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: themeColors.onSurface,
    },
    settingSub: {
      fontSize: 11,
      color: themeColors.onSurfaceVariant,
      marginTop: 2,
    },
    divider: {
      height: 1,
      backgroundColor: themeColors.surfaceContainerHigh,
    },
    linkBtn: {
      backgroundColor: themeColors.primaryContainer,
      paddingHorizontal: 14,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    linkBtnText: {
      color: '#ffffff',
      fontSize: 12,
      fontWeight: '700',
    },
    unlinkBtn: {
      backgroundColor: themeColors.errorContainer,
      paddingHorizontal: 12,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    unlinkBtnText: {
      color: themeColors.error,
      fontSize: 12,
      fontWeight: '700',
    },
    dangerCard: {
      borderColor: themeColors.errorContainer,
    },
    deleteTriggerBtn: {
      backgroundColor: themeColors.errorContainer,
      paddingHorizontal: 14,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    deleteTriggerBtnText: {
      color: themeColors.error,
      fontSize: 12,
      fontWeight: '700',
    },
    deleteConfirmBox: {
      borderTopWidth: 1,
      borderTopColor: themeColors.surfaceContainerHigh,
      paddingTop: 12,
      paddingBottom: 12,
      gap: 10,
    },
    deleteWarningText: {
      fontSize: 12,
      color: themeColors.onSurfaceVariant,
      lineHeight: 17,
    },
    deletePasswordInputBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: themeColors.surfaceContainerLow,
      borderRadius: 12,
      paddingHorizontal: 12,
      height: 46,
      borderWidth: 1,
      borderColor: themeColors.surfaceContainerHigh,
    },
    deletePasswordInput: {
      flex: 1,
      fontSize: 13,
      color: themeColors.onSurface,
    },
    deleteActionsRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 2,
    },
    cancelDeleteBtn: {
      flex: 1,
      height: 44,
      borderRadius: 12,
      backgroundColor: themeColors.surfaceContainerLow,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: themeColors.surfaceContainerHigh,
    },
    cancelDeleteBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: themeColors.onSurface,
    },
    confirmDeleteBtn: {
      flex: 1.4,
      height: 44,
      borderRadius: 12,
      backgroundColor: '#DC2626',
      justifyContent: 'center',
      paddingHorizontal: 14,
    },
    confirmDeleteBtnContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      width: '100%',
    },
    confirmDeleteBtnText: {
      color: '#ffffff',
      fontSize: 13,
      fontWeight: '700',
    },
  });

