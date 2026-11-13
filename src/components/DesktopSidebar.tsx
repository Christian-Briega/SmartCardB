import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image as ExpoImage } from 'expo-image';
import { Colors, DarkColors } from '../theme/colors';
import { useApp } from '../context/AppContext';
import { ScreenType } from '../types';
import { SmartCardLogo } from './SmartCardLogo';
import { InteractiveButton } from './InteractiveButton';

interface NavMenuItem {
  key: ScreenType;
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  badge?: string;
}

const MENU_ITEMS: NavMenuItem[] = [
  { key: 'home', label: 'Visão Geral', icon: 'dashboard' },
  { key: 'cards', label: 'Meus Cartões', icon: 'credit-card' },
  { key: 'recharge', label: 'Recarga Pix', icon: 'add-card', badge: 'Mercado Pago' },
  { key: 'transfer', label: 'Transferência', icon: 'swap-horiz' },
  { key: 'autoRecharge', label: 'Recarga Automática', icon: 'autorenew' },
  { key: 'profile', label: 'Minha Conta', icon: 'person-outline' },
  { key: 'settings', label: 'Configurações', icon: 'settings' },
  { key: 'security', label: 'Segurança & Biometria', icon: 'security' },
  { key: 'help', label: 'Ajuda & Suporte', icon: 'support-agent' },
];

export const DesktopSidebar: React.FC = () => {
  const {
    currentScreen,
    setCurrentScreen,
    setQrModalOpen,
    user,
    logout,
    isDarkMode,
  } = useApp();

  const themeColors = isDarkMode ? DarkColors : Colors;
  const styles = createStyles(themeColors);

  return (
    <View style={styles.sidebar}>
      {/* Brand Header */}
      <View style={styles.brandContainer}>
        <SmartCardLogo size="medium" isDarkMode={isDarkMode} />
      </View>

      {/* Catraca QR Primary CTA */}
      <View style={styles.qrCtaContainer}>
        <InteractiveButton
          style={styles.qrButton}
          onPress={() => setQrModalOpen(true)}
          accessibilityLabel="Abrir QR Code da Catraca"
        >
          <LinearGradient
            colors={['#0047FF', '#002EAA', '#001D6E']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.qrGradient}
          >
            <View style={styles.qrContent}>
              <View style={styles.qrIconBadge}>
                <MaterialIcons name="qr-code-scanner" size={20} color="#FFFFFF" />
              </View>
              <View>
                <Text style={styles.qrTitle}>Catraca QR</Text>
                <Text style={styles.qrSubtitle}>Liberação de Embarque</Text>
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={20} color="#ffffff" />
          </LinearGradient>
        </InteractiveButton>
      </View>

      {/* Nav Menu Items */}
      <View style={styles.menuContainer}>
        <Text style={styles.sectionHeader}>NAVEGAÇÃO</Text>
        {MENU_ITEMS.map((item) => {
          const isActive = currentScreen === item.key;
          return (
            <TouchableOpacity
              key={item.key}
              style={[styles.menuItem, isActive && styles.menuItemActive]}
              onPress={() => setCurrentScreen(item.key)}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconBox, isActive && styles.menuIconBoxActive]}>
                <MaterialIcons
                  name={item.icon}
                  size={20}
                  color={isActive ? '#0047FF' : themeColors.onSurfaceVariant}
                />
              </View>
              <Text style={[styles.menuText, isActive && styles.menuTextActive]}>
                {item.label}
              </Text>
              {item.badge && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.badge}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* User Footer Profile */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.userRow}
          activeOpacity={0.8}
          onPress={() => setCurrentScreen('profile')}
        >
          <View style={styles.avatarWrapper}>
            {user.avatarUri ? (
              <ExpoImage source={{ uri: user.avatarUri }} style={styles.avatarImage} />
            ) : (
              <MaterialIcons name="person" size={22} color={themeColors.primary} />
            )}
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName} numberOfLines={1}>
              {user.name || 'Passageiro'}
            </Text>
            <Text style={styles.userCpf} numberOfLines={1}>
              {user.cpf ? `CPF: ${user.cpf}` : 'Sessão Segura'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const createStyles = (themeColors: typeof Colors) =>
  StyleSheet.create({
    sidebar: {
      width: 280,
      height: '100%',
      backgroundColor: themeColors.surfaceContainerLowest,
      borderRightWidth: 1,
      borderRightColor: themeColors.surfaceContainerHigh,
      paddingVertical: 20,
      paddingHorizontal: 16,
      justifyContent: 'space-between',
    },
    brandContainer: {
      paddingBottom: 20,
      paddingHorizontal: 4,
      borderBottomWidth: 1,
      borderBottomColor: themeColors.surfaceContainerHigh,
    },
    qrCtaContainer: {
      marginVertical: 14,
    },
    qrButton: {
      borderRadius: 16,
      overflow: 'hidden',
      shadowColor: '#0047FF',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    qrGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.25)',
    },
    qrContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    qrIconBadge: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: 'rgba(0, 240, 255, 0.15)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    qrTitle: {
      color: '#ffffff',
      fontSize: 13,
      fontWeight: '800',
      letterSpacing: -0.2,
    },
    qrSubtitle: {
      color: 'rgba(255, 255, 255, 0.75)',
      fontSize: 9.5,
      fontWeight: '600',
    },
    menuContainer: {
      flex: 1,
      gap: 4,
      paddingTop: 6,
    },
    sectionHeader: {
      fontSize: 10,
      fontWeight: '800',
      color: themeColors.outline,
      letterSpacing: 1,
      marginBottom: 8,
      paddingHorizontal: 8,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 12,
    },
    menuItemActive: {
      backgroundColor: themeColors.surfaceContainerHigh,
    },
    menuIconBox: {
      width: 32,
      height: 32,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    menuIconBoxActive: {
      backgroundColor: 'rgba(0, 71, 255, 0.12)',
    },
    menuText: {
      fontSize: 13,
      fontWeight: '600',
      color: themeColors.onSurfaceVariant,
      flex: 1,
    },
    menuTextActive: {
      color: themeColors.onSurface,
      fontWeight: '800',
    },
    badge: {
      backgroundColor: '#00D68F',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
    },
    badgeText: {
      color: '#06281E',
      fontSize: 8.5,
      fontWeight: '900',
    },
    footer: {
      borderTopWidth: 1,
      borderTopColor: themeColors.surfaceContainerHigh,
      paddingTop: 16,
      gap: 12,
    },
    userRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    avatarWrapper: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: themeColors.surfaceContainerHigh,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      borderWidth: 1.5,
      borderColor: themeColors.primary,
    },
    avatarImage: {
      width: '100%',
      height: '100%',
    },
    userInfo: {
      flex: 1,
    },
    userName: {
      fontSize: 13,
      fontWeight: '700',
      color: themeColors.onSurface,
    },
    userCpf: {
      fontSize: 10,
      color: themeColors.onSurfaceVariant,
      marginTop: 1,
    },
    logoutBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 8,
      paddingHorizontal: 8,
      borderRadius: 8,
    },
    logoutText: {
      fontSize: 12,
      fontWeight: '700',
      color: themeColors.error,
    },
  });

