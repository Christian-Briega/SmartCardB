import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, DarkColors, Spacing } from '../theme/colors';
import { useApp } from '../context/AppContext';

export const SecuritySettingsScreen: React.FC = () => {
  const { user, updateUser, resetPasswordAsync, goBackScreen, isDarkMode, showNotification } = useApp();
  const themeColors = isDarkMode ? DarkColors : Colors;
  const styles = createStyles(themeColors);

  const [twoFactor, setTwoFactor] = useState(user.twoFactorEnabled);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPassword) {
      showNotification('Atenção', 'Informe sua senha atual.', 'error');
      return;
    }
    if (newPassword.length < 8 || !/\d/.test(newPassword) || !/[A-Z]/.test(newPassword)) {
      showNotification(
        'Requisitos de Senha',
        'A nova senha deve ter no mínimo 8 dígitos, 1 número e 1 letra maiúscula.',
        'error'
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      showNotification('Senhas Diferentes', 'A confirmação não confere com a nova senha.', 'error');
      return;
    }

    const identifier = user.email || user.cpf;
    if (identifier) {
      await resetPasswordAsync(identifier, newPassword);
    }

    showNotification('Senha Atualizada', 'Sua senha foi alterada e sincronizada com o banco de dados.', 'success');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleToggle2FA = (val: boolean) => {
    setTwoFactor(val);
    updateUser({ twoFactorEnabled: val });
    showNotification(
      'Autenticação em 2 Etapas',
      val
        ? '2FA Ativado! Exigirá confirmação por SMS/WhatsApp em novos logins.'
        : '2FA Desativado.',
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
        <Text style={styles.topBarTitle}>Segurança da Conta</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Two Factor Auth Box */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconBox, { backgroundColor: themeColors.secondaryContainer }]}>
            <MaterialIcons name="security" size={22} color={themeColors.secondary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Autenticação em 2 Etapas (2FA)</Text>
            <Text style={styles.cardSub}>Proteção extra para transferência e recarga</Text>
          </View>
          <Switch
            value={twoFactor}
            onValueChange={handleToggle2FA}
            trackColor={{ false: '#cbd5e1', true: themeColors.secondaryContainer }}
            thumbColor={twoFactor ? themeColors.secondary : '#ffffff'}
          />
        </View>
      </View>

      {/* Change Password Box */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconBox, { backgroundColor: themeColors.surfaceContainerHigh }]}>
            <MaterialIcons name="lock-outline" size={22} color={themeColors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Alterar Senha de Acesso</Text>
            <Text style={styles.cardSub}>Atualize regularmente sua senha</Text>
          </View>
        </View>

        <Text style={styles.label}>Senha Atual</Text>
        <View style={styles.inputBox}>
          <TextInput
            style={[styles.input, { outlineStyle: 'none' } as any]}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            onSubmitEditing={handleChangePassword}
            placeholder="Digite sua senha atual"
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

        <Text style={styles.label}>Nova Senha</Text>
        <View style={styles.inputBox}>
          <TextInput
            style={[styles.input, { outlineStyle: 'none' } as any]}
            value={newPassword}
            onChangeText={setNewPassword}
            onSubmitEditing={handleChangePassword}
            placeholder="Mínimo 8 dígitos"
            placeholderTextColor={themeColors.outline}
            secureTextEntry={!showPassword}
          />
        </View>

        <Text style={styles.label}>Confirmar Nova Senha</Text>
        <View style={styles.inputBox}>
          <TextInput
            style={[styles.input, { outlineStyle: 'none' } as any]}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            onSubmitEditing={handleChangePassword}
            placeholder="Repita a nova senha"
            placeholderTextColor={themeColors.outline}
            secureTextEntry={!showPassword}
          />
        </View>

        <TouchableOpacity style={styles.btnSave} onPress={handleChangePassword}>
          <MaterialIcons name="check" size={18} color="#ffffff" />
          <Text style={styles.btnSaveText}>Atualizar Senha</Text>
        </TouchableOpacity>
      </View>

      {/* Active Sessions */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconBox, { backgroundColor: themeColors.surfaceContainerHigh }]}>
            <MaterialIcons name="devices" size={22} color={themeColors.onSurface} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Dispositivos Conectados</Text>
            <Text style={styles.cardSub}>1 sessão ativa no momento</Text>
          </View>
        </View>

        <View style={styles.deviceRow}>
          <MaterialIcons
            name={Platform.OS === 'web' ? 'computer' : 'smartphone'}
            size={24}
            color={themeColors.secondary}
          />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.deviceName}>
              {Platform.OS === 'web' ? 'Este Computador (Navegador Web)' : 'Este Dispositivo Móvel'}
            </Text>
            <Text style={styles.deviceSub}>Sessão autenticada • Conectado agora</Text>
          </View>
          <View style={styles.currentBadge}>
            <Text style={styles.currentBadgeText}>Atual</Text>
          </View>
        </View>
      </View>
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
};

const createStyles = (themeColors: typeof Colors) => StyleSheet.create({
  container: {
    flex: 1,
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
    fontSize: 16,
    fontWeight: '700',
    color: themeColors.onSurface,
  },
  card: {
    backgroundColor: themeColors.surfaceContainerLowest,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: themeColors.surfaceContainerHigh,
    shadowColor: themeColors.onSurface,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: themeColors.onSurface,
  },
  cardSub: {
    fontSize: 11,
    color: themeColors.onSurfaceVariant,
    marginTop: 1,
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
  },
  input: {
    flex: 1,
    fontSize: 13,
    color: themeColors.onSurface,
  },
  btnSave: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: themeColors.primaryContainer,
    height: 48,
    borderRadius: 14,
    marginTop: 16,
  },
  btnSaveText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeColors.surfaceContainerLow,
    padding: 12,
    borderRadius: 14,
    marginTop: 4,
  },
  deviceName: {
    fontSize: 13,
    fontWeight: '600',
    color: themeColors.onSurface,
  },
  deviceSub: {
    fontSize: 11,
    color: themeColors.outline,
    marginTop: 1,
  },
  currentBadge: {
    backgroundColor: themeColors.secondaryContainer,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  currentBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: themeColors.onSecondaryContainer,
  },
});
