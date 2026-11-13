import React, { memo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Colors, DarkColors, Spacing } from '../theme/colors';
import { useApp } from '../context/AppContext';
import { CardType, PassCard } from '../types';
import { isStudentPass, PASS_TYPE_OPTIONS, PASS_TYPES } from '../utils/passTypes';
import { InteractiveButton } from '../components/InteractiveButton';

interface PassCardItemProps {
  card: PassCard;
  isSelected: boolean;
  themeColors: typeof Colors;
  isDarkMode: boolean;
  styles: any;
  onCardPress: (card: PassCard) => void;
  onBlockPress: (card: PassCard) => void;
  onSyncCorporate: (cardId: string) => void;
  onRechargePress: (cardId: string) => void;
  onQrPress: (card: PassCard) => void;
  onProofPress: () => void;
  onStatementPress: () => void;
}

const PassCardItem = memo<PassCardItemProps>(
  ({
    card,
    isSelected,
    themeColors,
    isDarkMode,
    styles,
    onCardPress,
    onBlockPress,
    onSyncCorporate,
    onRechargePress,
    onQrPress,
    onProofPress,
    onStatementPress,
  }) => {
    const cardColors = PASS_TYPE_OPTIONS[card.type]?.colors || card.colors;

    return (
      <View
        style={[
          styles.cardWrapper,
          isSelected && styles.cardWrapperSelected,
          card.isBlocked && styles.cardWrapperBlocked,
          { backgroundColor: cardColors[0] },
        ]}
      >
        <TouchableOpacity activeOpacity={0.9} onPress={() => onCardPress(card)}>
          <LinearGradient
            colors={cardColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardFace}
          >
            <BlurView
              intensity={Platform.OS === 'ios' ? 40 : 65}
              tint={isDarkMode ? 'dark' : 'light'}
              style={styles.glassCardFace}
            >
              <View style={styles.cardTopBar}>
                <View style={styles.cardTypeRow}>
                  <View style={styles.cardIconBox}>
                    <MaterialIcons
                      name={PASS_TYPE_OPTIONS[card.type]?.icon || 'directions-bus'}
                      size={18}
                      color="#ffffff"
                    />
                  </View>
                  <View>
                    <Text style={styles.cardTag}>{card.tag}</Text>
                    <Text style={styles.cardTitle}>{card.title}</Text>
                  </View>
                </View>

                {card.isBlocked ? (
                  <View style={styles.blockedBadge}>
                    <MaterialIcons name="lock" size={12} color="#ffffff" />
                    <Text style={styles.blockedBadgeText}>Bloqueado</Text>
                  </View>
                ) : (
                  <View style={styles.activeBadge}>
                    <View style={styles.activeDotSmall} />
                    <Text style={styles.activeBadgeText}>
                      {isSelected ? 'Em Uso' : 'Ativo'}
                    </Text>
                  </View>
                )}
              </View>

              {isStudentPass(card.type) ? (
                <View style={styles.estudanteGrid}>
                  <View style={styles.estudanteCol}>
                    <Text style={styles.metricLabel}>SALDO EM REAIS</Text>
                    <Text style={styles.metricValue}>
                      R$ {card.balance.toFixed(2).replace('.', ',')}
                    </Text>
                  </View>
                  <View style={styles.estudanteCol}>
                    <Text style={styles.metricLabel}>COTA MENSAL</Text>
                    <View style={styles.quotaRow}>
                      <Text style={styles.metricValue}>{card.remainingQuota ?? 44}</Text>
                      <Text style={styles.quotaSub}>cotas rest.</Text>
                    </View>
                  </View>
                </View>
              ) : (
                <View style={styles.balanceBox}>
                  <Text style={styles.balanceLabel}>SALDO ATUAL</Text>
                  <View style={styles.balanceRow}>
                    <Text style={styles.balanceText}>
                      R$ {card.balance.toFixed(2).replace('.', ',')}
                    </Text>
                    <Text style={styles.ridesSub}>~{card.ridesCount} viagens</Text>
                  </View>
                </View>
              )}

              <View style={styles.cardBottomBar}>
                <View>
                  <Text style={styles.cardDetailLabel}>TITULAR</Text>
                  <Text style={styles.cardDetailVal}>{card.holder}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.cardDetailLabel}>NÚMERO</Text>
                  <Text style={styles.cardNumberVal}>
                    •••• {card.number || '8839'}
                  </Text>
                </View>
              </View>
            </BlurView>
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.actionPanel}>
          <View style={styles.actionGrid}>
            <InteractiveButton
              style={styles.panelBtnWrapper}
              onPress={() => onRechargePress(card.id)}
            >
              <View style={styles.panelBtn}>
                <MaterialIcons name="add-circle-outline" size={20} color={themeColors.primary} />
                <Text style={styles.panelBtnText}>Recarregar</Text>
              </View>
            </InteractiveButton>

            <InteractiveButton
              style={styles.panelBtnWrapper}
              onPress={() => onQrPress(card)}
            >
              <View style={styles.panelBtn}>
                <MaterialIcons name="qr-code-scanner" size={20} color={themeColors.onSurface} />
                <Text style={styles.panelBtnText}>QR Code</Text>
              </View>
            </InteractiveButton>

            <InteractiveButton
              style={styles.panelBtnWrapper}
              onPress={() => onBlockPress(card)}
            >
              <View style={styles.panelBtn}>
                <MaterialIcons
                  name={card.isBlocked ? 'lock-open' : 'lock-outline'}
                  size={20}
                  color={card.isBlocked ? themeColors.secondary : themeColors.error}
                />
                <Text
                  style={[
                    styles.panelBtnText,
                    { color: card.isBlocked ? themeColors.secondary : themeColors.error },
                  ]}
                >
                  {card.isBlocked ? 'Desbloquear' : 'Bloquear'}
                </Text>
              </View>
            </InteractiveButton>
          </View>

          {isStudentPass(card.type) && (
            <View style={styles.extraActionsRow}>
              <InteractiveButton style={styles.extraBtnWrapper} onPress={onProofPress}>
                <View style={styles.extraBtn}>
                  <MaterialIcons name="cloud-upload" size={16} color={themeColors.primary} />
                  <Text style={styles.extraBtnText}>Renovar Comprovante</Text>
                </View>
              </InteractiveButton>

              <InteractiveButton
                style={styles.extraBtnWrapper}
                onPress={() => onRechargePress(card.id)}
              >
                <View style={[styles.extraBtn, { backgroundColor: themeColors.primaryContainer }]}>
                  <MaterialIcons name="add-shopping-cart" size={16} color="#ffffff" />
                  <Text style={[styles.extraBtnText, { color: '#ffffff' }]}>
                    Recarregar Cota
                  </Text>
                </View>
              </InteractiveButton>
            </View>
          )}

          {card.type === 'vt' && (
            <View style={styles.extraActionsRow}>
              <InteractiveButton style={styles.extraBtnWrapper} onPress={onStatementPress}>
                <View style={styles.extraBtn}>
                  <MaterialIcons name="receipt" size={16} color={themeColors.primary} />
                  <Text style={styles.extraBtnText}>Extrato Corporativo</Text>
                </View>
              </InteractiveButton>

              <InteractiveButton
                style={styles.extraBtnWrapper}
                onPress={() => onSyncCorporate(card.id)}
              >
                <View style={styles.extraBtn}>
                  <MaterialIcons name="sync" size={16} color={themeColors.secondary} />
                  <Text style={[styles.extraBtnText, { color: themeColors.secondary }]}>
                    Atualizar Saldo VT
                  </Text>
                </View>
              </InteractiveButton>
            </View>
          )}

          <View style={styles.perforatedRow}>
            <MaterialIcons name="contactless" size={14} color={themeColors.outline} />
            <Text style={styles.perforatedText}>
              Aproxime no leitor NFC ou apresente o QR da catraca
            </Text>
          </View>
        </View>
      </View>
    );
  }
);
PassCardItem.displayName = 'PassCardItem';

