import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, DarkColors } from '../theme/colors';
import { useApp } from '../context/AppContext';
import { ScreenType } from '../types';
import { InteractiveButton } from './InteractiveButton';

export const BottomNav: React.FC = () => {
  const { currentScreen, setCurrentScreen, setQrModalOpen, isDarkMode } = useApp();
  const themeColors = isDarkMode ? DarkColors : Colors;
  const styles = createStyles(themeColors);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Tab 1: Início */}
        <TouchableOpacity
          style={styles.tab}
          onPress={() => setCurrentScreen('home')}
          activeOpacity={0.7}
        >
          <View style={[styles.iconWrapper, currentScreen === 'home' && styles.activeIconWrapper]}>
            <MaterialIcons
              name="home"
              size={22}
              color={currentScreen === 'home' ? themeColors.primary : themeColors.onSurfaceVariant}
            />
          </View>
          <Text style={[styles.label, currentScreen === 'home' && styles.activeLabel]}>
            Início
          </Text>
        </TouchableOpacity>

        {/* Tab 2: Passes */}
        <TouchableOpacity
          style={styles.tab}
          onPress={() => setCurrentScreen('cards')}
          activeOpacity={0.7}
        >
          <View style={[styles.iconWrapper, currentScreen === 'cards' && styles.activeIconWrapper]}>
            <MaterialIcons
              name="credit-card"
              size={22}
              color={currentScreen === 'cards' ? themeColors.primary : themeColors.onSurfaceVariant}
            />
          </View>
          <Text style={[styles.label, currentScreen === 'cards' && styles.activeLabel]}>
            Passes
          </Text>
        </TouchableOpacity>

        {/* Central Floating Action Button: CATRACA QR */}
        <View style={styles.fabContainer}>
          <InteractiveButton
            style={styles.fabButton}
            onPress={() => setQrModalOpen(true)}
            accessibilityLabel="Abrir QR Code da Catraca"
          >
            <LinearGradient
              colors={['#003EC8', '#0D53FC']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.fabGradient}
            >
              <MaterialIcons name="qr-code-scanner" size={25} color="#FFFFFF" />
              <Text style={styles.fabLabel}>CATRACA</Text>
            </LinearGradient>
          </InteractiveButton>
        </View>

        {/* Tab 3: Recarga */}
        <TouchableOpacity
          style={styles.tab}
          onPress={() => setCurrentScreen('recharge')}
          activeOpacity={0.7}
        >
          <View style={[styles.iconWrapper, currentScreen === 'recharge' && styles.activeIconWrapper]}>
            <MaterialIcons
              name="add-card"
              size={22}
              color={currentScreen === 'recharge' ? themeColors.primary : themeColors.onSurfaceVariant}
            />
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Pix</Text>
            </View>
          </View>
          <Text style={[styles.label, currentScreen === 'recharge' && styles.activeLabel]}>
            Recarga
          </Text>
        </TouchableOpacity>

        {/* Tab 4: Transferir */}
        <TouchableOpacity
          style={styles.tab}
          onPress={() => setCurrentScreen('transfer')}
          activeOpacity={0.7}
        >
          <View style={[styles.iconWrapper, currentScreen === 'transfer' && styles.activeIconWrapper]}>
            <MaterialIcons
              name="swap-horiz"
              size={22}
              color={currentScreen === 'transfer' ? themeColors.primary : themeColors.onSurfaceVariant}
            />
          </View>
          <Text style={[styles.label, currentScreen === 'transfer' && styles.activeLabel]}>
            Transferir
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const createStyles = (themeColors: typeof Colors) => StyleSheet.create({
  container: {
    height: 72,
    alignItems: 'center',
    backgroundColor: themeColors.surfaceContainerLowest,
    borderTopWidth: 1,
    borderTopColor: themeColors.surfaceContainerHigh,
    paddingBottom: 6,
    shadowColor: themeColors.onSurface,
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 10,
    position: 'relative',
  },
  content: {
    width: '100%',
    maxWidth: 720,
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    alignSelf: 'center',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  fabContainer: {
    width: 68,
    alignItems: 'center',
    justifyContent: 'center',
    top: -14,
  },
  fabButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    shadowColor: '#0047FF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  fabGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  fabLabel: {
    color: '#ffffff',
    fontSize: 7.5,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginTop: 1,
  },
  iconWrapper: {
    width: 36,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    position: 'relative',
  },
  activeIconWrapper: {
    backgroundColor: themeColors.surfaceContainerHigh,
  },
  label: {
    fontSize: 10.5,
    fontWeight: '600',
    color: themeColors.onSurfaceVariant,
    marginTop: 2,
  },
  activeLabel: {
    color: themeColors.primary,
    fontWeight: '800',
  },
  badge: {
    position: 'absolute',
    top: -3,
    right: -6,
    backgroundColor: '#00D68F',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
  },
  badgeText: {
    color: '#06281E',
    fontSize: 8,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
});
