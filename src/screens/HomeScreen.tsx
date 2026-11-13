import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Colors, DarkColors, Spacing } from '../theme/colors';
import { useApp } from '../context/AppContext';
import { InteractiveButton } from '../components/InteractiveButton';
import { HomeCardSkeleton } from '../components/SkeletonLoader';

export const HomeScreen: React.FC = () => {
  const {
    user,
    autoRecharge,
    cards,
    selectedCard,
    transactions,
    transitLines,
    setCurrentScreen,
    setQrModalOpen,
    setStatementModalOpen,
    setNetworkModalOpen,
    isDarkMode,
  } = useApp();

  const { width } = useWindowDimensions();
  const isDesktop = width >= 860;

  const themeColors = isDarkMode ? DarkColors : Colors;
  const styles = createStyles(themeColors, isDesktop);

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 800);
  };

  const greetingName = user.name ? user.name.split(' ')[0] : 'Passageiro';

  // Left Column Content: Card + Quick Actions
  const renderCardAndActions = () => (
    <View style={styles.cardSection}>
      {/* Dynamic Micro-Status Bar */}
      <View style={styles.statusBar}>
        <View style={styles.statusLeft}>
          <View style={styles.greetingRow}>
            <Text style={styles.greetingText}>Olá, {greetingName}</Text>
            <View style={styles.verifiedChip}>
              <MaterialIcons name="verified" size={14} color="#00BA88" />
              <Text style={styles.verifiedText}>CONTA ATIVA</Text>
            </View>
          </View>
          <View style={styles.locationRow}>
            <View style={styles.onlineDot} />
            <Text style={styles.locationText}>Rede Metropolitana • Operação Regular</Text>
          </View>
        </View>
      </View>

      {/* Transit Pass Card with Microchip & NFC or Skeleton */}
      {isRefreshing ? (
        <HomeCardSkeleton isDarkMode={isDarkMode} />
      ) : selectedCard ? (
        <View style={styles.heroCardContainer}>
          <View style={[styles.heroCardClip, { backgroundColor: selectedCard.colors[0] }]}>
            <LinearGradient
              colors={selectedCard.colors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroCard}
            >
              <BlurView
                intensity={Platform.OS === 'ios' ? 40 : 65}
                tint={isDarkMode ? 'dark' : 'light'}
                style={styles.glassInnerCard}
              >
                <View style={styles.cardWatermark}>
                  <MaterialIcons name="contactless" size={140} color="rgba(255,255,255,0.08)" />
                </View>

                {/* Card Header */}
                <View style={styles.cardTopRow}>
                  <View style={styles.cardTitleBox}>
                    {/* Visual Microchip */}
                    <View style={styles.microchip}>
                      <View style={styles.microchipLine} />
                      <View style={styles.microchipLine} />
                    </View>
                    <View>
                      <Text style={styles.cardTagText}>{selectedCard.tag}</Text>
                      <Text style={styles.cardMainTitle}>{selectedCard.title}</Text>
                    </View>
                  </View>

                  <View style={styles.nfcTag}>
                    <MaterialIcons name="contactless" size={14} color="#FFFFFF" />
                    <Text style={[styles.nfcTagText, { color: '#FFFFFF' }]}>NFC ATIVO</Text>
                  </View>
                </View>

                {/* Balance Display */}
                <View style={styles.balanceSection}>
                  <Text style={styles.balanceLabel}>SALDO DISPONÍVEL</Text>
                  <View style={styles.balanceRow}>
                    <Text style={styles.balanceValue}>
                      R$ {selectedCard.balance.toFixed(2).replace('.', ',')}
                    </Text>
                    <View style={styles.ridesBadge}>
                      <Text style={styles.ridesBadgeText}>~{selectedCard.ridesCount} viagens</Text>
                    </View>
                  </View>
                </View>

                {/* Card Footer with Catraca QR Button */}
                <View style={styles.cardBottomRow}>
                  <View>
                    <Text style={styles.cardNumberLabel}>IDENTIFICADOR</Text>
                    <Text style={styles.cardNumberValue}>
                      {selectedCard.number ? `•••• ${selectedCard.number}` : '•••• 8839'}
                    </Text>
                  </View>
                  <InteractiveButton
                    style={styles.qrButton}
                    onPress={() => setQrModalOpen(true)}
                    accessibilityLabel="Abrir QR Code da Catraca"
                  >
                    <View style={styles.qrButtonContent}>
                      <MaterialIcons name="qr-code-scanner" size={17} color="#0047FF" />
                      <Text style={styles.qrButtonText}>CATRACA QR</Text>
                    </View>
                  </InteractiveButton>
                </View>
              </BlurView>
            </LinearGradient>
          </View>
        </View>
      ) : (
        <View style={styles.emptyPassCard}>
          <MaterialIcons name="directions-bus" size={36} color={themeColors.primary} />
          <Text style={styles.emptyPassTitle}>
            {cards.length === 0 ? 'Nenhum passe vinculado' : 'Selecione um passe'}
          </Text>
          <Text style={styles.emptyPassDesc}>
            {cards.length === 0
              ? 'Vincule seu passe de transporte para consultar saldo, efetuar recargas via Pix e liberar a catraca.'
              : 'Escolha um passe cadastrado para visualizar viagens e realizar operações.'}
          </Text>
          <TouchableOpacity
            style={styles.emptyPassButton}
            onPress={() => setCurrentScreen('cards')}
          >
            <Text style={styles.emptyPassButtonText}>
              {cards.length === 0 ? 'Vincular Passe' : 'Escolher Passe'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Quick Action Buttons Grid */}
      <View style={styles.quickActionsGrid}>
        <InteractiveButton
          style={styles.actionBtnWrapper}
          onPress={() => setCurrentScreen('recharge')}
        >
          <View style={styles.actionBtn}>
            <View style={styles.actionTopPill}>
              <Text style={styles.actionTopPillText}>Pix</Text>
            </View>
            <View style={[styles.actionIconBox, { backgroundColor: '#0047FF' }]}>
              <MaterialIcons name="add-card" size={22} color="#ffffff" />
            </View>
            <Text style={styles.actionLabel}>Recarregar</Text>
          </View>
        </InteractiveButton>

        <InteractiveButton
          style={styles.actionBtnWrapper}
          onPress={() => setCurrentScreen('transfer')}
        >
          <View style={styles.actionBtn}>
            <View
              style={[
                styles.actionIconBox,
                { backgroundColor: themeColors.surfaceContainerLow },
              ]}
            >
              <MaterialIcons name="swap-horiz" size={22} color={themeColors.primary} />
            </View>
            <Text style={styles.actionLabel}>Transferir</Text>
          </View>
        </InteractiveButton>

        <InteractiveButton
          style={styles.actionBtnWrapper}
          onPress={() => setCurrentScreen('autoRecharge')}
        >
          <View style={styles.actionBtn}>
            {autoRecharge.enabled && <View style={styles.activeDotPulse} />}
            <View
              style={[
                styles.actionIconBox,
                { backgroundColor: themeColors.secondaryContainer },
              ]}
            >
              <MaterialIcons
                name="autorenew"
                size={22}
                color={themeColors.onSecondaryContainer}
              />
            </View>
            <Text style={styles.actionLabel}>Auto-Recarga</Text>
          </View>
        </InteractiveButton>

        <InteractiveButton
          style={styles.actionBtnWrapper}
          onPress={() => setStatementModalOpen(true)}
        >
          <View style={styles.actionBtn}>
            <View
              style={[
                styles.actionIconBox,
                { backgroundColor: themeColors.surfaceContainerLow },
              ]}
            >
              <MaterialIcons
                name="receipt-long"
                size={22}
                color={themeColors.onSurfaceVariant}
              />
            </View>
            <Text style={styles.actionLabel}>Extrato</Text>
          </View>
        </InteractiveButton>
      </View>
    </View>
  );

  // Right Column Content: Services, Network Status, Recent Trips
  const renderServicesAndActivity = () => (
    <View style={styles.servicesSection}>
      {/* Real-Time Transit Network Status */}
      <View style={styles.transitStatusCard}>
        <View style={styles.transitHeader}>
          <View style={styles.transitHeaderLeft}>
            <View style={styles.livePulseDot} />
            <Text style={styles.transitTitle}>Status da Malha Metroferroviária & Ônibus</Text>
          </View>
          <TouchableOpacity onPress={() => setNetworkModalOpen(true)}>
            <Text style={styles.transitReportLink}>Ver Detalhes</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.linesPillsScroll}
          activeOpacity={0.8}
          onPress={() => setNetworkModalOpen(true)}
        >
          {transitLines.length === 0 ? (
            <Text style={styles.noTransitInfo}>Todas as linhas operando normalmente.</Text>
          ) : (
            transitLines.map((line) => (
              <View key={line.id} style={styles.linePill}>
                <View style={[styles.lineDot, { backgroundColor: line.color }]} />
                <Text style={styles.linePillText}>{line.code}</Text>
                <MaterialIcons name="check-circle" size={13} color="#00BA88" />
              </View>
            ))
          )}
        </TouchableOpacity>
      </View>

      {/* Mobility Services */}
      <View style={styles.featuresSection}>
        <Text style={styles.sectionTitle}>Serviços de Mobilidade</Text>
        <Text style={styles.featuresSubtitle}>
          Facilidades digitais para planejar viagens e gerenciar sua família.
        </Text>
        <View style={styles.featuresGrid}>
          <TouchableOpacity
            style={styles.featureCard}
            activeOpacity={0.8}
            onPress={() => setCurrentScreen('balanceLoan')}
          >
            <View
              style={[
                styles.featureIcon,
                { backgroundColor: 'rgba(0, 71, 255, 0.1)' },
              ]}
            >
              <MaterialIcons name="account-balance-wallet" size={20} color="#0047FF" />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Empréstimo de Saldo</Text>
              <Text style={styles.featureDescription}>
                Crédito emergencial de até R$ 50 para você não ficar a pé.
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.featureCard}
            activeOpacity={0.8}
            onPress={() => setCurrentScreen('familyPlan')}
          >
            <View
              style={[
                styles.featureIcon,
                { backgroundColor: 'rgba(0, 186, 136, 0.1)' },
              ]}
            >
              <MaterialIcons name="family-restroom" size={20} color="#00BA88" />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Plano Família</Text>
              <Text style={styles.featureDescription}>
                Conecte até 5 dependentes e compartilhe saldo em tempo real.
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.featureCard}
            activeOpacity={0.8}
            onPress={() => setCurrentScreen('creditReserve')}
          >
            <View
              style={[
                styles.featureIcon,
                { backgroundColor: 'rgba(245, 158, 11, 0.1)' },
              ]}
            >
              <MaterialIcons name="savings" size={20} color="#F59E0B" />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Reserva Programada</Text>
              <Text style={styles.featureDescription}>
                Agende créditos mensais com desconto tarifário garantido.
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Recent Activity Section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Últimas Viagens & Recargas</Text>
        <TouchableOpacity onPress={() => setStatementModalOpen(true)}>
          <Text style={styles.seeAllText}>Histórico Completo</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.recentList}>
        {transactions.length === 0 ? (
          <Text style={styles.noTransactions}>
            Ainda não há viagens ou recargas registradas nesta conta.
          </Text>
        ) : (
          transactions.slice(0, 4).map((tx) => {
            const isPositive = tx.amount > 0;
            return (
              <TouchableOpacity
                key={tx.id}
                style={styles.recentItem}
                activeOpacity={0.8}
                onPress={() => setStatementModalOpen(true)}
              >
                <View
                  style={[
                    styles.recentIconBox,
                    isPositive ? styles.recentPositive : styles.recentNegative,
                  ]}
                >
                  <MaterialIcons
                    name={
                      tx.type === 'trip'
                        ? 'directions-bus'
                        : tx.type === 'recharge'
                          ? 'bolt'
                          : 'swap-horiz'
                    }
                    size={18}
                    color={isPositive ? '#00BA88' : '#0047FF'}
                  />
                </View>

                <View style={styles.recentInfo}>
                  <Text style={styles.recentTitle}>{tx.title}</Text>
                  <Text style={styles.recentSubtitle}>{tx.subtitle}</Text>
                </View>

                <View style={styles.recentAmountBox}>
                  <Text
                    style={[
                      styles.recentAmount,
                      isPositive ? styles.recentAmtPositive : styles.recentAmtNegative,
                    ]}
                  >
                    {isPositive ? '+' : ''}R${' '}
                    {Math.abs(tx.amount).toFixed(2).replace('.', ',')}
                  </Text>
                  <Text style={styles.recentTime}>{tx.date}</Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </View>
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor={themeColors.primary}
          colors={[themeColors.primary]}
        />
      }
    >
      <View style={styles.content}>
        {isDesktop ? (
          <View style={styles.dashboardGrid}>
            <View style={styles.dashboardLeftCol}>{renderCardAndActions()}</View>
            <View style={styles.dashboardRightCol}>{renderServicesAndActivity()}</View>
          </View>
        ) : (
          <View style={styles.mobileColumn}>
            {renderCardAndActions()}
            {renderServicesAndActivity()}
          </View>
        )}
      </View>
      <View style={{ height: 32 }} />
    </ScrollView>
  );
};

const createStyles = (themeColors: typeof Colors, isDesktop: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: themeColors.surface,
    },
    scrollContent: {
      paddingHorizontal: isDesktop ? Spacing.xl : Spacing.margin,
      paddingTop: isDesktop ? Spacing.md : Spacing.xs,
    },
    content: {
      width: '100%',
      maxWidth: 1200,
      alignSelf: 'center',
    },
    dashboardGrid: {
      flexDirection: 'row',
      gap: 28,
      alignItems: 'flex-start',
    },
    dashboardLeftCol: {
      flex: 1.1,
    },
    dashboardRightCol: {
      flex: 1.2,
    },
    mobileColumn: {
      width: '100%',
    },
    cardSection: {
      width: '100%',
    },
    servicesSection: {
      width: '100%',
    },
    statusBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      marginBottom: 8,
    },
    statusLeft: {
      flex: 1,
    },
    greetingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    greetingText: {
      fontSize: 22,
      fontWeight: '800',
      color: themeColors.onSurface,
      letterSpacing: -0.3,
    },
    verifiedChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: 'rgba(0, 186, 136, 0.1)',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 100,
      borderWidth: 1,
      borderColor: 'rgba(0, 186, 136, 0.25)',
    },
    verifiedText: {
      fontSize: 10,
      fontWeight: '700',
      color: '#00BA88',
      letterSpacing: 0.4,
    },
    locationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 4,
    },
    onlineDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#00BA88',
    },
    locationText: {
      fontSize: 12,
      fontWeight: '500',
      color: themeColors.onSurfaceVariant,
    },
    heroCardContainer: {
      width: '100%',
      marginBottom: 20,
      borderRadius: 22,
      shadowColor: '#0047FF',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.18,
      shadowRadius: 20,
      elevation: 8,
    },
    heroCardClip: {
      borderRadius: 22,
      overflow: 'hidden',
    },
    heroCard: {
      borderRadius: 22,
      position: 'relative',
      overflow: 'hidden',
    },
    glassInnerCard: {
      padding: 22,
      width: '100%',
      position: 'relative',
    },
    cardWatermark: {
      position: 'absolute',
      right: -10,
      bottom: -15,
    },
    cardTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 22,
    },
    cardTitleBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    microchip: {
      width: 32,
      height: 24,
      borderRadius: 4,
      backgroundColor: 'rgba(255, 215, 0, 0.35)',
      borderWidth: 1,
      borderColor: 'rgba(255, 215, 0, 0.6)',
      padding: 3,
      justifyContent: 'space-around',
    },
    microchipLine: {
      height: 1,
      backgroundColor: 'rgba(255, 215, 0, 0.8)',
      width: '100%',
    },
    cardTagText: {
      fontSize: 10,
      color: '#DDE7FF',
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 1.2,
    },
    cardMainTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    nfcTag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: 'rgba(255, 255, 255, 0.15)',
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    nfcTagText: {
      fontSize: 9,
      fontWeight: '800',
      color: '#FFFFFF',
      letterSpacing: 0.5,
    },
    balanceSection: {
      marginBottom: 22,
    },
    balanceLabel: {
      fontSize: 10,
      fontWeight: '700',
      color: 'rgba(255, 255, 255, 0.75)',
      letterSpacing: 1.2,
      marginBottom: 4,
    },
    balanceRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 10,
    },
    balanceValue: {
      fontSize: 36,
      fontWeight: '900',
      color: '#FFFFFF',
      letterSpacing: -0.5,
    },
    ridesBadge: {
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: 12,
    },
    ridesBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    cardBottomRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      borderTopWidth: 1,
      borderTopColor: 'rgba(255, 255, 255, 0.15)',
      paddingTop: 14,
    },
    cardNumberLabel: {
      fontSize: 9,
      fontWeight: '700',
      color: 'rgba(255, 255, 255, 0.65)',
      letterSpacing: 0.5,
    },
    cardNumberValue: {
      fontSize: 14,
      fontWeight: '800',
      color: '#FFFFFF',
      letterSpacing: 1.5,
      marginTop: 2,
    },
    qrButton: {
      backgroundColor: '#FFFFFF',
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 14,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.12,
      shadowRadius: 6,
    },
    qrButtonContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    qrButtonText: {
      fontSize: 11,
      fontWeight: '800',
      color: '#0047FF',
      letterSpacing: 0.5,
    },
    emptyPassCard: {
      alignItems: 'center',
      backgroundColor: themeColors.surfaceContainerLowest,
      borderRadius: 22,
      padding: 24,
      marginBottom: 20,
      gap: 10,
      borderWidth: 1,
      borderColor: themeColors.surfaceContainerHigh,
    },
    emptyPassTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: themeColors.onSurface,
    },
    emptyPassDesc: {
      fontSize: 13,
      color: themeColors.onSurfaceVariant,
      textAlign: 'center',
      lineHeight: 19,
    },
    emptyPassButton: {
      backgroundColor: '#0047FF',
      paddingHorizontal: 20,
      paddingVertical: 11,
      borderRadius: 12,
      marginTop: 6,
    },
    emptyPassButtonText: {
      color: '#FFFFFF',
      fontWeight: '700',
      fontSize: 13,
    },
    quickActionsGrid: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 10,
      marginBottom: 22,
    },
    actionBtnWrapper: {
      flex: 1,
    },
    actionBtn: {
      width: '100%',
      alignItems: 'center',
      backgroundColor: themeColors.surfaceContainerLowest,
      borderRadius: 16,
      paddingVertical: 14,
      borderWidth: 1,
      borderColor: themeColors.surfaceContainerHigh,
      position: 'relative',
    },
    actionTopPill: {
      position: 'absolute',
      top: -6,
      backgroundColor: '#00BA88',
      paddingHorizontal: 7,
      paddingVertical: 1,
      borderRadius: 6,
    },
    actionTopPillText: {
      color: '#FFFFFF',
      fontSize: 8,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    activeDotPulse: {
      position: 'absolute',
      top: 8,
      right: 10,
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: '#00BA88',
    },
    actionIconBox: {
      width: 44,
      height: 44,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    actionLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: themeColors.onSurface,
    },
    transitStatusCard: {
      backgroundColor: themeColors.surfaceContainerLowest,
      borderRadius: 18,
      padding: 16,
      marginBottom: 18,
      borderWidth: 1,
      borderColor: themeColors.surfaceContainerHigh,
    },
    transitHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    transitHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    livePulseDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#00BA88',
    },
    transitTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: themeColors.onSurface,
    },
    transitReportLink: {
      fontSize: 12,
      fontWeight: '600',
      color: '#0047FF',
    },
    linesPillsScroll: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    noTransitInfo: {
      fontSize: 12,
      color: themeColors.onSurfaceVariant,
    },
    linePill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: themeColors.surfaceContainerLow,
      paddingHorizontal: 9,
      paddingVertical: 6,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: themeColors.surfaceContainerHigh,
    },
    lineDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
    },
    linePillText: {
      fontSize: 11,
      fontWeight: '700',
      color: themeColors.onSurface,
    },
    featuresSection: {
      marginBottom: 20,
    },
    featuresSubtitle: {
      fontSize: 12,
      color: themeColors.onSurfaceVariant,
      lineHeight: 18,
      marginTop: 2,
      marginBottom: 12,
    },
    featuresGrid: {
      gap: 10,
    },
    featureCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      padding: 14,
      borderRadius: 16,
      backgroundColor: themeColors.surfaceContainerLowest,
      borderWidth: 1,
      borderColor: themeColors.surfaceContainerHigh,
    },
    featureIcon: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 12,
    },
    featureText: {
      flex: 1,
    },
    featureTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: themeColors.onSurface,
      marginBottom: 2,
    },
    featureDescription: {
      fontSize: 11,
      color: themeColors.onSurfaceVariant,
      lineHeight: 16,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: themeColors.onSurface,
    },
    seeAllText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#0047FF',
    },
    recentList: {
      backgroundColor: themeColors.surfaceContainerLowest,
      borderRadius: 18,
      paddingHorizontal: 16,
      paddingVertical: 4,
      borderWidth: 1,
      borderColor: themeColors.surfaceContainerHigh,
    },
    noTransactions: {
      paddingVertical: 20,
      fontSize: 12,
      textAlign: 'center',
      color: themeColors.onSurfaceVariant,
    },
    recentItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: themeColors.surfaceContainerLow,
    },
    recentIconBox: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    recentPositive: {
      backgroundColor: 'rgba(0, 186, 136, 0.1)',
    },
    recentNegative: {
      backgroundColor: 'rgba(0, 71, 255, 0.08)',
    },
    recentInfo: {
      flex: 1,
    },
    recentTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: themeColors.onSurface,
    },
    recentSubtitle: {
      fontSize: 11,
      color: themeColors.onSurfaceVariant,
      marginTop: 1,
    },
    recentAmountBox: {
      alignItems: 'flex-end',
    },
    recentAmount: {
      fontSize: 13,
      fontWeight: '800',
    },
    recentAmtPositive: {
      color: '#00BA88',
    },
    recentAmtNegative: {
      color: themeColors.onSurface,
    },
    recentTime: {
      fontSize: 10,
      color: themeColors.outline,
      marginTop: 2,
    },
  });
