import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, DarkColors, Spacing } from '../theme/colors';
import { useApp } from '../context/AppContext';
import { MercadoPagoPixModal } from '../components/MercadoPagoPixModal';
import { mercadoPagoService, MercadoPagoPixResponse } from '../services/mercadoPagoService';
import { InteractiveButton } from '../components/InteractiveButton';
import { formatCurrencyInput, blockInvalidCurrencyKeyPress } from '../utils/inputMasks';

const FARE = 4.4;

const QUICK_VALUES = [
  { val: 20, rides: 4 },
  { val: 30, rides: 6 },
  { val: 50, rides: 11, isTop: true },
  { val: 100, rides: 22 },
  { val: 150, rides: 34 },
];

export const RechargeScreen: React.FC = () => {
  const {
    user,
    cards,
    selectedCard,
    setCurrentScreen,
    setSelectedCardId,
    rechargeCard,
    paymentCards,
    removePaymentCard,
    setAddCardModalOpen,
    showSuccessReceipt,
    isDarkMode,
    showNotification,
  } = useApp();
  const themeColors = isDarkMode ? DarkColors : Colors;
  const styles = createStyles(themeColors);

  const [amount, setAmount] = useState<number>(0);
  const [customInput, setCustomInput] = useState<string>('');
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>('pix');
  const [isCardPickerOpen, setIsCardPickerOpen] = useState(false);
  const [pixModalOpen, setPixModalOpen] = useState(false);
  const [pixOrderData, setPixOrderData] = useState<MercadoPagoPixResponse | null>(null);
  const [isProcessingPix, setIsProcessingPix] = useState(false);

  const calculatedRides = Math.floor(amount / FARE);

  const handleSelectQuick = (val: number) => {
    setIsCustomMode(false);
    setAmount(val);
    setCustomInput(val.toFixed(2).replace('.', ','));
  };

  const handleCustomChange = (text: string) => {
    const formatted = formatCurrencyInput(text);
    setCustomInput(formatted);
    const cleaned = formatted.replace(',', '.');
    const parsed = parseFloat(cleaned);
    if (!isNaN(parsed) && parsed > 0) {
      setAmount(parsed);
    } else {
      setAmount(0);
    }
  };

  const handleClearCustom = () => {
    setCustomInput('');
    setAmount(0);
  };

  const handleConfirmRecharge = async () => {
    if (!selectedCard) {
      showNotification('Nenhum passe vinculado', 'Vincule um passe antes de fazer uma recarga.', 'error');
      return;
    }
    if (amount <= 0) {
      showNotification('Valor inválido', 'Por favor escolha ou digite um valor maior que zero.', 'error');
      return;
    }
    if (!selectedPaymentId) {
      showNotification('Forma de pagamento', 'Escolha uma forma de pagamento para continuar.', 'error');
      return;
    }

    // Se selecionou Pix, cria a cobrança real com QR Code via Mercado Pago
    if (selectedPaymentId === 'pix') {
      try {
        setIsProcessingPix(true);
        const order = await mercadoPagoService.createPixPayment({
          cardId: selectedCard.id,
          userId: user.id || user.cpf || user.email || 'user',
          amount,
          operationType: 'recharge',
          description: `Recarga SmartCard BUS - ${selectedCard.title}`,
          payer: {
            email: user.email || 'passageiro@smartcardbus.com.br',
            firstName: user.name ? user.name.split(' ')[0] : 'Passageiro',
            cpf: user.cpf || '12345678909',
          },
        });
        setPixOrderData(order);
        setPixModalOpen(true);
      } catch (err) {
        showNotification('Erro no Pix', 'Não foi possível gerar a cobrança Pix.', 'error');
      } finally {
        setIsProcessingPix(false);
      }
      return;
    }

    let methodName: string;
    if (selectedPaymentId === 'mp_checkout') {
      methodName = 'Mercado Pago Checkout Pro';
    } else {
      const found = paymentCards.find((c) => c.id === selectedPaymentId);
      if (!found) {
        showNotification('Forma de pagamento inválida', 'Selecione uma forma de pagamento cadastrada.', 'error');
        return;
      }
      methodName = `${found.name} (${found.number}) • Mercado Pago`;
    }

    const mpCardPayment = await mercadoPagoService.processCardOrCheckoutPayment({
      userId: user.id || user.cpf || user.email || 'user',
      cardId: selectedCard.id,
      amount,
      operationType: 'recharge',
      paymentMethod: methodName,
      description: `Recarga SmartCard BUS - ${selectedCard.title}`,
    });

    rechargeCard(selectedCard.id, amount, methodName);

    showSuccessReceipt({
      title: 'Pagamento Aprovado no Mercado Pago',
      subtitle: `Autorização ${mpCardPayment.authorizationCode} • Crédito liberado para embarque imediato.`,
      amount,
      cardTitle: `${selectedCard.title} (•••• ${selectedCard.number})`,
      method: methodName,
      date: `${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString(
        'pt-BR',
        { hour: '2-digit', minute: '2-digit' }
      )}`,
      txId: `#${mpCardPayment.paymentId}`,
    });
  };

  const handlePixPaymentApproved = (paidAmount: number, txId: string) => {
    setPixModalOpen(false);
    if (!selectedCard) return;

    rechargeCard(selectedCard.id, paidAmount, 'Mercado Pago Pix');

    showSuccessReceipt({
      title: 'Pix Aprovado no Mercado Pago',
      subtitle: 'Seu saldo já foi creditado no seu passe.',
      amount: paidAmount,
      cardTitle: `${selectedCard.title} (•••• ${selectedCard.number})`,
      method: 'Mercado Pago Pix',
      date: `${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString(
        'pt-BR',
        { hour: '2-digit', minute: '2-digit' }
      )}`,
      txId: `#MP-${txId.slice(-6)}`,
    });
  };

  if (!selectedCard) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.emptyStateContent}>
        <View style={styles.emptyState}>
          <MaterialIcons name="credit-card-off" size={36} color={themeColors.outline} />
          <Text style={styles.emptyStateTitle}>
            {cards.length === 0 ? 'Nenhum passe vinculado' : 'Selecione um passe'}
          </Text>
          <Text style={styles.emptyStateDescription}>
            {cards.length === 0
              ? 'Vincule um passe antes de fazer uma recarga.'
              : 'Escolha um passe na sua carteira antes de fazer uma recarga.'}
          </Text>
          <TouchableOpacity
            style={styles.emptyStateButton}
            onPress={() => setCurrentScreen('cards')}
          >
            <Text style={styles.emptyStateButtonText}>
              {cards.length === 0 ? 'Vincular passe' : 'Escolher passe'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addPaymentButton}
            onPress={() => setAddCardModalOpen(true)}
          >
            <Text style={styles.addPaymentButtonText}>Adicionar forma de pagamento</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Selected Card Banner */}
      <View style={styles.cardHeaderBox}>
        <LinearGradient
          colors={selectedCard.colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardHeader}
        >
          <View style={styles.cardHeaderTop}>
            <View style={styles.cardHeaderTagRow}>
              <MaterialIcons name="contactless" size={16} color={themeColors.secondaryFixed} />
              <Text style={styles.cardHeaderTag}>Cartão Selecionado</Text>
            </View>
            <TouchableOpacity
              style={styles.changeCardBtn}
              onPress={() => setIsCardPickerOpen(!isCardPickerOpen)}
            >
              <Text style={styles.changeCardBtnText}>Trocar</Text>
              <MaterialIcons name="expand-more" size={16} color="#ffffff" />
            </TouchableOpacity>
          </View>

          <View style={styles.cardHeaderBottom}>
            <View>
              <Text style={styles.cardHeaderTitle}>{selectedCard.title}</Text>
              <Text style={styles.cardHeaderNumber}>•••• {selectedCard.number}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.cardHeaderBalLabel}>Saldo atual</Text>
              <Text style={styles.cardHeaderBalValue}>
                R$ {selectedCard.balance.toFixed(2).replace('.', ',')}
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* Card Picker Dropdown */}
        {isCardPickerOpen && (
          <View style={styles.pickerDropdown}>
            {cards.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={[
                  styles.pickerItem,
                  c.id === selectedCard.id && styles.pickerItemSelected,
                ]}
                onPress={() => {
                  setSelectedCardId(c.id);
                  setIsCardPickerOpen(false);
                }}
              >
                <View>
                  <Text style={styles.pickerItemTitle}>{c.title}</Text>
                  <Text style={styles.pickerItemSub}>•••• {c.number}</Text>
                </View>
                <Text style={styles.pickerItemBal}>
                  R$ {c.balance.toFixed(2).replace('.', ',')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Amount Selection Section */}
      <View style={styles.section}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>Quanto quer recarregar?</Text>
          <View style={styles.noFeeBadge}>
            <Text style={styles.noFeeBadgeText}>Sem taxas</Text>
          </View>
        </View>

        {/* Quick Values Grid */}
        <View style={styles.quickGrid}>
          {QUICK_VALUES.map((q) => {
            const isSelected = !isCustomMode && amount === q.val;
            return (
              <TouchableOpacity
                key={q.val}
                style={[styles.quickBtn, isSelected && styles.quickBtnSelected]}
                activeOpacity={0.8}
                onPress={() => handleSelectQuick(q.val)}
              >
                {q.isTop && (
                  <View style={styles.topBadge}>
                    <Text style={styles.topBadgeText}>TOP</Text>
                  </View>
                )}
                <Text
                  style={[styles.quickValText, isSelected && styles.quickValTextSelected]}
                >
                  R$ {q.val}
                </Text>
                <Text
                  style={[styles.quickRidesText, isSelected && styles.quickRidesTextSelected]}
                >
                  {q.rides} viagens
                </Text>
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity
            style={[
              styles.quickBtn,
              styles.customBtn,
              isCustomMode && styles.quickBtnSelected,
            ]}
            onPress={() => setIsCustomMode(true)}
          >
            <MaterialIcons
              name="edit"
              size={18}
              color={isCustomMode ? '#ffffff' : themeColors.onSurfaceVariant}
            />
            <Text
              style={[
                styles.quickRidesText,
                isCustomMode && styles.quickRidesTextSelected,
                { marginTop: 4 },
              ]}
            >
              Outro valor
            </Text>
          </TouchableOpacity>
        </View>

        {/* Custom Amount Input Box */}
        <View style={styles.customInputBox}>
          <Text style={styles.customInputLabel}>DIGITAR OUTRO VALOR</Text>
          <View style={styles.inputRow}>
            <Text style={styles.currencySymbol}>R$</Text>
            <TextInput
              style={[styles.textInput, { outlineStyle: 'none' } as any]}
              keyboardType="numeric"
              value={customInput}
              onChangeText={handleCustomChange}
              onKeyPress={(e) => blockInvalidCurrencyKeyPress(e, customInput, handleConfirmRecharge)}
              onSubmitEditing={handleConfirmRecharge}
              onFocus={() => setIsCustomMode(true)}
              placeholder="0,00"
              placeholderTextColor={themeColors.outline}
            />
            {customInput.length > 0 && (
              <TouchableOpacity onPress={handleClearCustom} style={styles.clearBtn}>
                <MaterialIcons name="cancel" size={18} color={themeColors.outline} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.approxRidesBox}>
            <View style={styles.approxLeft}>
              <MaterialIcons name="directions-bus" size={16} color={themeColors.secondary} />
              <Text style={styles.approxLabel}>Rende aproximadamente:</Text>
            </View>
            <Text style={styles.approxValue}>
              {calculatedRides > 0 ? `~${calculatedRides} passagens` : 'Menos de 1 passagem'}
            </Text>
          </View>
          <Text style={styles.fareHint}>Tarifa base metropolitana: R$ 4,40</Text>
        </View>
      </View>

      {/* Payment Method Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Forma de Pagamento</Text>

        <View style={styles.paymentList}>
          {/* Pix */}
          <TouchableOpacity
            style={[
              styles.paymentItem,
              selectedPaymentId === 'pix' && styles.paymentItemSelected,
            ]}
            onPress={() => setSelectedPaymentId('pix')}
          >
            <View style={styles.paymentLeft}>
              <View style={[styles.paymentIconBox, { backgroundColor: themeColors.secondaryContainer }]}>
                <MaterialIcons name="bolt" size={22} color={themeColors.secondary} />
              </View>
              <View>
                <View style={styles.paymentTitleRow}>
                  <Text style={styles.paymentTitle}>Pix Instantâneo</Text>
                  <View style={styles.instantTag}>
                    <Text style={styles.instantTagText}>Em segundos</Text>
                  </View>
                </View>
                <Text style={styles.paymentSubtitle}>QR Code dinâmico e Copia e Cola</Text>
              </View>
            </View>
            <View style={[styles.radioCircle, selectedPaymentId === 'pix' && styles.radioActive]}>
              {selectedPaymentId === 'pix' && <View style={styles.radioDot} />}
            </View>
          </TouchableOpacity>

          {/* Checkout Pro Mercado Pago */}
          <TouchableOpacity
            style={[
              styles.paymentItem,
              selectedPaymentId === 'mp_checkout' && styles.paymentItemSelected,
            ]}
            onPress={() => setSelectedPaymentId('mp_checkout')}
          >
            <View style={styles.paymentLeft}>
              <View style={[styles.paymentIconBox, { backgroundColor: 'rgba(0, 158, 227, 0.14)' }]}>
                <MaterialIcons name="verified-user" size={22} color="#009EE3" />
              </View>
              <View>
                <View style={styles.paymentTitleRow}>
                  <Text style={styles.paymentTitle}>Mercado Pago Checkout Pro</Text>
                  <View style={[styles.instantTag, { backgroundColor: 'rgba(0, 158, 227, 0.16)' }]}>
                    <Text style={[styles.instantTagText, { color: '#009EE3' }]}>Oficial</Text>
                  </View>
                </View>
                <Text style={styles.paymentSubtitle}>Saldo Mercado Pago, Cartão ou Linha de Crédito</Text>
              </View>
            </View>
            <View style={[styles.radioCircle, selectedPaymentId === 'mp_checkout' && styles.radioActive]}>
              {selectedPaymentId === 'mp_checkout' && <View style={styles.radioDot} />}
            </View>
          </TouchableOpacity>

          {/* User's saved cards */}
          {paymentCards.map((pc) => (
            <TouchableOpacity
              key={pc.id}
              style={[
                styles.paymentItem,
                selectedPaymentId === pc.id && styles.paymentItemSelected,
              ]}
              onPress={() => setSelectedPaymentId(pc.id)}
            >
              <View style={styles.paymentLeft}>
                <View style={[styles.paymentIconBox, { backgroundColor: themeColors.surfaceContainerHigh }]}>
                  <MaterialIcons name="credit-card" size={22} color={themeColors.primary} />
                </View>
                <View>
                  <Text style={styles.paymentTitle}>{pc.name}</Text>
                  <Text style={styles.paymentSubtitle}>{pc.number} • Cartão verificado</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <TouchableOpacity
                  onPress={() => {
                    if (selectedPaymentId === pc.id) setSelectedPaymentId('pix');
                    removePaymentCard(pc.id);
                    showNotification('Cartão removido', `${pc.name} foi removido da sua carteira.`, 'info');
                  }}
                  accessibilityLabel={`Remover cartão ${pc.name}`}
                >
                  <MaterialIcons name="delete-outline" size={19} color={themeColors.outline} />
                </TouchableOpacity>
                <View style={[styles.radioCircle, selectedPaymentId === pc.id && styles.radioActive]}>
                  {selectedPaymentId === pc.id && <View style={styles.radioDot} />}
                </View>
              </View>
            </TouchableOpacity>
          ))}

          {/* Add New Card Button */}
          <TouchableOpacity
            style={styles.addPaymentCardBtn}
            onPress={() => setAddCardModalOpen(true)}
          >
            <MaterialIcons name="add" size={20} color={themeColors.primary} />
            <Text style={styles.addPaymentCardText}>Adicionar novo cartão de crédito ou débito</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Summary Box */}
      <View style={styles.summaryBox}>
        <Text style={styles.summaryTitle}>Resumo da recarga</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Valor escolhido</Text>
          <Text style={styles.summaryVal}>R$ {amount.toFixed(2).replace('.', ',')}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Taxa de serviço</Text>
          <Text style={[styles.summaryVal, { color: themeColors.secondary }]}>Grátis (R$ 0,00)</Text>
        </View>

        <View style={styles.summaryDivider} />

        <View style={styles.summaryRow}>
          <View>
            <Text style={styles.totalLabel}>Total a pagar</Text>
            <Text style={styles.totalSub}>Validação instantânea na catraca</Text>
          </View>
          <Text style={styles.totalVal}>R$ {amount.toFixed(2).replace('.', ',')}</Text>
        </View>
      </View>

      {/* Primary CTA */}
      <InteractiveButton
        style={styles.payBtn}
        onPress={handleConfirmRecharge}
      >
        <View style={styles.payBtnContent}>
          <MaterialIcons name="lock" size={20} color="#ffffff" />
          <Text style={styles.payBtnText}>
            {selectedPaymentId === 'pix'
              ? `Gerar Pix Mercado Pago • R$ ${amount.toFixed(2).replace('.', ',')}`
              : `Confirmar e Pagar R$ ${amount.toFixed(2).replace('.', ',')}`}
          </Text>
        </View>
      </InteractiveButton>

      {/* Mercado Pago Pix Modal */}
      <MercadoPagoPixModal
        visible={pixModalOpen}
        orderData={pixOrderData}
        cardTitle={`${selectedCard.title} (•••• ${selectedCard.number})`}
        onClose={() => setPixModalOpen(false)}
        onPaymentApproved={handlePixPaymentApproved}
        showNotification={showNotification}
        isDarkMode={isDarkMode}
      />

      <View style={{ height: 32 }} />
    </ScrollView>
  );
};

const createStyles = (themeColors: typeof Colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.surface,
    paddingHorizontal: Spacing.margin,
  },
  emptyStateContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    backgroundColor: themeColors.surfaceContainerLowest,
    borderRadius: 20,
    padding: 24,
    gap: 10,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: themeColors.onSurface,
  },
  emptyStateDescription: {
    fontSize: 13,
    color: themeColors.onSurfaceVariant,
    textAlign: 'center',
  },
  emptyStateButton: {
    backgroundColor: themeColors.primaryContainer,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 4,
  },
  emptyStateButtonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  addPaymentButton: {
    paddingVertical: 8,
  },
  addPaymentButtonText: {
    color: themeColors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  cardHeaderBox: {
    paddingTop: 12,
    marginBottom: 16,
    position: 'relative',
    zIndex: 10,
  },
  cardHeader: {
    borderRadius: 20,
    padding: 16,
    shadowColor: themeColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardHeaderTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardHeaderTag: {
    fontSize: 10,
    color: themeColors.secondaryFixed,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  changeCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 2,
  },
  changeCardBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
  cardHeaderBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  cardHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  cardHeaderNumber: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    letterSpacing: 1.5,
    marginTop: 2,
  },
  cardHeaderBalLabel: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.75)',
  },
  cardHeaderBalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
  },
  pickerDropdown: {
    backgroundColor: themeColors.surfaceContainerLowest,
    borderRadius: 16,
    padding: 8,
    marginTop: 6,
    borderWidth: 1,
    borderColor: themeColors.surfaceContainerHigh,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  pickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
  },
  pickerItemSelected: {
    backgroundColor: themeColors.surfaceContainerLow,
  },
  pickerItemTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: themeColors.onSurface,
  },
  pickerItemSub: {
    fontSize: 11,
    color: themeColors.onSurfaceVariant,
  },
  pickerItemBal: {
    fontSize: 13,
    fontWeight: '700',
    color: themeColors.primary,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: themeColors.onSurface,
    marginBottom: 10,
  },
  noFeeBadge: {
    backgroundColor: themeColors.secondaryContainer,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  noFeeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: themeColors.onSecondaryContainer,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  quickBtn: {
    width: '31%',
    backgroundColor: themeColors.surfaceContainerLowest,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: themeColors.onSurface,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
    borderWidth: 1.5,
    borderColor: 'transparent',
    position: 'relative',
  },
  quickBtnSelected: {
    backgroundColor: themeColors.primaryContainer,
    borderColor: themeColors.primary,
  },
  customBtn: {
    backgroundColor: themeColors.surfaceContainerLow,
  },
  topBadge: {
    position: 'absolute',
    top: -6,
    right: -4,
    backgroundColor: themeColors.secondary,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
  },
  topBadgeText: {
    color: '#ffffff',
    fontSize: 7,
    fontWeight: '800',
  },
  quickValText: {
    fontSize: 15,
    fontWeight: '700',
    color: themeColors.onSurface,
  },
  quickValTextSelected: {
    color: '#ffffff',
  },
  quickRidesText: {
    fontSize: 10,
    color: themeColors.outline,
    marginTop: 2,
  },
  quickRidesTextSelected: {
    color: 'rgba(255, 255, 255, 0.85)',
  },
  customInputBox: {
    backgroundColor: themeColors.surfaceContainerLowest,
    borderRadius: 16,
    padding: 14,
    shadowColor: themeColors.onSurface,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  customInputLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: themeColors.outline,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: '700',
    color: themeColors.primary,
  },
  textInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '800',
    color: themeColors.onSurface,
    paddingVertical: 4,
  },
  clearBtn: {
    padding: 4,
  },
  approxRidesBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: themeColors.surfaceContainerLow,
    padding: 8,
    borderRadius: 10,
    marginTop: 8,
  },
  approxLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  approxLabel: {
    fontSize: 11,
    color: themeColors.onSurface,
  },
  approxValue: {
    fontSize: 11,
    fontWeight: '700',
    color: themeColors.secondary,
  },
  fareHint: {
    fontSize: 10,
    color: themeColors.outline,
    marginTop: 6,
  },
  paymentList: {
    gap: 10,
  },
  paymentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: themeColors.surfaceContainerLowest,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'transparent',
    shadowColor: themeColors.onSurface,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  paymentItemSelected: {
    borderColor: themeColors.primaryContainer,
  },
  paymentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  paymentIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  paymentTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: themeColors.onSurface,
  },
  instantTag: {
    backgroundColor: themeColors.secondaryFixed,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  instantTagText: {
    fontSize: 9,
    fontWeight: '700',
    color: themeColors.onSecondaryFixed,
  },
  paymentSubtitle: {
    fontSize: 11,
    color: themeColors.outline,
    marginTop: 1,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: themeColors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: {
    borderColor: themeColors.primaryContainer,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: themeColors.primaryContainer,
  },
  addPaymentCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: themeColors.surfaceContainerHigh,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 4,
  },
  addPaymentCardText: {
    fontSize: 12,
    fontWeight: '700',
    color: themeColors.primary,
  },
  summaryBox: {
    backgroundColor: themeColors.surfaceContainerLow,
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: themeColors.onSurface,
    marginBottom: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: themeColors.onSurfaceVariant,
  },
  summaryVal: {
    fontSize: 13,
    fontWeight: '600',
    color: themeColors.onSurface,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: themeColors.surfaceContainerHighest,
    marginVertical: 10,
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: themeColors.onSurface,
  },
  totalSub: {
    fontSize: 10,
    color: themeColors.outline,
  },
  totalVal: {
    fontSize: 20,
    fontWeight: '800',
    color: themeColors.primary,
  },
  payBtn: {
    backgroundColor: themeColors.primaryContainer,
    height: 54,
    borderRadius: 16,
    shadowColor: themeColors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
    justifyContent: 'center',
  },
  payBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: '100%',
  },
  payBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
