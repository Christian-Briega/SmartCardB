import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { Colors, DarkColors, Spacing } from '../theme/colors';
import { useApp } from '../context/AppContext';
import { SmartCardLogo } from './SmartCardLogo';

interface HeaderProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ title, showBack, onBack }) => {
  const { user, setNotificationsModalOpen, notifications, setCurrentScreen, isDarkMode } = useApp();
  const themeColors = isDarkMode ? DarkColors : Colors;
  const styles = createStyles(themeColors);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.leftSection}>
          {showBack ? (
            <>
              <TouchableOpacity style={styles.iconButton} onPress={onBack}>
                <MaterialIcons name="arrow-back" size={24} color={themeColors.onSurface} />
              </TouchableOpacity>
              <View style={styles.titleContainer}>
                <Text style={styles.titleText}>{title}</Text>
              </View>
            </>
          ) : (
            <SmartCardLogo size="small" isDarkMode={isDarkMode} />
          )}
        </View>

        <View style={styles.rightSection}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => setNotificationsModalOpen(true)}
            accessibilityLabel="Avisos e Notificações"
          >
            <MaterialIcons name="notifications-none" size={24} color={themeColors.onSurfaceVariant} />
            {unreadCount > 0 && (
              <View style={styles.notificationDot}>
                <Text style={styles.notificationCountText}>{unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.avatarButton}
            onPress={() => setCurrentScreen('profile')}
            accessibilityLabel="Minha Conta & Segurança"
          >
            {user.avatarUri ? (
              <ExpoImage
                source={{ uri: user.avatarUri }}
                style={styles.avatarImage}
                contentFit="cover"
                cachePolicy="disk"
              />
            ) : (
              <MaterialIcons name="person" size={22} color={themeColors.primary} />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const createStyles = (themeColors: typeof Colors) => StyleSheet.create({
  container: {
    minHeight: 64,
    justifyContent: 'center',
    paddingHorizontal: Spacing.margin,
    backgroundColor: themeColors.surfaceContainerLowest,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.surfaceContainerHigh,
  },
  content: {
    width: '100%',
    maxWidth: 1200,
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    alignSelf: 'center',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  logoBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: themeColors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: themeColors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  titleContainer: {
    flex: 1,
  },
  titleText: {
    fontSize: 18,
    fontWeight: '700',
    color: themeColors.onSurface,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notificationDot: {
    position: 'absolute',
    top: 6,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: themeColors.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  notificationCountText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
  },
  avatarButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: themeColors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: themeColors.surfaceContainerHigh,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
});
