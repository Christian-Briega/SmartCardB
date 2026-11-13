import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, DarkColors, Spacing } from '../theme/colors';
import { useApp } from '../context/AppContext';
import { deriveBiometricKey } from '../services/cryptoService';
import { setSecureItem, deleteSecureItem, SECURE_KEYS } from '../services/secureStorage';
import { InteractiveButton } from '../components/InteractiveButton';

export const BiometricsEnrollScreen: React.FC = () => {
  const { user, updateUser, setCurrentScreen, goBackScreen, isDarkMode, showNotification } = useApp();
  const themeColors = isDarkMode ? DarkColors : Colors;
  const styles = createStyles(themeColors);
  const [enabled, setEnabled] = useState(user.biometricsEnabled);
  const [autoOpenQr, setAutoOpenQr] = useState(false);

  const handleSave = async () => {
    updateUser({ biometricsEnabled: enabled });

    // Protocolo Anti-Gravidade: Criptografia de Chave Biométrica com expo-crypto e SecureStore
    try {
      if (enabled) {
        const bioKey = await deriveBiometricKey(user.cpf || user.email || 'user', Date.now().toString());
        await setSecureItem(SECURE_KEYS.BIOMETRIC_PUB_KEY, bioKey);
      } else {
        await deleteSecureItem(SECURE_KEYS.BIOMETRIC_PUB_KEY);
      }
    } catch (err) {
      console.warn('[Crypto] Biometric key generation error:', err);
    }

    showNotification(
      'Configuração Salva',
      enabled
        ? 'Acesso biométrico ativado no dispositivo. Você pode confirmar operações com sua digital ou Face ID.'
        : 'Biometria desativada.',
      'success',
      () => setCurrentScreen('home')
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => goBackScreen('profile')}
        >
          <MaterialIcons name="arrow-back" size={22} color={themeColors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Biometria & Face ID</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.heroCard}>
        <View style={styles.biometricCircle}>
          <MaterialIcons name="fingerprint" size={54} color={themeColors.secondary} />
        </View>

        <Text style={styles.heroTitle}>Acesso Seguro & Rápido</Text>
        <Text style={styles.heroSubtitle}>
          Entre no app e libere o QR Code da catraca em menos de 1 segundo sem precisar digitar sua senha em locais públicos.
        </Text>

        <View style={styles.tag}>
          <MaterialIcons name="shield" size={14} color={themeColors.secondary} />
          <Text style={styles.tagText}>Criptografia de Hardware do Dispositivo</Text>
        </View>
      </View>

      {/* Options List */}
      <View style={styles.optionsCard}>
        <View style={styles.optionRow}>
          <View style={styles.optionLeft}>
            <View style={[styles.optionIconBox, { backgroundColor: themeColors.secondaryContainer }]}>
              <MaterialIcons name="fingerprint" size={22} color={themeColors.secondary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.optionTitle}>Entrar com Biometria</Text>
              <Text style={styles.optionDesc}>
                Utilizar Face ID ou leitor de digitais no login
              </Text>
            </View>
          </View>
          <Switch
            value={enabled}
            onValueChange={setEnabled}
            trackColor={{ false: '#cbd5e1', true: themeColors.secondaryContainer }}
            thumbColor={enabled ? themeColors.secondary : '#ffffff'}
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.optionRow}>
          <View style={styles.optionLeft}>
            <View style={[styles.optionIconBox, { backgroundColor: themeColors.surfaceContainerHigh }]}>
              <MaterialIcons name="qr-code-scanner" size={22} color={themeColors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.optionTitle}>Validação Rápida da Catraca</Text>
              <Text style={styles.optionDesc}>
                Abrir QR Code direto com autenticação biométrica
              </Text>
            </View>
          </View>
          <Switch
            value={autoOpenQr}
            onValueChange={setAutoOpenQr}
            trackColor={{ false: '#cbd5e1', true: themeColors.secondaryContainer }}
            thumbColor={autoOpenQr ? themeColors.secondary : '#ffffff'}
          />
        </View>
      </View>

      {/* Primary CTA */}
      <InteractiveButton style={styles.saveBtn} onPress={handleSave}>
        <View style={styles.saveBtnContent}>
          <MaterialIcons name="check" size={20} color="#ffffff" />
          <Text style={styles.saveBtnText}>Salvar Preferências</Text>
        </View>
      </InteractiveButton>

      <TouchableOpacity
        style={styles.skipBtn}
        onPress={() => setCurrentScreen('home')}
      >
        <Text style={styles.skipBtnText}>Configurar depois</Text>
      </TouchableOpacity>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
};

const createStyles = (themeColors: typeof Colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.surface,
    paddingHorizontal: Spacing.margin,
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
  heroCard: {
    backgroundColor: themeColors.surfaceContainerLowest,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: themeColors.onSurface,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 16,
  },
  biometricCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: themeColors.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 3,
    borderColor: themeColors.secondaryFixed,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: themeColors.onSurface,
    marginBottom: 6,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 12,
    color: themeColors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 14,
    paddingHorizontal: 10,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: themeColors.surfaceContainerHigh,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '700',
    color: themeColors.onSurface,
  },
  optionsCard: {
    backgroundColor: themeColors.surfaceContainerLowest,
    borderRadius: 20,
    padding: 16,
    shadowColor: themeColors.onSurface,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    marginBottom: 20,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    paddingRight: 8,
  },
  optionIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: themeColors.onSurface,
  },
  optionDesc: {
    fontSize: 11,
    color: themeColors.onSurfaceVariant,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: themeColors.surfaceContainerHigh,
    marginVertical: 12,
  },
  saveBtn: {
    backgroundColor: themeColors.primaryContainer,
    height: 52,
    borderRadius: 16,
    shadowColor: themeColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    justifyContent: 'center',
  },
  saveBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: '100%',
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  skipBtnText: {
    fontSize: 13,
    color: themeColors.outline,
    fontWeight: '600',
  },
});