export const CardsScreen: React.FC = () => {
  const {
    user,
    cards,
    selectedCard,
    setSelectedCardId,
    setCurrentScreen,
    setQrModalOpen,
    setNewCardModalOpen,
    toggleCardBlock,
    setStatementModalOpen,
    setProofModalOpen,
    syncCorporateBalance,
    addNewCard,
    showNotification,
    showConfirmDialog,
    isDarkMode,
  } = useApp();

  const { width } = useWindowDimensions();
  const isDesktop = width >= 860;
  const themeColors = isDarkMode ? DarkColors : Colors;
  const styles = createStyles(themeColors, isDesktop);

  const activeCard = selectedCard || cards[0] || null;
  const activeIndex = activeCard ? Math.max(0, cards.findIndex((c) => c.id === activeCard.id)) : 0;

  const handleSelectCard = useCallback(
    (card: PassCard) => {
      setSelectedCardId(card.id);
      showNotification(
        'Passe Selecionado',
        `${card.title} (•••• ${card.number || '8839'}) agora está ativo como seu cartão principal.`,
        'info'
      );
    },
    [setSelectedCardId, showNotification]
  );

  const handlePreviousCard = useCallback(() => {
    if (cards.length <= 1) return;
    const prevIdx = (activeIndex - 1 + cards.length) % cards.length;
    setSelectedCardId(cards[prevIdx].id);
  }, [cards, activeIndex, setSelectedCardId]);

  const handleNextCard = useCallback(() => {
    if (cards.length <= 1) return;
    const nextIdx = (activeIndex + 1) % cards.length;
    setSelectedCardId(cards[nextIdx].id);
  }, [cards, activeIndex, setSelectedCardId]);

  const handleSwitchOrCreateModality = useCallback(
    (type: CardType) => {
      const existing = cards.find((c) => c.type === type);
      if (existing) {
        setSelectedCardId(existing.id);
        showNotification(
          'Passe Alterado',
          `Você trocou para o ${existing.title}.`,
          'info'
        );
        return;
      }

      const option = PASS_TYPE_OPTIONS[type];
      const suffix = String(Math.floor(1000 + Math.random() * 9000));
      addNewCard({
        type,
        title: option.title,
        tag: option.tag,
        number: suffix,
        holder: (user.name || 'PASSAGEIRO SMARTCARD').toUpperCase(),
        colors: option.colors,
      });
      showNotification(
        'Novo Passe Ativado',
        `${option.title} foi adicionado à sua carteira e definido como passe ativo.`,
        'success'
      );
    },
    [cards, setSelectedCardId, addNewCard, user.name, showNotification]
  );

  const handleBlockPress = useCallback(
    (card: PassCard) => {
      showConfirmDialog({
        title: card.isBlocked ? 'Desbloquear Passe' : 'Bloquear Passe',
        message: `Deseja realmente ${
          card.isBlocked ? 'desbloquear' : 'bloquear temporariamente'
        } o ${card.title}? Enquanto bloqueado, transações na catraca são rejeitadas.`,
        confirmText: card.isBlocked ? 'Desbloquear' : 'Bloquear Cartão',
        cancelText: 'Cancelar',
        isDestructive: !card.isBlocked,
        onConfirm: () => {
          toggleCardBlock(card.id);
        },
      });
    },
    [showConfirmDialog, toggleCardBlock]
  );

  const handleSyncCorporate = useCallback(
    (cardId: string) => {
      syncCorporateBalance(cardId);
      showNotification(
        'Saldo Corporativo Sincronizado',
        'Os créditos de benefício corporativo foram consultados e adicionados ao seu Vale-Transporte.',
        'success'
      );
    },
    [syncCorporateBalance, showNotification]
  );

  const handleRechargePress = useCallback(
    (cardId: string) => {
      setSelectedCardId(cardId);
      setCurrentScreen('recharge');
    },
    [setSelectedCardId, setCurrentScreen]
  );

  const handleQrPress = useCallback(
    (card: PassCard) => {
      setSelectedCardId(card.id);
      setQrModalOpen(true);
    },
    [setSelectedCardId, setQrModalOpen]
  );

  const handleProofPress = useCallback(() => {
    setProofModalOpen(true);
  }, [setProofModalOpen]);

  const handleStatementPress = useCallback(() => {
    setStatementModalOpen(true);
  }, [setStatementModalOpen]);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Sub-Header / Action Toolbar */}
      <View style={styles.toolbar}>
        <View style={styles.counterRow}>
          <View
            style={[
              styles.activeDot,
              cards.some((card) => !card.isBlocked) ? null : styles.inactiveDot,
            ]}
          />
          <Text style={styles.counterText}>
            {cards.filter((card) => !card.isBlocked).length} DE {cards.length} PASSES ATIVOS NA CARTEIRA
          </Text>
        </View>

        <TouchableOpacity
          style={styles.addCardBtn}
          activeOpacity={0.8}
          onPress={() => setNewCardModalOpen(true)}
        >
          <MaterialIcons name="add-card" size={18} color="#ffffff" />
          <Text style={styles.addCardBtnText}>Vincular Novo Passe</Text>
        </TouchableOpacity>
      </View>

      {/* Seletor Rápido de Passes no Topo */}
      {cards.length > 0 && (
        <View style={styles.switcherSection}>
          <View style={styles.switcherHeaderRow}>
            <Text style={styles.switcherLabel}>TROCAR CARTÃO EM USO</Text>
            {cards.length > 1 && (
              <View style={styles.arrowControlsRow}>
                <TouchableOpacity
                  style={styles.arrowBtn}
                  onPress={handlePreviousCard}
                  activeOpacity={0.75}
                  accessibilityLabel="Passe anterior"
                >
                  <MaterialIcons name="chevron-left" size={20} color={themeColors.onSurface} />
                  <Text style={styles.arrowBtnText}>Anterior</Text>
                </TouchableOpacity>

                <Text style={styles.pageCounterText}>
                  {activeIndex + 1} / {cards.length}
                </Text>

                <TouchableOpacity
                  style={styles.arrowBtn}
                  onPress={handleNextCard}
                  activeOpacity={0.75}
                  accessibilityLabel="Próximo passe"
                >
                  <Text style={styles.arrowBtnText}>Próximo</Text>
                  <MaterialIcons name="chevron-right" size={20} color={themeColors.onSurface} />
                </TouchableOpacity>
              </View>
            )}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pillsScrollContent}
          >
            {cards.map((card) => {
              const isSelected = card.id === activeCard?.id;
              const option = PASS_TYPE_OPTIONS[card.type];
              return (
                <TouchableOpacity
                  key={card.id}
                  style={[
                    styles.cardSelectorPill,
                    isSelected && {
                      backgroundColor: option?.colors[0] || themeColors.primaryContainer,
                      borderColor: option?.colors[0] || themeColors.primaryContainer,
                    },
                  ]}
                  activeOpacity={0.8}
                  onPress={() => setSelectedCardId(card.id)}
                >
                  <MaterialIcons
                    name={option?.icon || 'directions-bus'}
                    size={16}
                    color={isSelected ? '#FFFFFF' : themeColors.primary}
                  />
                  <Text
                    style={[
                      styles.cardSelectorPillText,
                      isSelected && { color: '#FFFFFF' },
                    ]}
                  >
                    {card.title}
                  </Text>
                  <Text
                    style={[
                      styles.cardSelectorPillBal,
                      isSelected && { color: 'rgba(255,255,255,0.85)' },
                    ]}
                  >
                    R$ {card.balance.toFixed(2).replace('.', ',')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Cartão Principal Selecionado em Destaque */}
      <View style={styles.spotlightSection}>
        {activeCard ? (
          <PassCardItem
            card={activeCard}
            isSelected={true}
            themeColors={themeColors}
            isDarkMode={isDarkMode}
            styles={styles}
            onCardPress={handleSelectCard}
            onBlockPress={handleBlockPress}
            onSyncCorporate={handleSyncCorporate}
            onRechargePress={handleRechargePress}
            onQrPress={handleQrPress}
            onProofPress={handleProofPress}
            onStatementPress={handleStatementPress}
          />
        ) : (
          <View style={styles.emptyCards}>
            <MaterialIcons name="credit-card-off" size={36} color={themeColors.outline} />
            <Text style={styles.emptyCardsTitle}>Nenhum passe vinculado</Text>
            <Text style={styles.emptyCardsDescription}>
              Escolha uma modalidade abaixo ou vincule um cartão físico para começar.
            </Text>
          </View>
        )}
      </View>

      {/* Lista Completa: Todos os Meus Cartões de Passe */}
      {cards.length > 0 && (
        <View style={styles.allCardsSection}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>Todos os Meus Cartões ({cards.length})</Text>
              <Text style={styles.sectionSubtitle}>
                Toque em qualquer cartão abaixo para torná-lo o passe principal do aplicativo
              </Text>
            </View>
          </View>

          <View style={styles.allCardsGrid}>
            {cards.map((card) => {
              const isSelected = card.id === activeCard?.id;
              const option = PASS_TYPE_OPTIONS[card.type];
              const cardColors = option?.colors || card.colors;
              return (
                <TouchableOpacity
                  key={card.id}
                  style={[
                    styles.miniPassRow,
                    isSelected && styles.miniPassRowSelected,
                  ]}
                  activeOpacity={0.85}
                  onPress={() => handleSelectCard(card)}
                >
                  <LinearGradient
                    colors={cardColors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.miniPassBadge}
                  >
                    <MaterialIcons
                      name={option?.icon || 'directions-bus'}
                      size={22}
                      color="#FFFFFF"
                    />
                  </LinearGradient>

                  <View style={styles.miniPassInfo}>
                    <View style={styles.miniPassTitleRow}>
                      <Text style={styles.miniPassTitle}>{card.title}</Text>
                      {card.isBlocked && (
                        <View style={styles.miniBlockedTag}>
                          <Text style={styles.miniBlockedTagText}>BLOQUEADO</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.miniPassSub}>
                      {card.tag} • Final •••• {card.number || '8839'}
                    </Text>
                    <Text style={styles.miniPassBalance}>
                      Saldo: R$ {card.balance.toFixed(2).replace('.', ',')} (~{card.ridesCount}{' '}
                      viagens)
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.miniSelectBtn,
                      isSelected && styles.miniSelectBtnActive,
                    ]}
                  >
                    <MaterialIcons
                      name={isSelected ? 'check-circle' : 'swap-horiz'}
                      size={16}
                      color={isSelected ? '#FFFFFF' : themeColors.primary}
                    />
                    <Text
                      style={[
                        styles.miniSelectBtnText,
                        isSelected && { color: '#FFFFFF' },
                      ]}
                    >
                      {isSelected ? 'Em Uso' : 'Usar'}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* Catálogo Completo de Modalidades para Trocar ou Adicionar */}
      <View style={styles.catalogSection}>
        <Text style={styles.sectionTitle}>Trocar ou Adicionar Modalidade de Passe</Text>
        <Text style={styles.sectionSubtitle}>
          Alterne entre seus passes ou adicione uma nova categoria à sua carteira com um clique
        </Text>

        <View style={styles.catalogGrid}>
          {PASS_TYPES.map((type) => {
            const option = PASS_TYPE_OPTIONS[type];
            const linkedCard = cards.find((c) => c.type === type);
            const isCurrentActive = linkedCard && linkedCard.id === activeCard?.id;

            return (
              <TouchableOpacity
                key={type}
                style={[
                  styles.catalogCard,
                  isCurrentActive && styles.catalogCardActive,
                ]}
                activeOpacity={0.82}
                onPress={() => handleSwitchOrCreateModality(type)}
              >
                <View style={styles.catalogTopRow}>
                  <LinearGradient
                    colors={option.colors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.catalogIconBadge}
                  >
                    <MaterialIcons name={option.icon} size={20} color="#FFFFFF" />
                  </LinearGradient>

                  <View
                    style={[
                      styles.catalogStatusPill,
                      isCurrentActive
                        ? styles.catalogStatusActive
                        : linkedCard
                        ? styles.catalogStatusLinked
                        : styles.catalogStatusAdd,
                    ]}
                  >
                    <Text
                      style={[
                        styles.catalogStatusText,
                        isCurrentActive && { color: '#FFFFFF' },
                      ]}
                    >
                      {isCurrentActive
                        ? 'ATIVO AGORA'
                        : linkedCard
                        ? 'TROCAR PARA ESTE'
                        : '+ ATIVAR PASSE'}
                    </Text>
                  </View>
                </View>

                <Text style={styles.catalogTitle}>{option.title}</Text>
                <Text style={styles.catalogDesc} numberOfLines={2}>
                  {option.description}
                </Text>

                {linkedCard && (
                  <Text style={styles.catalogBalanceText}>
                    Saldo atual: R$ {linkedCard.balance.toFixed(2).replace('.', ',')}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={{ height: 36 }} />
    </ScrollView>
  );
};

const createStyles = (themeColors: typeof Colors, isDesktop: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: themeColors.surface,
      paddingHorizontal: Spacing.margin,
    },
    toolbar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 14,
      flexWrap: 'wrap',
      gap: 10,
    },
    counterRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    activeDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: themeColors.secondary,
    },
    inactiveDot: {
      backgroundColor: themeColors.outlineVariant,
    },
    counterText: {
      fontSize: 11,
      fontWeight: '700',
      color: themeColors.onSurfaceVariant,
      letterSpacing: 0.5,
    },
    addCardBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: themeColors.primaryContainer,
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 12,
      shadowColor: themeColors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
    },
    addCardBtnText: {
      color: '#ffffff',
      fontSize: 12,
      fontWeight: '700',
    },
    switcherSection: {
      marginBottom: 14,
      gap: 10,
    },
    switcherHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 8,
    },
    switcherLabel: {
      fontSize: 11,
      fontWeight: '800',
      color: themeColors.onSurfaceVariant,
      letterSpacing: 0.6,
    },
    arrowControlsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    arrowBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      backgroundColor: themeColors.surfaceContainerLowest,
      borderWidth: 1,
      borderColor: themeColors.outlineVariant,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 10,
    },
    arrowBtnText: {
      fontSize: 12,
      fontWeight: '700',
      color: themeColors.onSurface,
    },
    pageCounterText: {
      fontSize: 12,
      fontWeight: '700',
      color: themeColors.onSurfaceVariant,
      minWidth: 36,
      textAlign: 'center',
    },
    pillsScrollContent: {
      gap: 8,
      paddingVertical: 2,
    },
    cardSelectorPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: themeColors.surfaceContainerLowest,
      borderWidth: 1.5,
      borderColor: themeColors.outlineVariant,
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 14,
    },
    cardSelectorPillText: {
      fontSize: 12,
      fontWeight: '700',
      color: themeColors.onSurface,
    },
    cardSelectorPillBal: {
      fontSize: 11,
      fontWeight: '600',
      color: themeColors.onSurfaceVariant,
    },
    spotlightSection: {
      marginBottom: 24,
    },
    emptyCards: {
      alignItems: 'center',
      backgroundColor: themeColors.surfaceContainerLowest,
      borderRadius: 20,
      padding: 24,
      gap: 10,
    },
    emptyCardsTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: themeColors.onSurface,
    },
    emptyCardsDescription: {
      fontSize: 12,
      color: themeColors.onSurfaceVariant,
      textAlign: 'center',
    },
    cardWrapper: {
      width: '100%',
      maxWidth: 520,
      alignSelf: 'center',
      backgroundColor: themeColors.surfaceContainerLowest,
      borderRadius: 22,
      overflow: 'hidden',
      shadowColor: themeColors.onSurface,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 3,
      borderWidth: 1.5,
      borderColor: 'transparent',
    },
    cardWrapperSelected: {
      borderColor: themeColors.primaryContainer,
    },
    cardWrapperBlocked: {
      opacity: 0.75,
    },
    cardFace: {
      padding: 0,
      borderRadius: 20,
      overflow: 'hidden',
    },
    glassCardFace: {
      padding: 18,
      borderRadius: 20,
      width: '100%',
    },
    cardTopBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    cardTypeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    cardIconBox: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardTag: {
      fontSize: 10,
      color: 'rgba(255, 255, 255, 0.8)',
      fontWeight: '600',
      textTransform: 'uppercase',
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: '#ffffff',
    },
    activeBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: themeColors.secondary,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 12,
    },
    activeDotSmall: {
      width: 5,
      height: 5,
      borderRadius: 3,
      backgroundColor: themeColors.surfaceContainerLowest,
    },
    activeBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: '#ffffff',
    },
    blockedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: themeColors.error,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 12,
    },
    blockedBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: '#ffffff',
    },
    balanceBox: {
      marginBottom: 16,
    },
    balanceLabel: {
      fontSize: 10,
      color: 'rgba(255, 255, 255, 0.75)',
      fontWeight: '700',
      letterSpacing: 0.5,
    },
    balanceRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 8,
      marginTop: 2,
    },
    balanceText: {
      fontSize: 26,
      fontWeight: '800',
      color: '#ffffff',
    },
    ridesSub: {
      fontSize: 12,
      color: 'rgba(255, 255, 255, 0.85)',
    },
    estudanteGrid: {
      flexDirection: 'row',
      backgroundColor: 'rgba(0, 0, 0, 0.2)',
      borderRadius: 12,
      padding: 10,
      marginBottom: 16,
    },
    estudanteCol: {
      flex: 1,
    },
    metricLabel: {
      fontSize: 9,
      color: 'rgba(255, 255, 255, 0.75)',
      fontWeight: '700',
      letterSpacing: 0.5,
    },
    metricValue: {
      fontSize: 18,
      fontWeight: '800',
      color: '#ffffff',
      marginTop: 2,
    },
    quotaRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 4,
    },
    quotaSub: {
      fontSize: 10,
      color: 'rgba(255, 255, 255, 0.8)',
    },
    cardBottomBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      borderTopWidth: 1,
      borderTopColor: 'rgba(255, 255, 255, 0.15)',
      paddingTop: 10,
    },
    cardDetailLabel: {
      fontSize: 9,
      color: 'rgba(255, 255, 255, 0.7)',
      fontWeight: '700',
    },
    cardDetailVal: {
      fontSize: 12,
      color: '#ffffff',
      fontWeight: '700',
      marginTop: 1,
    },
    cardNumberVal: {
      fontSize: 12,
      color: '#ffffff',
      letterSpacing: 2,
      marginTop: 1,
    },
    actionPanel: {
      padding: 12,
      backgroundColor: themeColors.surfaceContainerLow,
    },
    actionGrid: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 8,
    },
    panelBtnWrapper: {
      flex: 1,
    },
    panelBtn: {
      width: '100%',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: themeColors.surfaceContainerLowest,
      paddingVertical: 8,
      borderRadius: 12,
      gap: 4,
      shadowColor: themeColors.onSurface,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    panelBtnText: {
      fontSize: 11,
      fontWeight: '600',
      color: themeColors.onSurface,
    },
    extraActionsRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 8,
    },
    extraBtnWrapper: {
      flex: 1,
    },
    extraBtn: {
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: themeColors.surfaceContainerLowest,
      height: 40,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: themeColors.surfaceContainerHigh,
    },
    extraBtnText: {
      fontSize: 11,
      fontWeight: '700',
      color: themeColors.primary,
    },
    perforatedRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 4,
      paddingTop: 2,
    },
    perforatedText: {
      fontSize: 10,
      color: themeColors.onSurfaceVariant,
      flex: 1,
    },
    allCardsSection: {
      marginBottom: 26,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: themeColors.onSurface,
    },
    sectionSubtitle: {
      fontSize: 12,
      color: themeColors.onSurfaceVariant,
      marginTop: 2,
      marginBottom: 12,
    },
    allCardsGrid: {
      gap: 10,
    },
    miniPassRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: themeColors.surfaceContainerLowest,
      borderRadius: 16,
      padding: 14,
      borderWidth: 1.5,
      borderColor: themeColors.outlineVariant,
    },
    miniPassRowSelected: {
      borderColor: themeColors.primaryContainer,
      backgroundColor: themeColors.surfaceContainerLow,
    },
    miniPassBadge: {
      width: 48,
      height: 48,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    miniPassInfo: {
      flex: 1,
      gap: 2,
    },
    miniPassTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    miniPassTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: themeColors.onSurface,
    },
    miniBlockedTag: {
      backgroundColor: themeColors.error,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
    },
    miniBlockedTagText: {
      fontSize: 9,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    miniPassSub: {
      fontSize: 11,
      color: themeColors.onSurfaceVariant,
    },
    miniPassBalance: {
      fontSize: 12,
      fontWeight: '700',
      color: themeColors.primary,
      marginTop: 2,
    },
    miniSelectBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
      backgroundColor: themeColors.surfaceContainerHigh,
    },
    miniSelectBtnActive: {
      backgroundColor: themeColors.primaryContainer,
    },
    miniSelectBtnText: {
      fontSize: 12,
      fontWeight: '700',
      color: themeColors.primary,
    },
    catalogSection: {
      marginBottom: 16,
    },
    catalogGrid: {
      flexDirection: isDesktop ? 'row' : 'column',
      flexWrap: isDesktop ? 'wrap' : 'nowrap',
      gap: 12,
    },
    catalogCard: {
      width: isDesktop ? '48.5%' : '100%',
      backgroundColor: themeColors.surfaceContainerLowest,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1.5,
      borderColor: themeColors.outlineVariant,
      gap: 8,
    },
    catalogCardActive: {
      borderColor: themeColors.primaryContainer,
    },
    catalogTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    catalogIconBadge: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    catalogStatusPill: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 10,
    },
    catalogStatusActive: {
      backgroundColor: themeColors.secondary,
    },
    catalogStatusLinked: {
      backgroundColor: themeColors.surfaceContainerHigh,
    },
    catalogStatusAdd: {
      backgroundColor: themeColors.surfaceContainerLow,
      borderWidth: 1,
      borderColor: themeColors.primary,
    },
    catalogStatusText: {
      fontSize: 10,
      fontWeight: '800',
      color: themeColors.primary,
    },
    catalogTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: themeColors.onSurface,
      marginTop: 2,
    },
    catalogDesc: {
      fontSize: 12,
      color: themeColors.onSurfaceVariant,
      lineHeight: 17,
    },
    catalogBalanceText: {
      fontSize: 11,
      fontWeight: '700',
      color: themeColors.secondary,
      marginTop: 2,
    },
  });
