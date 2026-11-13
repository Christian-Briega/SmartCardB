import React from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { Colors, DarkColors } from '../theme/colors';
import { SmartCardLogo } from '../components/SmartCardLogo';
import { InteractiveButton } from '../components/InteractiveButton';

const firstSteps = [
  {
    icon: 'person-add' as const,
    title: 'Crie sua conta segura',
    description: 'Cadastre seus dados para começar com segurança.',
  },
  {
    icon: 'credit-card' as const,
    title: 'Adicione seu passe',
    description: 'Organize seus cartões de transporte em um só lugar.',
  },
  {
    icon: 'bolt' as const,
    title: 'Faça uma recarga',
    description: 'Adicione saldo via Pix na hora e acompanhe suas viagens pelo app.',
  },
];

const mobilityFeatures = [
  {
    icon: 'credit-card' as const,
    title: 'Cartão Virtual e Físico',
    description: 'Crie passes virtuais na hora ou cadastre seus cartões físicos.',
  },
  {
    icon: 'autorenew' as const,
    title: 'Recarga Automática',
    description: 'Programe recargas por data fixa ou por saldo mínimo.',
  },
  {
    icon: 'swap-horiz' as const,
    title: 'Transferência de Saldo',
    description: 'Transfira créditos rapidamente entre seus cartões ou para outros.',
  },
];

