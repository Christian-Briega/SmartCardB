import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { Colors, DarkColors, Spacing } from '../theme/colors';
import { useApp } from '../context/AppContext';

interface DesktopTopBarProps {
  title: string;
}

export const DesktopTopBar: React.FC<DesktopTopBarProps> = ({ title }) => {
  const { user, notifications, setNotificationsModalOpen, setCurrentScreen, isDarkMode } =
    useApp();
  const themeColors = isDarkMode ? DarkColors : Colors;
  const styles = createStyles(themeColors);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const displayName = user.name ? user.name.split(' ')[0] : 'Passageiro';
  const userRole = user.role === 'admin' ? 'Administrador' : user.role === 'operator' ? 'Fiscal de Catraca' : 'Passageiro Verificado';

  return (
    <View style={styles.topBar}>
      <View style={styles.breadcrumbArea}>
        <Text style={styles.breadcrumbRoot}>SmartCard BUS</Text>
        <MaterialIcons name="chevron-right" size={18} color={themeColors.outline} />
        <Text style={styles.breadcrumbCurrent}>{title}</Text>
      </View>

      <View style={styles.actionsArea}>
        {/* Security SSL/TLS Badge */}
        <View style={styles.securityBadge}>
          <View style={styles.securityDot} />
          <MaterialIcons name="lock" size={14} color="#00BA88" />
          <Text style={styles.securityText}>TLS 1.3 • Conexão Segura</Text>
        </View>

        {/* Notifications Icon Button */}
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => setNotificationsModalOpen(true)}
          accessibilityLabel="Notificações e Avisos"
        >
          <MaterialIcons
            name="notifications-none"
            size={22}
            color={themeColors.onSurfaceVariant}
          />
          {unreadCount > 0 && (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* User Profile Pill */}
        <TouchableOpacity
          style={styles.userProfilePill}
          onPress={() => setCurrentScreen('profile')}
          activeOpacity={0.8}
          accessibilityLabel="Perfil e Acessos"
        >
          {user.avatarUri ? (
            <ExpoImage
              source={{ uri: user.avatarUri }}
              style={styles.avatar}
              contentFit="cover"
              cachePolicy="disk"
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <MaterialIcons name="person" size={20} color="#0047FF" />
            </View>
          )}
          <View style={styles.userInfo}>
            <Text style={styles.userName} numberOfLines={1}>
              {displayName}
            </Text>
            <View style={styles.roleTag}>
              <MaterialIcons name="verified" size={11} color="#00BA88" />
              <Text style={styles.roleText}>{userRole}</Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const createStyles = (themeColors: typeof Colors) =>
  StyleSheet.create({
    topBar: {
      height: 68,
      paddingHorizontal: Spacing.lg,
      backgroundColor: themeColors.surfaceContainerLowest,
      borderBottomWidth: 1,
      borderBottomColor: themeColors.surfaceContainerHigh,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    breadcrumbArea: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    breadcrumbRoot: {
      fontSize: 13,
      fontWeight: '600',
      color: themeColors.outline,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    breadcrumbCurrent: {
      fontSize: 15,
      fontWeight: '700',
      color: themeColors.onSurface,
    },
    actionsArea: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
    },
    securityBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: 'rgba(0, 186, 136, 0.08)',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 100,
      borderWidth: 1,
      borderColor: 'rgba(0, 186, 136, 0.25)',
    },
    securityDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#00BA88',
    },
    securityText: {
      fontSize: 11,
      fontWeight: '600',
      color: '#00BA88',
      letterSpacing: 0.2,
    },
    iconButton: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: themeColors.surfaceContainerLow,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      borderWidth: 1,
      borderColor: themeColors.surfaceContainerHigh,
    },
    notificationBadge: {
      position: 'absolute',
      top: 6,
      right: 6,
      backgroundColor: themeColors.error,
      minWidth: 16,
      height: 16,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
    },
    notificationBadgeText: {
      color: '#ffffff',
      fontSize: 10,
      fontWeight: '700',
    },
    userProfilePill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 4,
      paddingLeft: 4,
      paddingRight: 12,
      borderRadius: 100,
      backgroundColor: themeColors.surfaceContainerLow,
      borderWidth: 1,
      borderColor: themeColors.surfaceContainerHigh,
    },
    avatar: {
      width: 34,
      height: 34,
      borderRadius: 17,
    },
    avatarPlaceholder: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: 'rgba(0, 71, 255, 0.12)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    userInfo: {
      justifyContent: 'center',
    },
    userName: {
      fontSize: 13,
      fontWeight: '700',
      color: themeColors.onSurface,
      maxWidth: 120,
    },
    roleTag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
    },
    roleText: {
      fontSize: 10,
      fontWeight: '600',
      color: '#00BA88',
    },
  });

