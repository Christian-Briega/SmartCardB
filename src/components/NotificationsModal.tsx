import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, DarkColors } from '../theme/colors';
import { useApp } from '../context/AppContext';

export const NotificationsModal: React.FC = () => {
  const {isNotificationsModalOpen,
    setNotificationsModalOpen,
    notifications,
    markNotificationAsRead,
    isDarkMode,
  } = useApp();
  const themeColors = isDarkMode ? DarkColors : Colors;
  const styles = createStyles(themeColors);

  if (!isNotificationsModalOpen) return null;

  return (
    <Modal
      visible={isNotificationsModalOpen}
      transparent
      animationType="slide"
      onRequestClose={() => setNotificationsModalOpen(false)}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Avisos & Notificações</Text>
              <Text style={styles.subtitle}>
                Status da malha de transporte e atualizações da conta
              </Text>
            </View>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setNotificationsModalOpen(false)}
            >
              <MaterialIcons name="close" size={22} color={themeColors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {notifications.length === 0 ? (
              <View style={styles.emptyBox}>
                <MaterialIcons name="notifications-off" size={40} color={themeColors.outline} />
                <Text style={styles.emptyText}>Nenhuma notificação nova no momento.</Text>
              </View>
            ) : (
              notifications.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.item, !item.read && styles.itemUnread]}
                  activeOpacity={0.7}
                  onPress={() => markNotificationAsRead(item.id)}
                >
                  <View
                    style={[
                      styles.iconCircle,
                      item.type === 'transit'
                        ? styles.iconTransit
                        : item.type === 'recharge'
                        ? styles.iconRecharge
                        : styles.iconSecurity,
                    ]}
                  >
                    <MaterialIcons
                      name={
                        item.icon === 'school'
                          ? 'school'
                          : item.icon === 'bolt'
                          ? 'bolt'
                          : item.icon === 'security'
                          ? 'security'
                          : 'directions-subway'
                      }
                      size={20}
                      color={
                        item.type === 'transit'
                          ? themeColors.primary
                          : item.type === 'recharge'
                          ? themeColors.secondary
                          : themeColors.tertiary
                      }
                    />
                  </View>

                  <View style={styles.itemContent}>
                    <View style={styles.itemTopRow}>
                      <Text style={[styles.itemTitle, !item.read && styles.itemTitleUnread]}>
                        {item.title}
                      </Text>
                      <Text style={styles.itemTime}>{item.time}</Text>
                    </View>
                    <Text style={styles.itemMessage}>{item.message}</Text>
                  </View>

                  {!item.read && <View style={styles.unreadDot} />}
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (themeColors: typeof Colors) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(19, 27, 46, 0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: themeColors.surfaceContainerLowest,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    maxHeight: '80%',
    minHeight: 400,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: themeColors.outlineVariant,
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: themeColors.onSurface,
  },
  subtitle: {
    fontSize: 12,
    color: themeColors.onSurfaceVariant,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: themeColors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    flex: 1,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    color: themeColors.outline,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
    backgroundColor: themeColors.surfaceContainerLow,
    gap: 12,
  },
  itemUnread: {
    backgroundColor: themeColors.surfaceContainerHigh,
    borderLeftWidth: 3,
    borderLeftColor: themeColors.primaryContainer,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconTransit: {
    backgroundColor: themeColors.surfaceContainerHighest,
  },
  iconRecharge: {
    backgroundColor: themeColors.secondaryContainer,
  },
  iconSecurity: {
    backgroundColor: themeColors.tertiaryFixed,
  },
  itemContent: {
    flex: 1,
  },
  itemTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: themeColors.onSurface,
  },
  itemTitleUnread: {
    fontWeight: '700',
  },
  itemTime: {
    fontSize: 10,
    color: themeColors.outline,
  },
  itemMessage: {
    fontSize: 12,
    color: themeColors.onSurfaceVariant,
    lineHeight: 16,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: themeColors.primary,
    alignSelf: 'center',
  },
});
