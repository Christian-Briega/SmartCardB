import React, { useEffect } from 'react';
import { Platform, View, StyleSheet, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppProvider, useApp } from './src/context/AppContext';
import { Header } from './src/components/Header';
import { BottomNav } from './src/components/BottomNav';
import { DesktopSidebar } from './src/components/DesktopSidebar';
import { DesktopTopBar } from './src/components/DesktopTopBar';

// Global Modals & Dialogs
import { QRCodeModal } from './src/components/QRCodeModal';
import { StatementModal } from './src/components/StatementModal';
import { NewCardModal } from './src/components/NewCardModal';
import { NotificationsModal } from './src/components/NotificationsModal';
import { ConfirmDialogModal } from './src/components/ConfirmDialogModal';
import { SuccessReceiptModal } from './src/components/SuccessReceiptModal';
import { ProofUploadModal } from './src/components/ProofUploadModal';
import { AddPaymentCardModal } from './src/components/AddPaymentCardModal';
import { LiveChatModal } from './src/components/LiveChatModal';
import { TermsPrivacyModal } from './src/components/TermsPrivacyModal';
import { NetworkStatusModal } from './src/components/NetworkStatusModal';
import { AppNotificationModal } from './src/components/AppNotificationModal';
import { AppLoadingModal } from './src/components/AppLoadingModal';
import { SocialAuthModal } from './src/components/SocialAuthModal';

// Screens
import { HomeScreen } from './src/screens/HomeScreen';
import { CardsScreen } from './src/screens/CardsScreen';
import { RechargeScreen } from './src/screens/RechargeScreen';
import { TransferScreen } from './src/screens/TransferScreen';
import { AutoRechargeScreen } from './src/screens/AutoRechargeScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { WelcomeScreen } from './src/screens/WelcomeScreen';
import { RegisterScreen } from './src/screens/RegisterScreen';
import { ForgotPasswordScreen } from './src/screens/ForgotPasswordScreen';
import { BiometricsEnrollScreen } from './src/screens/BiometricsEnrollScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { SecuritySettingsScreen } from './src/screens/SecuritySettingsScreen';
import { HelpSupportScreen } from './src/screens/HelpSupportScreen';
import { PassSelectionScreen } from './src/screens/PassSelectionScreen';
import { MobilityServicesScreen } from './src/screens/MobilityServicesScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { Colors, DarkColors } from './src/theme/colors';

const SCREEN_TITLES: Record<string, string> = {
  home: 'Visão Geral & Catraca',
  cards: 'Meus Cartões & Passes',
  recharge: 'Recarga de Saldo (Pix Mercado Pago)',
  transfer: 'Transferência de Saldo',
  autoRecharge: 'Recarga Automática Inteligente',
  login: 'Entrar no SmartCard BUS',
  welcome: 'Bem-vindo ao SmartCard BUS',
  register: 'Criar Conta Digital',
  forgotPassword: 'Recuperar Senha',
  biometricsEnroll: 'Biometria & Face ID',
  profile: 'Minha Conta & Nível de Acesso',
  security: 'Segurança & Criptografia',
  help: 'Central de Ajuda & Atendimento',
  passSelection: 'Selecione seu Passe de Transporte',
  familyPlan: 'Plano Família Integrado',
  balanceLoan: 'Empréstimo Emergencial de Saldo',
  creditReserve: 'Reserva Programada de Crédito',
  settings: 'Configurações',
};

