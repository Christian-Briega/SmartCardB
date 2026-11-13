import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, DarkColors, Spacing } from '../theme/colors';
import { useApp } from '../context/AppContext';

interface FaqItem {
  q: string;
  a: string;
}

const FAQS: FaqItem[] = [
  {
    q: 'Quanto tempo demora para a recarga cair no passe?',
    a: 'Recargas via Pix Instantâneo e Cartão de Crédito são creditadas em menos de 10 segundos diretamente na catraca e no aplicativo.',
  },
  {
    q: 'Como utilizo o celular para passar na catraca?',
    a: 'Você pode abrir o botão "CATRACA QR" na tela inicial e apontar para o leitor ótico da catraca, ou aproximar a traseira do smartphone caso seu aparelho tenha NFC ativo.',
  },
  {
    q: 'O que fazer se eu perder meu cartão físico?',
    a: 'Acesse a aba "Passes", selecione o cartão e clique em "Bloquear". Seu saldo fica 100% protegido e pode ser transferido imediatamente para outro passe digital.',
  },
  {
    q: 'Como funciona o desconto de 50% do Passe Estudante?',
    a: 'O Passe Estudante concede benefício de meia-tarifa nas linhas metropolitanas e cotas mensais após envio e validação do comprovante escolar.',
  },
];

export const HelpSupportScreen: React.FC = () => {
  const { goBackScreen, setChatModalOpen, isDarkMode } = useApp();
  const themeColors = isDarkMode ? DarkColors : Colors;
  const styles = createStyles(themeColors);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

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
        <Text style={styles.topBarTitle}>Ajuda & Atendimento</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Support Hero Box */}
      <View style={styles.heroCard}>
        <View style={styles.iconCircle}>
          <MaterialIcons name="support-agent" size={32} color={themeColors.primary} />
        </View>
        <Text style={styles.heroTitle}>Como podemos te ajudar?</Text>
        <Text style={styles.heroSubtitle}>
          Tire dúvidas frequentes sobre catracas, saldos e linhas metropolitanas com nosso assistente 24h.
        </Text>

        <TouchableOpacity
          style={styles.chatBtn}
          onPress={() => setChatModalOpen(true)}
          activeOpacity={0.85}
        >
          <MaterialIcons name="chat" size={18} color="#ffffff" />
          <Text style={styles.chatBtnText}>Falar com Suporte (24h)</Text>
        </TouchableOpacity>
      </View>

      {/* FAQ Accordion */}
      <Text style={styles.sectionTitle}>DÚVIDAS FREQUENTES</Text>
      <View style={styles.faqList}>
        {FAQS.map((faq, idx) => {
          const isOpen = expandedIndex === idx;
          return (
            <TouchableOpacity
              key={idx}
              style={styles.faqCard}
              activeOpacity={0.8}
              onPress={() => setExpandedIndex(isOpen ? null : idx)}
            >
              <View style={styles.faqQuestionRow}>
                <Text style={styles.faqQuestion}>{faq.q}</Text>
                <MaterialIcons
                  name={isOpen ? 'expand-less' : 'expand-more'}
                  size={22}
                  color={themeColors.primary}
                />
              </View>
              {isOpen && <Text style={styles.faqAnswer}>{faq.a}</Text>}
            </TouchableOpacity>
          );
        })}
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
  heroCard: {
    backgroundColor: themeColors.surfaceContainerLowest,
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: themeColors.surfaceContainerHigh,
    shadowColor: themeColors.onSurface,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: themeColors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: themeColors.onSurface,
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 12,
    color: themeColors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
    paddingHorizontal: 10,
  },
  chatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: themeColors.primaryContainer,
    paddingHorizontal: 20,
    height: 46,
    borderRadius: 14,
    shadowColor: themeColors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  chatBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: themeColors.outline,
    letterSpacing: 0.6,
    marginBottom: 10,
    marginLeft: 4,
  },
  faqList: {
    gap: 10,
  },
  faqCard: {
    backgroundColor: themeColors.surfaceContainerLowest,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: themeColors.surfaceContainerHigh,
    shadowColor: themeColors.onSurface,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  faqQuestionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestion: {
    fontSize: 13,
    fontWeight: '700',
    color: themeColors.onSurface,
    flex: 1,
    paddingRight: 8,
  },
  faqAnswer: {
    fontSize: 12,
    color: themeColors.onSurfaceVariant,
    lineHeight: 18,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: themeColors.surfaceContainerHigh,
  },
});