export const WelcomeScreen: React.FC = () => {
  const { setCurrentScreen, isDarkMode } = useApp();
  const { width } = useWindowDimensions();
  const isCompactMobile = width < 600;
  const themeColors = isDarkMode ? DarkColors : Colors;
  const styles = createStyles(themeColors, isCompactMobile);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.page}>
        {/* Brand Logo (Original Logo) */}
        <View style={styles.brandWrapper}>
          <SmartCardLogo size="large" isDarkMode={isDarkMode} />
        </View>

        {/* Intro */}
        <View style={styles.intro}>
          <Text style={styles.eyebrow}>SEU DIA A DIA EM MOVIMENTO</Text>
          <Text style={styles.title}>Bem-vindo ao SmartCard BUS</Text>
          <Text style={styles.subtitle}>
            Mais praticidade para cuidar dos seus passes, recargas e viagens.
          </Text>
        </View>

        {/* Steps */}
        <View style={styles.stepsSection}>
          <Text style={styles.sectionTitle}>Seus primeiros passos</Text>
          <View style={styles.stepsList}>
            {firstSteps.map((step, index) => (
              <View key={step.title} style={styles.stepRow}>
                <View style={styles.stepIcon}>
                  <MaterialIcons name={step.icon} size={22} color="#0044CC" />
                </View>
                <View style={styles.stepCopy}>
                  <Text style={styles.stepTitle}>
                    <Text style={styles.stepNumber}>0{index + 1} </Text>
                    {step.title}
                  </Text>
                  <Text style={styles.stepDescription}>{step.description}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Features Grid */}
        <View style={styles.featuresSection}>
          <Text style={styles.sectionTitle}>Mais possibilidades para sua mobilidade</Text>
          <Text style={styles.featuresSubtitle}>
            Conheça recursos criados para facilitar o planejamento das suas viagens.
          </Text>
          <View style={styles.featuresList}>
            {mobilityFeatures.map((feature) => (
              <View key={feature.title} style={styles.featureCard}>
                <View style={styles.featureIcon}>
                  <MaterialIcons name={feature.icon} size={22} color="#0044CC" />
                </View>
                <View style={styles.featureCopy}>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureDescription}>{feature.description}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* CTA Buttons */}
        <View style={styles.actions}>
          <InteractiveButton
            style={styles.primaryButton}
            onPress={() => setCurrentScreen('login')}
          >
            <View style={styles.primaryButtonContent}>
              <Text style={styles.primaryButtonText}>Acessar</Text>
              <MaterialIcons name="arrow-forward" size={20} color="#ffffff" />
            </View>
          </InteractiveButton>

          <InteractiveButton
            style={styles.secondaryButton}
            onPress={() => setCurrentScreen('register')}
          >
            <View style={styles.secondaryButtonContent}>
              <Text style={styles.secondaryButtonText}>Criar Nova Conta Grátis</Text>
            </View>
          </InteractiveButton>
        </View>
      </View>
    </ScrollView>
  );
};

const createStyles = (themeColors: typeof Colors, isCompactMobile: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      width: '100%',
      backgroundColor: themeColors.surface,
    },
    content: {
      flexGrow: 1,
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 24,
    },
    page: {
      width: '100%',
      maxWidth: 640,
      alignSelf: 'center',
    },
    brandWrapper: {
      alignItems: 'center',
      marginBottom: 16,
    },
    intro: {
      width: '100%',
      alignItems: 'center',
      marginBottom: 20,
    },
    eyebrow: {
      marginBottom: 6,
      color: themeColors.secondary,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 1,
      textAlign: 'center',
    },
    title: {
      width: '100%',
      color: themeColors.onSurface,
      fontSize: isCompactMobile ? 25 : 28,
      lineHeight: isCompactMobile ? 31 : 34,
      fontWeight: '800',
      textAlign: 'center',
    },
    subtitle: {
      width: '100%',
      marginTop: 6,
      color: themeColors.onSurfaceVariant,
      fontSize: 14,
      lineHeight: 20,
      textAlign: 'center',
    },
    stepsSection: {
      width: '100%',
      marginBottom: 20,
    },
    sectionTitle: {
      marginBottom: 12,
      color: themeColors.onSurface,
      fontSize: 16,
      fontWeight: '700',
      textAlign: 'center',
    },
    stepsList: {
      width: '100%',
      gap: 10,
    },
    stepRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      width: '100%',
      backgroundColor: themeColors.surfaceContainerLowest,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: themeColors.surfaceContainerHigh,
    },
    stepIcon: {
      width: 42,
      height: 42,
      borderRadius: 12,
      backgroundColor: themeColors.surfaceContainerHigh,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepCopy: {
      flex: 1,
    },
    stepTitle: {
      color: themeColors.onSurface,
      fontSize: 14,
      fontWeight: '700',
    },
    stepNumber: {
      color: '#0044CC',
      fontWeight: '800',
    },
    stepDescription: {
      marginTop: 2,
      color: themeColors.onSurfaceVariant,
      fontSize: 12,
      lineHeight: 17,
    },
    featuresSection: {
      width: '100%',
      marginBottom: 20,
      alignItems: 'center',
    },
    featuresSubtitle: {
      width: '100%',
      marginTop: -6,
      marginBottom: 12,
      color: themeColors.onSurfaceVariant,
      fontSize: 12,
      lineHeight: 17,
      textAlign: 'center',
    },
    featuresList: {
      width: '100%',
      flexDirection: isCompactMobile ? 'column' : 'row',
      alignItems: 'stretch',
      justifyContent: 'space-between',
      gap: 10,
    },
    featureCard: {
      flex: isCompactMobile ? undefined : 1,
      alignSelf: 'stretch',
      width: isCompactMobile ? '100%' : undefined,
      flexDirection: isCompactMobile ? 'row' : 'column',
      alignItems: 'center',
      gap: isCompactMobile ? 12 : 0,
      paddingVertical: 14,
      paddingHorizontal: 14,
      borderRadius: 14,
      backgroundColor: themeColors.surfaceContainerLowest,
      borderWidth: 1,
      borderColor: themeColors.surfaceContainerHigh,
    },
    featureIcon: {
      width: 42,
      height: 42,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 12,
      backgroundColor: themeColors.surfaceContainerHigh,
      marginBottom: isCompactMobile ? 0 : 10,
    },
    featureCopy: {
      flex: 1,
      width: isCompactMobile ? undefined : '100%',
      alignItems: isCompactMobile ? 'flex-start' : 'center',
    },
    featureTitle: {
      color: themeColors.onSurface,
      fontSize: 13,
      fontWeight: '700',
      textAlign: isCompactMobile ? 'left' : 'center',
      marginBottom: 4,
    },
    featureDescription: {
      color: themeColors.onSurfaceVariant,
      fontSize: 11.5,
      lineHeight: 16,
      textAlign: isCompactMobile ? 'left' : 'center',
    },
    actions: {
      gap: 10,
      width: '100%',
      alignSelf: 'center',
    },
    primaryButton: {
      width: '100%',
      minHeight: 50,
      borderRadius: 14,
      backgroundColor: '#0044CC',
      justifyContent: 'center',
      paddingHorizontal: 16,
    },
    primaryButtonContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      width: '100%',
    },
    primaryButtonText: {
      color: '#ffffff',
      fontSize: 15,
      fontWeight: '700',
    },
    secondaryButton: {
      width: '100%',
      minHeight: 50,
      borderRadius: 14,
      backgroundColor: '#FFFFFF',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: '#0044CC',
      paddingHorizontal: 16,
    },
    secondaryButtonContent: {
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
    },
    secondaryButtonText: {
      color: '#0044CC',
      fontSize: 14,
      fontWeight: '700',
    },
  });