const MainNavigator: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 860;

  const { currentScreen, isLoggedIn, goBackScreen, isDarkMode } = useApp();
  const isDarkTheme = isDarkMode;
  const themeColors = isDarkTheme ? DarkColors : Colors;

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.body.style.backgroundColor = themeColors.surface;
      document.documentElement.style.backgroundColor = themeColors.surface;
    }
  }, [themeColors.surface]);

  // If user is logged out, show Login or Access/Registration flows
  if (!isLoggedIn) {
    let authScreenComponent = <LoginScreen />;
    if (currentScreen === 'welcome') {
      authScreenComponent = <WelcomeScreen />;
    } else if (currentScreen === 'register') {
      authScreenComponent = <RegisterScreen />;
    } else if (currentScreen === 'forgotPassword') {
      authScreenComponent = <ForgotPasswordScreen />;
    }

    return (
      <View
        style={[
          styles.root,
          {
            backgroundColor: themeColors.surface,
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
          },
        ]}
      >
        <View style={[styles.authFrame, { backgroundColor: themeColors.surface }]}>
          {authScreenComponent}
        </View>
        <TermsPrivacyModal />
        <ConfirmDialogModal />
        <AppNotificationModal />
        <SocialAuthModal />
      </View>
    );
  }

  // Logged-in screens
  const renderScreen = () => {
    switch (currentScreen) {
      case 'home':
        return <HomeScreen />;
      case 'cards':
        return <CardsScreen />;
      case 'recharge':
        return <RechargeScreen />;
      case 'transfer':
        return <TransferScreen />;
      case 'autoRecharge':
        return <AutoRechargeScreen />;
      case 'profile':
        return <ProfileScreen />;
      case 'security':
        return <SecuritySettingsScreen />;
      case 'biometricsEnroll':
        return <BiometricsEnrollScreen />;
      case 'help':
        return <HelpSupportScreen />;
      case 'passSelection':
        return <PassSelectionScreen />;
      case 'settings':
        return <SettingsScreen />;
      case 'familyPlan':
      case 'balanceLoan':
      case 'creditReserve':
        return <MobilityServicesScreen />;
      default:
        return <HomeScreen />;
    }
  };

  const isSubScreen = currentScreen !== 'home';

  const handleBack = () => {
    if (
      currentScreen === 'security' ||
      currentScreen === 'biometricsEnroll' ||
      currentScreen === 'help' ||
      currentScreen === 'settings'
    ) {
      goBackScreen('profile');
    } else {
      goBackScreen('home');
    }
  };

  const hideBottomNav =
    currentScreen === 'security' ||
    currentScreen === 'biometricsEnroll' ||
    currentScreen === 'help' ||
    currentScreen === 'settings' ||
    currentScreen === 'passSelection' ||
    currentScreen === 'familyPlan' ||
    currentScreen === 'balanceLoan' ||
    currentScreen === 'creditReserve';

  // Desktop Responsive Layout
  if (isDesktop) {
    return (
      <View
        style={[
          styles.desktopRoot,
          {
            backgroundColor: themeColors.surface,
          },
        ]}
      >
        {/* Left Sidebar */}
        <DesktopSidebar />

        {/* Right Main Viewport */}
        <View style={[styles.desktopMain, { backgroundColor: themeColors.surface }]}>
          <DesktopTopBar title={SCREEN_TITLES[currentScreen] || 'SmartCard BUS'} />

          <View style={[styles.desktopViewport, { backgroundColor: themeColors.surface }]}>
            <View style={[styles.desktopFrame, { backgroundColor: themeColors.surface }]}>
              {renderScreen()}
            </View>
          </View>
        </View>

        {/* Global Interactive Modals & Dialogs */}
        <QRCodeModal />
        <StatementModal />
        <NewCardModal />
        <NotificationsModal />
        <ConfirmDialogModal />
        <SuccessReceiptModal />
        <ProofUploadModal />
        <AddPaymentCardModal />
        <LiveChatModal />
        <TermsPrivacyModal />
        <NetworkStatusModal />
        <AppNotificationModal />
        <SocialAuthModal />
      </View>
    );
  }

  // Mobile / Tablet View
  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: themeColors.surface,
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      {/* Top Header */}
      <Header
        title={SCREEN_TITLES[currentScreen] || 'SmartCard BUS'}
        showBack={isSubScreen && currentScreen !== 'passSelection'}
        onBack={handleBack}
      />

      {/* Screen Body */}
      <View style={[styles.content, { backgroundColor: themeColors.surface }]}>
        <View style={[styles.screenFrame, { backgroundColor: themeColors.surface }]}>
          {renderScreen()}
        </View>
      </View>

      {/* Persistent Bottom Nav */}
      {!hideBottomNav && <BottomNav />}

      {/* Global Interactive Modals & Dialogs */}
      <QRCodeModal />
      <StatementModal />
      <NewCardModal />
      <NotificationsModal />
      <ConfirmDialogModal />
      <SuccessReceiptModal />
      <ProofUploadModal />
      <AddPaymentCardModal />
      <LiveChatModal />
      <TermsPrivacyModal />
      <NetworkStatusModal />
      <AppNotificationModal />
      <SocialAuthModal />
    </View>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <AppStatusBar />
        <MainNavigator />
        <AppLoadingModal />
      </AppProvider>
    </SafeAreaProvider>
  );
}

const AppStatusBar: React.FC = () => {
  const { isDarkMode } = useApp();
  return <StatusBar style={isDarkMode ? 'light' : 'dark'} />;
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: '100%',
    backgroundColor: Colors.surface,
  },
  content: {
    flex: 1,
    width: '100%',
    backgroundColor: Colors.surface,
  },
  screenFrame: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
  },
  authFrame: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
  },
  desktopRoot: {
    flex: 1,
    flexDirection: 'row',
    height: '100%',
    width: '100%',
    overflow: 'hidden',
  },
  desktopMain: {
    flex: 1,
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  desktopViewport: {
    flex: 1,
    width: '100%',
  },
  desktopFrame: {
    flex: 1,
    width: '100%',
    maxWidth: 1280,
    alignSelf: 'center',
  },
});
