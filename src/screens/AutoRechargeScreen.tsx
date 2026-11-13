import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, DarkColors, Spacing } from '../theme/colors';
import { useApp } from '../context/AppContext';
import { validateAutoRechargeConfig } from '../utils/autoRechargeLogic';
import { InteractiveButton } from '../components/InteractiveButton';
import { mercadoPagoService, MercadoPagoPixResponse } from '../services/mercadoPagoService';
import { MercadoPagoPixModal } from '../components/MercadoPagoPixModal';

export const AutoRechargeScreen: React.FC = () => {
  const {
    user,
    autoRecharge,
    updateAutoRecharge,
    cards,
    selectedCard,
    setSelectedCardId,
    paymentCards,
    rechargeCard,
    setCurrentScreen,
    isDarkMode,
    showNotification,
  } = useApp();
  const themeColors = isDarkMode ? DarkColors : Colors;
  const styles = createStyles(themeColors);

  const [enabled, setEnabled] = useState(autoRecharge.enabled);
  const [threshold, setThreshold] = useState(autoRecharge.threshold);
  const [rechargeAmount, setRechargeAmount] = useState(autoRecharge.rechargeAmount);
  const [whatsapp, setWhatsapp] = useState(autoRecharge.notificationsWhatsapp);
  const [paymentMethod, setPaymentMethod] = useState(autoRecharge.paymentMethod || 'mp_pix_auto');
  const [pixModalVisible, setPixModalVisible] = useState(false);
  const [activePixOrder, setActivePixOrder] = useState<MercadoPagoPixResponse | null>(null);
  const [isTriggeringNow, setIsTriggeringNow] = useState(false);

  const handleTriggerAutoRechargeNow = async () => {
    if (!selectedCard) {
      showNotification('Selecione um passe', 'Escolha um passe para receber a recarga automática.', 'error');
      return;
    }
    const amountToRecharge = rechargeAmount || 30;

    if (paymentMethod === 'mp_pix_auto') {
      setIsTriggeringNow(true);
      try {
        const order = await mercadoPagoService.createPixPayment({
          amount: amountToRecharge,
          cardId: selectedCard.id,
          userId: user?.id || 'guest',
          operationType: 'auto_recharge',
          description: `Recarga Automática SmartCard BUS - ${selectedCard.title}`,
          payer: {
            email: user?.email || 'passageiro@smartcardbus.com.br',
            firstName: user?.name || 'Passageiro SmartCard',
            cpf: user?.cpf || '',
          },
        });
        setActivePixOrder(order);
        setPixModalVisible(true);
      } catch {
        showNotification('Erro no Pix', 'Não foi possível gerar o QR Code Pix.', 'error');
      } finally {
        setIsTriggeringNow(false);
      }
      return;
    }

    setIsTriggeringNow(true);
    try {
      const selectedPayCard = paymentCards.find((c) => c.id === paymentMethod);
      await mercadoPagoService.processCardOrCheckoutPayment({
        amount: amountToRecharge,
        cardId: selectedCard.id,
        userId: user?.id || 'guest',
        operationType: 'auto_recharge',
        paymentMethod: selectedPayCard ? `${selectedPayCard.name} (${selectedPayCard.number})` : 'Cartão Mercado Pago',
        description: `Recarga Automática SmartCard BUS - ${selectedCard.title}`,
      });
      rechargeCard(selectedCard.id, amountToRecharge, 'Recarga Automática • Mercado Pago');
      showNotification(
        'Recarga Automática Disparada',
        `R$ ${amountToRecharge},00 foram creditados no seu ${selectedCard.title} via Mercado Pago.`,
        'success'
      );
    } catch {
      showNotification('Erro no pagamento', 'Não foi possível processar a recarga automática.', 'error');
    } finally {
      setIsTriggeringNow(false);
    }
  };

  const handlePixAutoApproved = (paidAmount: number) => {
    setPixModalVisible(false);
    setActivePixOrder(null);
    if (selectedCard) {
      rechargeCard(selectedCard.id, paidAmount, 'Recarga Automática Pix • Mercado Pago');
      showNotification(
        'Recarga Automática Pix Aprovada',
        `R$ ${paidAmount.toFixed(2).replace('.', ',')} creditados no seu ${selectedCard.title}.`,
        'success'
      );
    }
  };

  const handleSave = () => {
    const validation = validateAutoRechargeConfig({
      enabled,
      selectedCardId: selectedCard?.id,
      threshold,
      rechargeAmount,
      paymentMethod,
    });

    if (!validation.isValid) {
      showNotification('Configuração inválida', validation.errorMessage || 'Verifique os dados da recarga.', 'error');
      return;
    }

    updateAutoRecharge({
      enabled,
      threshold,
      rechargeAmount,
      paymentMethod,
      notificationsWhatsapp: whatsapp,
    });

    showNotification(
      'Configuração Salva',
      enabled
        ? `Recarga automática ativada: recarrega R$ ${rechargeAmount},00 no seu ${selectedCard?.title} sempre que o saldo for inferior a R$ ${threshold},00.`
        : 'Recarga automática pausada temporariamente.',
      'success'
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.contentFrame}>
      {/* Hero Activation Card */}
      <View style={styles.heroBox}>
        <LinearGradient
          colors={
            enabled
              ? [themeColors.primary, themeColors.primaryContainer, themeColors.secondary]
              : ['#475569', '#334155', '#1e293b']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroTopRow}>
            <View style={styles.secureTag}>
              <MaterialIcons name="bolt" size={14} color={themeColors.secondaryFixed} />
              <Text style={styles.secureTagText}>PASSE SEGURO 24/7</Text>
            </View>

            <Switch
              value={enabled}
              onValueChange={setEnabled}
              trackColor={{ false: '#64748b', true: themeColors.secondaryFixed }}
              thumbColor="#ffffff"
            />
          </View>

          <Text style={styles.heroTitle}>
            {enabled ? 'Recarga Automática Ativa' : 'Recarga Automática Pausada'}
          </Text>
          <Text style={styles.heroDesc}>
            Nunca mais fique preso na catraca. O SmartCard BUS recarrega seu passe sempre que o saldo estiver baixo.
          </Text>

          <View style={styles.heroStatusRow}>
            <View
              style={[
                styles.statusPulse,
                { backgroundColor: enabled ? themeColors.secondaryFixed : themeColors.outlineVariant },
              ]}
            />
            <Text
              style={[
                styles.heroStatusText,
                { color: enabled ? themeColors.secondaryFixed : '#cbd5e1' },
              ]}
            >
              {enabled
                ? 'Catraca sempre liberada • Validação contínua'
                : 'Pausado • Não haverá cobrança automática'}
            </Text>
          </View>
        </LinearGradient>
      </View>

      <View style={styles.settingsSection}>
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionIconBox}>
            <MaterialIcons name="directions-bus" size={18} color={themeColors.primary} />
          </View>
          <View>
            <Text style={styles.sectionTitle}>Passe para recarga</Text>
            <Text style={styles.sectionSubtitle}>Escolha em qual passe aplicar a regra</Text>
          </View>
        </View>
        {cards.length > 0 ? (
          cards.map((card) => (
            <TouchableOpacity
              key={card.id}
              style={[
                styles.paymentCard,
                selectedCard?.id === card.id && styles.paymentCardSelected,
              ]}
              onPress={() => setSelectedCardId(card.id)}
              accessibilityRole="radio"
              accessibilityState={{ checked: selectedCard?.id === card.id }}
            >
              <View style={styles.paymentCardLeft}>
                <MaterialIcons name="directions-bus" size={22} color={themeColors.primary} />
                <View>
                  <Text style={styles.paymentCardName}>{card.title}</Text>
                  <Text style={styles.paymentCardNumber}>
                    {card.number ? `•••• ${card.number}` : 'Número pendente'}
                  </Text>
                </View>
              </View>
              <MaterialIcons
                name={selectedCard?.id === card.id ? 'radio-button-checked' : 'radio-button-unchecked'}
                size={20}
                color={themeColors.primary}
              />
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.noPaymentCard}>
            <Text style={styles.noPaymentCardText}>Nenhum passe cadastrado.</Text>
            <TouchableOpacity onPress={() => setCurrentScreen('cards')}>
              <Text style={styles.addPaymentLink}>Vincular um passe</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Trigger Settings Section */}
      <View style={styles.settingsSection}>
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionIconBox}>
            <MaterialIcons name="tune" size={18} color={themeColors.primary} />
          </View>
          <View>
            <Text style={styles.sectionTitle}>Gatilho Inteligente</Text>
            <Text style={styles.sectionSubtitle}>Defina as métricas exatas para o disparo</Text>
          </View>
        </View>

        {/* Rule 1: Threshold */}
        <Text style={styles.ruleLabel}>Quando o saldo atingir ou ficar abaixo de:</Text>
        <View style={styles.optionsRow}>
          {[10, 15, 20].map((val) => {
            const isSelected = threshold === val;
            return (
              <TouchableOpacity
                key={val}
                style={[styles.optBtn, isSelected && styles.optBtnSelected]}
                onPress={() => setThreshold(val)}
              >
                <Text style={[styles.optSub, isSelected && styles.optSubSelected]}>
                  {val === 10 ? 'Mínimo' : val === 15 ? 'Ideal' : 'Seguro'}
                </Text>
                <Text style={[styles.optVal, isSelected && styles.optValSelected]}>
                  R$ {val}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Rule 2: Amount to recharge */}
        <Text style={styles.ruleLabel}>Valor a ser recarregado automaticamente:</Text>
        <View style={styles.optionsRow}>
          {[30, 50, 100].map((val) => {
            const isSelected = rechargeAmount === val;
            return (
              <TouchableOpacity
                key={val}
                style={[styles.optBtn, isSelected && styles.optBtnSelected]}
                onPress={() => setRechargeAmount(val)}
              >
                <Text style={[styles.optSub, isSelected && styles.optSubSelected]}>
                  {val === 30 ? '6 viagens' : val === 50 ? 'Top (~11 viag.)' : '22 viagens'}
                </Text>
                <Text style={[styles.optVal, isSelected && styles.optValSelected]}>
                  R$ {val}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Payment Card Section */}
      <View style={styles.settingsSection}>
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionIconBox}>
            <MaterialIcons name="credit-card" size={18} color={themeColors.primary} />
          </View>
          <View>
            <Text style={styles.sectionTitle}>Forma de Pagamento Vinculada</Text>
            <Text style={styles.sectionSubtitle}>Cobrado apenas no momento do disparo</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.paymentCard,
            paymentMethod === 'mp_pix_auto' && styles.paymentCardSelected,
          ]}
          onPress={() => setPaymentMethod('mp_pix_auto')}
          accessibilityRole="radio"
          accessibilityState={{ checked: paymentMethod === 'mp_pix_auto' }}
        >
          <View style={styles.paymentCardLeft}>
            <MaterialIcons name="qr-code-2" size={24} color={themeColors.secondary} />
            <View>
              <Text style={styles.paymentCardName}>Pix Automático • Mercado Pago</Text>
              <Text style={styles.paymentCardNumber}>QR Code instantâneo sem taxas</Text>
            </View>
          </View>
          <MaterialIcons
            name={paymentMethod === 'mp_pix_auto' ? 'radio-button-checked' : 'radio-button-unchecked'}
            size={20}
            color={themeColors.primary}
          />
        </TouchableOpacity>

        {paymentCards.length > 0 ? (
          paymentCards.map((card) => (
            <TouchableOpacity
              key={card.id}
              style={[
                styles.paymentCard,
                paymentMethod === card.id && styles.paymentCardSelected,
              ]}
              onPress={() => setPaymentMethod(card.id)}
              accessibilityRole="radio"
              accessibilityState={{ checked: paymentMethod === card.id }}
            >
              <View style={styles.paymentCardLeft}>
                <MaterialIcons name="credit-card" size={24} color={themeColors.primary} />
                <View>
                  <Text style={styles.paymentCardName}>{card.name} • Mercado Pago</Text>
                  <Text style={styles.paymentCardNumber}>{card.number}</Text>
                </View>
              </View>
              <MaterialIcons
                name={paymentMethod === card.id ? 'radio-button-checked' : 'radio-button-unchecked'}
                size={20}
                color={themeColors.primary}
              />
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.noPaymentCard}>
            <Text style={styles.noPaymentCardText}>Deseja cobrar no cartão de crédito?</Text>
            <TouchableOpacity onPress={() => setCurrentScreen('recharge')}>
              <Text style={styles.addPaymentLink}>Cadastrar cartão na tela de recarga</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Notifications Section */}
      <View style={styles.settingsSection}>
        <View style={styles.notificationRow}>
          <View style={styles.notifLeft}>
            <MaterialIcons name="chat" size={22} color={themeColors.secondary} />
            <View>
              <Text style={styles.notifTitle}>Notificar via WhatsApp</Text>
              <Text style={styles.notifDesc}>
                Receba o comprovante e aviso{'\n'}instantâneo no seu celular
              </Text>
            </View>
          </View>
          <Switch
            value={whatsapp}
            onValueChange={setWhatsapp}
            trackColor={{ false: '#cbd5e1', true: themeColors.secondaryContainer }}
            thumbColor={whatsapp ? themeColors.secondary : '#ffffff'}
          />
        </View>
      </View>

      {/* CTA Button */}
      <InteractiveButton
        style={styles.saveBtn}
        onPress={handleSave}
      >
        <View style={styles.saveBtnContent}>
          <MaterialIcons name="check" size={20} color="#ffffff" />
          <Text style={styles.saveBtnText}>Salvar Preferências</Text>
        </View>
      </InteractiveButton>

      <TouchableOpacity
        style={[
          styles.paymentCard,
          { marginTop: 12, justifyContent: 'center', borderColor: themeColors.primary },
          isTriggeringNow && { opacity: 0.7 },
        ]}
        onPress={handleTriggerAutoRechargeNow}
        disabled={isTriggeringNow}
      >
        <MaterialIcons name="bolt" size={20} color={themeColors.primary} />
        <Text style={[styles.paymentCardName, { color: themeColors.primary, marginLeft: 6 }]}>
          {isTriggeringNow
            ? 'Processando no Mercado Pago...'
            : `Executar Recarga de R$ ${rechargeAmount},00 Agora via Mercado Pago`}
        </Text>
      </TouchableOpacity>
      </View>

      <MercadoPagoPixModal
        visible={pixModalVisible}
        orderData={activePixOrder}
        cardTitle={selectedCard?.title || 'Passe SmartCard'}
        isDarkMode={isDarkMode}
        operationLabel="RECARGA AUTOMÁTICA"
        onClose={() => setPixModalVisible(false)}
        onPaymentApproved={handlePixAutoApproved}
        showNotification={showNotification}
      />

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
  heroBox: {
    paddingTop: 12,
    marginBottom: 16,
  },
  heroCard: {
    borderRadius: 24,
    padding: 18,
    shadowColor: themeColors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  secureTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  secureTagText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 4,
  },
  heroDesc: {
    fontSize: 12,
    color: themeColors.onPrimaryContainer,
    lineHeight: 18,
    marginBottom: 12,
  },
  heroStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusPulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  heroStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  settingsSection: {
    backgroundColor: themeColors.surfaceContainerLowest,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: themeColors.onSurface,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  sectionIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: themeColors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: themeColors.onSurface,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: themeColors.onSurfaceVariant,
  },
  ruleLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: themeColors.onSurface,
    marginBottom: 8,
    marginTop: 6,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  optBtn: {
    flex: 1,
    backgroundColor: themeColors.surfaceContainerLow,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  optBtnSelected: {
    backgroundColor: themeColors.primaryContainer,
    borderColor: themeColors.primary,
  },
  optSub: {
    fontSize: 9,
    color: themeColors.outline,
    fontWeight: '600',
  },
  optSubSelected: {
    color: themeColors.primaryFixed,
  },
  optVal: {
    fontSize: 15,
    fontWeight: '800',
    color: themeColors.onSurface,
    marginTop: 2,
  },
  optValSelected: {
    color: '#ffffff',
  },
  paymentCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: themeColors.surfaceContainerLow,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  paymentCardSelected: {
    borderColor: themeColors.primary,
  },
  noPaymentCard: {
    backgroundColor: themeColors.surfaceContainerLow,
    padding: 14,
    borderRadius: 14,
    gap: 8,
  },
  noPaymentCardText: {
    fontSize: 12,
    color: themeColors.onSurfaceVariant,
  },
  addPaymentLink: {
    fontSize: 12,
    color: themeColors.primary,
    fontWeight: '700',
  },
  paymentCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  paymentCardName: {
    fontSize: 13,
    fontWeight: '700',
    color: themeColors.onSurface,
  },
  paymentCardNumber: {
    fontSize: 11,
    color: themeColors.outline,
    marginTop: 1,
  },
  defaultBadge: {
    backgroundColor: themeColors.surfaceContainerHigh,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  defaultBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: themeColors.primary,
  },
  notificationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notifLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    paddingRight: 8,
  },
  notifTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: themeColors.onSurface,
  },
  notifDesc: {
    fontSize: 11,
    color: themeColors.onSurfaceVariant,
    marginTop: 2,
  },
  saveBtn: {
    backgroundColor: themeColors.primaryContainer,
    height: 52,
    borderRadius: 16,
    shadowColor: themeColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
    justifyContent: 'center',
  },
  saveBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: '100%',
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
