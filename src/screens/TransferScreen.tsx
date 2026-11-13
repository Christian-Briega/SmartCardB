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
import { Colors, DarkColors, Spacing } from '../theme/colors';
import { useApp } from '../context/AppContext';
import { PASS_TYPE_OPTIONS } from '../utils/passTypes';
import { isValidCpf } from '../utils/isValidCpf';
import { MercadoPagoPixModal } from '../components/MercadoPagoPixModal';
import { mercadoPagoService, MercadoPagoPixResponse } from '../services/mercadoPagoService';
import {
  formatCpfInput,
  formatPhoneInput,
  formatCurrencyInput,
  blockNonDigitKeyPress,
  blockInvalidCurrencyKeyPress,
} from '../utils/inputMasks';

export const TransferScreen: React.FC = () => {
  const {
    user,
    cards,
    paymentCards,
    transferBalance,
    showSuccessReceipt,
    setCurrentScreen,
    isDarkMode,
    showNotification,
  } = useApp();
  const themeColors = isDarkMode ? DarkColors : Colors;
  const styles = createStyles(themeColors);

  const [tab, setTab] = useState<'self' | 'other' | null>('other');
  const [recipientType, setRecipientType] = useState<'cpf' | 'phone'>('cpf');
  const [sourceCardId, setSourceCardId] = useState<string | null>(cards[0]?.id || null);
  const [targetCardId, setTargetCardId] = useState<string | null>(null);
  const [recipientInput, setRecipientInput] = useState<string>('');
  const [amountInput, setAmountInput] = useState<string>('');
  const [paymentSource, setPaymentSource] = useState<'pass_balance' | 'mp_pix' | 'mp_card'>('mp_pix');
  const [pixModalOpen, setPixModalOpen] = useState(false);
  const [pixOrderData, setPixOrderData] = useState<MercadoPagoPixResponse | null>(null);

  const sourceCard = sourceCardId
    ? cards.find((card) => card.id === sourceCardId) || null
    : null;
  const targetCard = targetCardId
    ? cards.find((card) => card.id === targetCardId) || null
    : null;

  const parsedAmount = parseFloat(amountInput.replace(',', '.')) || 0;
  const isPaidViaMercadoPago = paymentSource === 'mp_pix' || paymentSource === 'mp_card';

  const handleQuickAdd = (addVal: number) => {
    const rawNext = (parsedAmount || 0) + addVal;
    const next =
      !isPaidViaMercadoPago && sourceCard ? Math.min(sourceCard.balance, rawNext) : rawNext;
    setAmountInput(next.toFixed(2).replace('.', ','));
  };

  const handleAllBalance = () => {
    if (!sourceCard) return;
    setAmountInput(sourceCard.balance.toFixed(2).replace('.', ','));
  };

  const handlePixTransferApproved = (paidAmount: number, txId: string) => {
    setPixModalOpen(false);
    const isExternal = tab === 'other';
    const targetInfo = isExternal ? recipientInput : targetCard?.id || '';
    const originId = sourceCard?.id || cards[0]?.id || '';

    transferBalance(originId, targetInfo, paidAmount, isExternal, {
      paidViaMercadoPago: true,
      paymentMethod: 'Mercado Pago Pix',
    });

    showSuccessReceipt({
      title: 'Transferência via Mercado Pago Pix',
      subtitle: isExternal
        ? `Enviado instantaneamente para ${recipientInput} via Pix Mercado Pago.`
        : `Creditado no passe ${targetCard?.title} via Pix Mercado Pago.`,
      amount: paidAmount,
      cardTitle: isExternal ? recipientInput : targetCard?.title || 'Passe de Destino',
      method: 'Mercado Pago Pix',
      date: `${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString(
        'pt-BR',
        { hour: '2-digit', minute: '2-digit' }
      )}`,
      txId: `#MP-${txId.slice(-6)}`,
    });
  };

  const handleTransfer = async () => {
    if (!tab) {
      showNotification('Escolha o tipo', 'Selecione para quem deseja transferir o saldo.', 'error');
      return;
    }
    if (!isPaidViaMercadoPago && !sourceCard) {
      showNotification('Passe de origem', 'Selecione o passe de onde sairá o saldo.', 'error');
      return;
    }
    if (tab === 'self' && !targetCard) {
      showNotification('Passe de destino', 'Selecione o passe que receberá o saldo.', 'error');
      return;
    }
    if (parsedAmount <= 0) {
      showNotification('Valor inválido', 'Informe um valor para transferir.', 'error');
      return;
    }

    if (!isPaidViaMercadoPago && sourceCard && parsedAmount > sourceCard.balance) {
      showNotification(
        'Saldo Insuficiente no Passe',
        'O valor excede o saldo do passe. Escolha "Pix Mercado Pago" ou "Cartão Mercado Pago" abaixo para pagar a transferência.',
        'error'
      );
      return;
    }

    if (tab === 'self') {
      if (!targetCard) {
        showNotification('Passe de destino', 'Selecione o passe que receberá o saldo.', 'error');
        return;
      }
      if (!isPaidViaMercadoPago && sourceCard && sourceCard.id === targetCard.id) {
        showNotification('Atenção', 'Selecione cartões diferentes para origem e destino.', 'error');
        return;
      }
    } else {
      if (!recipientInput.trim()) {
        showNotification('Destinatário', 'Informe o CPF ou celular do passageiro de destino.', 'error');
        return;
      }
      if (recipientType === 'cpf' && !isValidCpf(recipientInput)) {
        showNotification('CPF inválido', 'Informe um CPF válido no formato 000.000.000-00.', 'error');
        return;
      }
      const phoneDigits = recipientInput.replace(/\D/g, '');
      if (recipientType === 'phone' && (phoneDigits.length < 10 || phoneDigits.length > 11)) {
        showNotification('Telefone inválido', 'Informe um telefone válido com DDD: (XX)XXXXX-XXXX.', 'error');
        return;
      }
    }

    const isExternal = tab === 'other';
    const targetInfo = isExternal ? recipientInput : targetCard!.id;
    const originId = sourceCard?.id || cards[0]?.id || '';

    // 1. Pagamento da Transferência via Pix Mercado Pago
    if (paymentSource === 'mp_pix') {
      try {
        const order = await mercadoPagoService.createPixPayment({
          cardId: originId,
          userId: user.id || user.cpf || user.email || 'user',
          amount: parsedAmount,
          operationType: 'transfer',
          targetInfo,
          description: isExternal
            ? `Transferência SmartCard BUS p/ ${recipientInput}`
            : `Transferência p/ ${targetCard?.title}`,
          payer: {
            email: user.email || 'passageiro@smartcardbus.com.br',
            firstName: user.name ? user.name.split(' ')[0] : 'Passageiro',
            cpf: user.cpf || '12345678909',
          },
        });
        setPixOrderData(order);
        setPixModalOpen(true);
      } catch {
        showNotification('Erro no Pix', 'Não foi possível gerar o Pix da transferência.', 'error');
      }
      return;
    }

    // 2. Pagamento da Transferência via Cartão / Checkout Mercado Pago
    if (paymentSource === 'mp_card') {
      const cardName = paymentCards[0]
        ? `${paymentCards[0].name} (${paymentCards[0].number}) • Mercado Pago`
        : 'Mercado Pago Checkout Pro';
      const mpPayment = await mercadoPagoService.processCardOrCheckoutPayment({
        userId: user.id || user.cpf || user.email || 'user',
        cardId: originId,
        amount: parsedAmount,
        operationType: 'transfer',
        paymentMethod: cardName,
        description: isExternal
          ? `Transferência p/ ${recipientInput}`
          : `Transferência p/ ${targetCard?.title}`,
        targetInfo,
      });

      transferBalance(originId, targetInfo, parsedAmount, isExternal, {
        paidViaMercadoPago: true,
        paymentMethod: cardName,
      });

      showSuccessReceipt({
        title: 'Transferência Paga via Mercado Pago',
        subtitle: `Autorização ${mpPayment.authorizationCode} • Enviado para ${
          isExternal ? recipientInput : targetCard?.title
        }.`,
        amount: parsedAmount,
        cardTitle: isExternal ? recipientInput : targetCard?.title || 'Passe de Destino',
        method: cardName,
        date: `${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString(
          'pt-BR',
          { hour: '2-digit', minute: '2-digit' }
        )}`,
        txId: `#${mpPayment.paymentId}`,
      });
      return;
    }

    // 3. Transferência usando o saldo existente no passe
    transferBalance(originId, targetInfo, parsedAmount, isExternal);
    showSuccessReceipt({
      title: isExternal ? 'Transferência Enviada' : 'Transferência Concluída',
      subtitle: isExternal
        ? `Saldo enviado com sucesso para ${recipientInput}.`
        : `Saldo movido de ${sourceCard?.title} para ${targetCard?.title}.`,
      amount: parsedAmount,
      cardTitle: isExternal ? recipientInput : targetCard?.title || '',
      method: isExternal ? 'Envio de Saldo do Passe' : 'Transferência entre Passes',
      date: `${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString(
        'pt-BR',
        { hour: '2-digit', minute: '2-digit' }
      )}`,
      txId: `#VP-TRF-${Math.floor(100000 + Math.random() * 900000)}`,
    });
  };

  if (cards.length === 0) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.emptyStateContent}>
        <View style={styles.emptyState}>
          <MaterialIcons name="credit-card-off" size={36} color={themeColors.outline} />
          <Text style={styles.emptyStateTitle}>Nenhum passe disponível</Text>
          <Text style={styles.emptyStateDescription}>
            Vincule um passe antes de transferir saldo.
          </Text>
          <TouchableOpacity
            style={styles.emptyStateButton}
            onPress={() => setCurrentScreen('cards')}
          >
            <Text style={styles.emptyStateButtonText}>Vincular passe</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.contentFrame}>
      {/* Contextual Header */}
      <View style={styles.headerSection}>
        <View style={styles.tagBadge}>
          <MaterialIcons name="bolt" size={14} color={themeColors.onSecondaryContainer} />
          <Text style={styles.tagText}>INSTANTÂNEO & SEM TAXAS</Text>
        </View>
        <Text style={styles.pageTitle}>Transferir Saldo</Text>
        <Text style={styles.pageDesc}>
          Mova saldo entre seus próprios passes ou envie passagens para outro passageiro com segurança.
        </Text>
      </View>

      {/* Segmented Control Tabs */}
      <View style={styles.segmentContainer}>
        <TouchableOpacity
          style={[styles.segmentBtn, tab === 'self' && styles.segmentBtnActive]}
          onPress={() => {
            setTab('self');
            setTargetCardId(null);
          }}
        >
          <MaterialIcons
            name="sync-alt"
            size={18}
            color={tab === 'self' ? themeColors.primary : themeColors.onSurfaceVariant}
          />
          <Text style={[styles.segmentText, tab === 'self' && styles.segmentTextActive]}>
            Entre Meus Passes
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, tab === 'other' && styles.segmentBtnActive]}
          onPress={() => {
            setTab('other');
            setTargetCardId(null);
          }}
        >
          <MaterialIcons
            name="person-add"
            size={18}
            color={tab === 'other' ? themeColors.primary : themeColors.onSurfaceVariant}
          />
          <Text style={[styles.segmentText, tab === 'other' && styles.segmentTextActive]}>
            Para Outro Usuário
          </Text>
        </TouchableOpacity>
      </View>

      {/* Flow Visualizer Box */}
      <View style={styles.flowContainer}>
        {/* Source Card */}
        <View style={styles.flowCard}>
          <View style={styles.flowCardTop}>
            <View style={styles.flowCardLabelRow}>
              <View style={styles.flowDot} />
              <Text style={styles.flowCardLabel}>ORIGEM (DE ONDE SAI)</Text>
            </View>
          </View>

          <Text style={styles.selectionHint}>Selecione um passe de origem</Text>
          <View style={styles.targetSelfList}>
            {cards.map((card) => (
              <TouchableOpacity
                key={card.id}
                style={[
                  styles.targetCardBtn,
                  sourceCardId === card.id && styles.targetCardBtnSelected,
                ]}
                onPress={() => {
                  setSourceCardId(card.id);
                  setTargetCardId(null);
                }}
                accessibilityRole="radio"
                accessibilityState={{ checked: sourceCardId === card.id }}
              >
                <View style={styles.cardSelectLeft}>
                  <View style={[styles.cardIconBox, { backgroundColor: themeColors.primary }]}>
                    <MaterialIcons name="directions-bus" size={20} color="#ffffff" />
                  </View>
                  <View>
                    <Text style={styles.cardSelectTitle}>{card.title}</Text>
                    <Text style={styles.cardSelectSub}>
                      {card.number ? `Final •••• ${card.number}` : 'Número pendente'}
                    </Text>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.availLabel}>Disponível</Text>
                  <Text style={styles.availValue}>
                    R$ {card.balance.toFixed(2).replace('.', ',')}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Transfer Swap Arrow */}
        <View style={styles.swapArrowContainer}>
          <View style={styles.swapArrowCircle}>
            <MaterialIcons name="arrow-downward" size={20} color={themeColors.primary} />
          </View>
        </View>

        {/* Destination Target */}
        <View style={styles.flowCard}>
          <View style={styles.flowCardTop}>
            <View style={styles.flowCardLabelRow}>
              <View style={[styles.flowDot, { backgroundColor: themeColors.secondary }]} />
              <Text style={[styles.flowCardLabel, { color: themeColors.secondary }]}>
                DESTINO (ONDE RECEBE)
              </Text>
            </View>
          </View>

          {tab === 'self' ? (
            <View style={styles.targetSelfList}>
              {cards.filter((card) => card.id !== sourceCardId).length === 0 ? (
                <Text style={styles.selectionHint}>Não há outro passe para receber o saldo.</Text>
              ) : cards
                .filter((c) => c.id !== sourceCardId)
                .map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[
                      styles.targetCardBtn,
                      targetCardId === c.id && styles.targetCardBtnSelected,
                    ]}
                    onPress={() => setTargetCardId(c.id)}
                  >
                    <View style={styles.cardSelectLeft}>
                      <View
                        style={[
                          styles.cardIconBox,
                          { backgroundColor: themeColors.surfaceContainerHigh },
                        ]}
                      >
                        <MaterialIcons
                          name={PASS_TYPE_OPTIONS[c.type].icon}
                          size={18}
                          color={themeColors.primary}
                        />
                      </View>
                      <View>
                        <Text style={styles.cardSelectTitle}>{c.title}</Text>
                        <Text style={styles.cardSelectSub}>•••• {c.number}</Text>
                      </View>
                    </View>
                    <Text style={styles.availValue}>
                      R$ {c.balance.toFixed(2).replace('.', ',')}
                    </Text>
                  </TouchableOpacity>
                ))}
            </View>
          ) : tab === 'other' ? (
            <View style={styles.otherInputBox}>
              <View style={[styles.segmentContainer, { marginBottom: 10 }]}>
                <TouchableOpacity
                  style={[styles.segmentBtn, recipientType === 'cpf' && styles.segmentBtnActive]}
                  onPress={() => {
                    setRecipientType('cpf');
                    setRecipientInput('');
                  }}
                >
                  <MaterialIcons
                    name="badge"
                    size={16}
                    color={recipientType === 'cpf' ? themeColors.primary : themeColors.onSurfaceVariant}
                  />
                  <Text style={[styles.segmentText, recipientType === 'cpf' && styles.segmentTextActive]}>
                    CPF
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.segmentBtn, recipientType === 'phone' && styles.segmentBtnActive]}
                  onPress={() => {
                    setRecipientType('phone');
                    setRecipientInput('');
                  }}
                >
                  <MaterialIcons
                    name="smartphone"
                    size={16}
                    color={recipientType === 'phone' ? themeColors.primary : themeColors.onSurfaceVariant}
                  />
                  <Text style={[styles.segmentText, recipientType === 'phone' && styles.segmentTextActive]}>
                    Telefone
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.otherLabel}>
                {recipientType === 'cpf' ? 'CPF do passageiro' : 'Telefone / Celular do passageiro'}
              </Text>
              <View style={styles.inputWrapper}>
                <MaterialIcons
                  name={recipientType === 'cpf' ? 'badge' : 'smartphone'}
                  size={20}
                  color={themeColors.outline}
                />
                <TextInput
                  style={[styles.input, { outlineStyle: 'none' } as any]}
                  placeholder={recipientType === 'cpf' ? '000.000.000-00' : '(XX)XXXXX-XXXX'}
                  placeholderTextColor={themeColors.outline}
                  keyboardType={recipientType === 'cpf' ? 'numeric' : 'phone-pad'}
                  maxLength={14}
                  value={recipientInput}
                  onChangeText={(val) =>
                    setRecipientInput(
                      recipientType === 'cpf' ? formatCpfInput(val) : formatPhoneInput(val)
                    )
                  }
                  onKeyPress={(e) => blockNonDigitKeyPress(e, handleTransfer)}
                  onSubmitEditing={handleTransfer}
                />
              </View>
            </View>
          ) : (
            <Text style={styles.selectionHint}>Escolha o tipo de transferência para continuar.</Text>
          )}
        </View>
      </View>

      {/* Amount Input */}
      <View style={styles.amountCard}>
        <Text style={styles.amountLabel}>VALOR DA TRANSFERÊNCIA</Text>
        <View style={styles.amountInputRow}>
          <Text style={styles.amountCurrency}>R$</Text>
          <TextInput
            style={[styles.amountInput, { outlineStyle: 'none' } as any]}
            keyboardType="numeric"
            value={amountInput}
            onChangeText={(val) => setAmountInput(formatCurrencyInput(val))}
            onKeyPress={(e) => blockInvalidCurrencyKeyPress(e, amountInput, handleTransfer)}
            onSubmitEditing={handleTransfer}
            placeholder="0,00"
            placeholderTextColor={themeColors.outline}
          />
        </View>

        <View style={styles.quickAddRow}>
          <TouchableOpacity style={styles.quickAddChip} onPress={() => handleQuickAdd(10)}>
            <Text style={styles.quickAddChipText}>+ R$ 10</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickAddChip} onPress={() => handleQuickAdd(20)}>
            <Text style={styles.quickAddChipText}>+ R$ 20</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickAddChip} onPress={() => handleQuickAdd(30)}>
            <Text style={styles.quickAddChipText}>+ R$ 30</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickAddChip} onPress={handleAllBalance}>
            <Text style={styles.quickAddChipText}>Tudo</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Payment Source Selector (Passe ou Mercado Pago) */}
      <View style={styles.paymentSourceCard}>
        <View style={styles.paymentSourceHeader}>
          <MaterialIcons name="payments" size={18} color={themeColors.primary} />
          <Text style={styles.paymentSourceTitle}>ORIGEM DO PAGAMENTO</Text>
        </View>
        <View style={styles.paymentSourceList}>
          <TouchableOpacity
            style={[
              styles.paymentSourceOption,
              paymentSource === 'pass_balance' && styles.paymentSourceOptionSelected,
            ]}
            onPress={() => setPaymentSource('pass_balance')}
          >
            <MaterialIcons name="directions-bus" size={20} color={themeColors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.paymentSourceOptionTitle}>Saldo do Passe</Text>
              <Text style={styles.paymentSourceOptionSub}>
                Debita do {sourceCard?.title || 'passe selecionado'}
              </Text>
            </View>
            <MaterialIcons
              name={paymentSource === 'pass_balance' ? 'radio-button-checked' : 'radio-button-unchecked'}
              size={20}
              color={themeColors.primary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.paymentSourceOption,
              paymentSource === 'mp_pix' && styles.paymentSourceOptionSelected,
            ]}
            onPress={() => setPaymentSource('mp_pix')}
          >
            <MaterialIcons name="qr-code-2" size={20} color={themeColors.secondary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.paymentSourceOptionTitle}>Pix • Mercado Pago</Text>
              <Text style={styles.paymentSourceOptionSub}>
                Gera QR Code Pix oficial sem descontar do seu passe
              </Text>
            </View>
            <MaterialIcons
              name={paymentSource === 'mp_pix' ? 'radio-button-checked' : 'radio-button-unchecked'}
              size={20}
              color={themeColors.primary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.paymentSourceOption,
              paymentSource === 'mp_card' && styles.paymentSourceOptionSelected,
            ]}
            onPress={() => setPaymentSource('mp_card')}
          >
            <MaterialIcons name="credit-card" size={20} color={themeColors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.paymentSourceOptionTitle}>Cartão / Checkout Mercado Pago</Text>
              <Text style={styles.paymentSourceOptionSub}>
                {paymentCards.length > 0
                  ? `Pagar com ${paymentCards[0].name} via Gateway Mercado Pago`
                  : 'Processado instantaneamente pelo Checkout Pro Mercado Pago'}
              </Text>
            </View>
            <MaterialIcons
              name={paymentSource === 'mp_card' ? 'radio-button-checked' : 'radio-button-unchecked'}
              size={20}
              color={themeColors.primary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Summary Box */}
      <View style={styles.summaryContainer}>
        <View style={styles.sumRow}>
          <Text style={styles.sumLabel}>Forma de pagamento</Text>
          <Text style={[styles.sumVal, { color: themeColors.primary }]}>
            {paymentSource === 'mp_pix'
              ? 'Pix Mercado Pago'
              : paymentSource === 'mp_card'
                ? 'Cartão Mercado Pago'
                : 'Saldo do Passe'}
          </Text>
        </View>
        <View style={styles.sumRow}>
          <Text style={styles.sumLabel}>Tempo de processamento</Text>
          <Text style={[styles.sumVal, { color: themeColors.secondary }]}>Instantâneo</Text>
        </View>
        <View style={styles.sumRow}>
          <Text style={styles.sumLabel}>Taxa operacional</Text>
          <Text style={[styles.sumVal, { color: themeColors.secondary }]}>R$ 0,00 (Grátis)</Text>
        </View>
        <View style={styles.sumRow}>
          <Text style={styles.sumLabel}>Saldo restante previsto no passe</Text>
          <Text style={styles.sumVal}>
            {sourceCard
              ? paymentSource === 'pass_balance'
                ? `R$ ${Math.max(0, sourceCard.balance - parsedAmount).toFixed(2).replace('.', ',')}`
                : `R$ ${sourceCard.balance.toFixed(2).replace('.', ',')} (Inalterado)`
              : '—'}
          </Text>
        </View>
      </View>

      {/* CTA Button */}
      <TouchableOpacity
        style={styles.transferBtn}
        activeOpacity={0.85}
        onPress={handleTransfer}
      >
        <MaterialIcons
          name={paymentSource === 'mp_pix' ? 'qr-code-2' : 'send'}
          size={20}
          color="#ffffff"
        />
        <Text style={styles.transferBtnText}>
          {parsedAmount > 0
            ? paymentSource === 'mp_pix'
              ? `Gerar Pix de R$ ${parsedAmount.toFixed(2).replace('.', ',')}`
              : paymentSource === 'mp_card'
                ? `Pagar e Transferir R$ ${parsedAmount.toFixed(2).replace('.', ',')}`
                : `Confirmar Transferência de R$ ${parsedAmount.toFixed(2).replace('.', ',')}`
            : 'Confirmar Transferência'}
        </Text>
      </TouchableOpacity>
      </View>

      <MercadoPagoPixModal
        visible={pixModalOpen}
        orderData={pixOrderData}
        cardTitle={
          tab === 'other'
            ? recipientInput || 'Destinatário'
            : targetCard?.title || 'Passe de Destino'
        }
        isDarkMode={isDarkMode}
        operationLabel="VALOR DA TRANSFERÊNCIA"
        onClose={() => setPixModalOpen(false)}
        onPaymentApproved={handlePixTransferApproved}
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
  headerSection: {
    paddingTop: 12,
    marginBottom: 16,
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: themeColors.secondaryContainer,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '700',
    color: themeColors.onSecondaryContainer,
    letterSpacing: 0.5,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: themeColors.onSurface,
  },
  pageDesc: {
    fontSize: 12,
    color: themeColors.onSurfaceVariant,
    marginTop: 2,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: themeColors.surfaceContainer,
    padding: 4,
    borderRadius: 16,
    marginBottom: 16,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
  },
  segmentBtnActive: {
    backgroundColor: themeColors.surfaceContainerLowest,
    shadowColor: themeColors.onSurface,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '600',
    color: themeColors.onSurfaceVariant,
  },
  segmentTextActive: {
    color: themeColors.primary,
    fontWeight: '700',
  },
  flowContainer: {
    marginBottom: 16,
    position: 'relative',
  },
  flowCard: {
    backgroundColor: themeColors.surfaceContainerLowest,
    borderRadius: 18,
    padding: 14,
    shadowColor: themeColors.onSurface,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  flowCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  flowCardLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  flowDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: themeColors.primary,
  },
  flowCardLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: themeColors.primary,
    letterSpacing: 0.5,
  },
  pillBadge: {
    backgroundColor: themeColors.surfaceContainerLow,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pillBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: themeColors.onSurfaceVariant,
  },
  cardSelectRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardSelectLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardSelectTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: themeColors.onSurface,
  },
  cardSelectSub: {
    fontSize: 11,
    color: themeColors.outline,
    marginTop: 1,
  },
  availLabel: {
    fontSize: 10,
    color: themeColors.outline,
  },
  availValue: {
    fontSize: 14,
    fontWeight: '700',
    color: themeColors.primary,
  },
  swapArrowContainer: {
    alignItems: 'center',
    marginVertical: -12,
    zIndex: 10,
  },
  swapArrowCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: themeColors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: themeColors.onSurface,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: themeColors.surfaceContainerHigh,
  },
  targetSelfList: {
    gap: 8,
  },
  selectionHint: {
    paddingVertical: 8,
    fontSize: 12,
    color: themeColors.outline,
  },
  targetCardBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'transparent',
    backgroundColor: themeColors.surfaceContainerLow,
  },
  targetCardBtnSelected: {
    borderColor: themeColors.secondary,
    backgroundColor: themeColors.surfaceContainerLowest,
  },
  otherInputBox: {
    marginTop: 4,
  },
  otherLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: themeColors.onSurface,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeColors.surfaceContainerLow,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 13,
    color: themeColors.onSurface,
  },
  contactSuggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    backgroundColor: themeColors.secondaryContainer + '40',
    padding: 8,
    borderRadius: 10,
  },
  contactSuggestionText: {
    fontSize: 11,
    color: themeColors.onSecondaryContainer,
  },
  amountCard: {
    backgroundColor: themeColors.surfaceContainerLowest,
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
    shadowColor: themeColors.onSurface,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  amountLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: themeColors.outline,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  amountCurrency: {
    fontSize: 22,
    fontWeight: '700',
    color: themeColors.primary,
  },
  amountInput: {
    flex: 1,
    fontSize: 26,
    fontWeight: '800',
    color: themeColors.onSurface,
    paddingVertical: 2,
  },
  quickAddRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  quickAddChip: {
    flex: 1,
    backgroundColor: themeColors.surfaceContainerLow,
    paddingVertical: 7,
    borderRadius: 10,
    alignItems: 'center',
  },
  quickAddChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: themeColors.primary,
  },
  paymentSourceCard: {
    backgroundColor: themeColors.surfaceContainerLowest,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: themeColors.surfaceContainerHigh,
  },
  paymentSourceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  paymentSourceTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: themeColors.onSurfaceVariant,
    letterSpacing: 0.6,
  },
  paymentSourceList: {
    gap: 8,
  },
  paymentSourceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: themeColors.surfaceContainerLow,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  paymentSourceOptionSelected: {
    borderColor: themeColors.primary,
    backgroundColor: themeColors.surfaceContainerLowest,
  },
  paymentSourceOptionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: themeColors.onSurface,
  },
  paymentSourceOptionSub: {
    fontSize: 11,
    color: themeColors.onSurfaceVariant,
    marginTop: 2,
  },
  summaryContainer: {
    backgroundColor: themeColors.surfaceContainerLow,
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
    gap: 6,
  },
  sumRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sumLabel: {
    fontSize: 11,
    color: themeColors.onSurfaceVariant,
  },
  sumVal: {
    fontSize: 12,
    fontWeight: '700',
    color: themeColors.onSurface,
  },
  transferBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: themeColors.primaryContainer,
    height: 52,
    borderRadius: 16,
    shadowColor: themeColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  transferBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
