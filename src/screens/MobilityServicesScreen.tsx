import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, DarkColors, Spacing } from '../theme/colors';
import { useApp } from '../context/AppContext';
import { ScreenType } from '../types';
import { formatPersonName } from '../utils/formatPersonName';
import { mercadoPagoService, MercadoPagoPixResponse } from '../services/mercadoPagoService';
import { MercadoPagoPixModal } from '../components/MercadoPagoPixModal';
import {
  formatEmailInput,
  formatBirthDateInput,
  formatCurrencyInput,
  blockNonLetterKeyPress,
  blockInvalidEmailKeyPress,
  blockNonDigitKeyPress,
  blockInvalidCurrencyKeyPress,
} from '../utils/inputMasks';

type ServiceScreen = Extract<ScreenType, 'familyPlan' | 'balanceLoan' | 'creditReserve'>;
type PaymentChoice = 'pix' | string;

const isValidBirthDateForFamily = (value: string): boolean => {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return false;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const birthDate = new Date(year, month - 1, day);
  const today = new Date();
  if (
    birthDate.getFullYear() !== year ||
    birthDate.getMonth() !== month - 1 ||
    birthDate.getDate() !== day ||
    birthDate > today
  ) {
    return false;
  }

  let age = today.getFullYear() - year;
  if (
    today.getMonth() < month - 1 ||
    (today.getMonth() === month - 1 && today.getDate() < day)
  ) {
    age -= 1;
  }
  return age >= 14;
};

const parseAmount = (value: string): number =>
  Number(value.replace(',', '.'));

export const MobilityServicesScreen: React.FC = () => {
  const {
    user,
    selectedCard,
    currentScreen,
    goBackScreen,
    familyMembers,
    addFamilyMember,
    removeFamilyMember,
    balanceLoanRequest,
    requestBalanceLoan,
    settleBalanceLoan,
    creditReserveRequest,
    requestCreditReserve,
    settleCreditReserve,
    paymentCards,
    setAddCardModalOpen,
    showNotification,
    isDarkMode,
  } = useApp();
  const themeColors = isDarkMode ? DarkColors : Colors;
  const styles = createStyles(themeColors);
  const screen = currentScreen as ServiceScreen;

  const [memberName, setMemberName] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [memberBirthDate, setMemberBirthDate] = useState('');
  const [loanAmount, setLoanAmount] = useState('10');
  const [reserveAmount, setReserveAmount] = useState('10');
  const [paymentChoice, setPaymentChoice] = useState<PaymentChoice>('pix');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [pixModalVisible, setPixModalVisible] = useState(false);
  const [activePixOrder, setActivePixOrder] = useState<MercadoPagoPixResponse | null>(null);
  const [pixOperationContext, setPixOperationContext] = useState<'loan_settle' | 'credit_reserve'>('loan_settle');
  const [isProcessingMp, setIsProcessingMp] = useState(false);

  const submitFamilyMember = () => {
    if (!memberName.trim() || !memberEmail.includes('@')) {
      showNotification(
        'Dados incompletos',
        'Informe o nome e um e-mail válido para adicionar a pessoa.',
        'error'
      );
      return;
    }
    if (!isValidBirthDateForFamily(memberBirthDate)) {
      showNotification(
        'Data de nascimento inválida',
        'Informe uma data válida. O participante precisa ter pelo menos 14 anos.',
        'error'
      );
      return;
    }
    if (!addFamilyMember({
      name: memberName.trim(),
      email: memberEmail.trim().toLowerCase(),
      birthDate: memberBirthDate,
    })) {
      showNotification('Limite atingido', 'O Plano Família permite até 5 pessoas, incluindo você.', 'error');
      return;
    }

    setMemberName('');
    setMemberEmail('');
    setMemberBirthDate('');
    showNotification(
      'Membro adicionado',
      'A pessoa foi incluída nesta sessão. O convite por e-mail depende de integração futura.',
      'success'
    );
  };

  const submitLoanRequest = () => {
    const amount = parseAmount(loanAmount);
    if (!Number.isFinite(amount) || amount < 10 || amount > 50) {
      showNotification('Valor inválido', 'Escolha um valor entre R$ 10,00 e R$ 50,00.', 'error');
      return;
    }
    if (!selectedCard) {
      showNotification('Passe necessário', 'Cadastre ou selecione um passe para receber o saldo emergencial.', 'error');
      return;
    }
    if (balanceLoanRequest) {
      showNotification(
        'Empréstimo em aberto',
        'Quite o empréstimo atual via Mercado Pago antes de solicitar um novo.',
        'warning'
      );
      return;
    }

    requestBalanceLoan(amount);
    showNotification(
      'Empréstimo liberado no passe',
      `R$ ${amount.toFixed(2).replace('.', ',')} foram creditados no seu ${selectedCard.title}. Você pode quitar a qualquer momento via Pix ou Cartão Mercado Pago.`,
      'success'
    );
  };

  const handlePayLoanPix = async () => {
    if (!balanceLoanRequest) return;
    setIsProcessingMp(true);
    try {
      const order = await mercadoPagoService.createPixPayment({
        amount: balanceLoanRequest.amount,
        cardId: selectedCard?.id || 'loan',
        userId: user?.id || 'guest',
        operationType: 'balance_loan',
        description: `Quitação de Empréstimo de Saldo - R$ ${balanceLoanRequest.amount.toFixed(2).replace('.', ',')}`,
        payer: {
          email: user?.email || 'passageiro@smartcardbus.com.br',
          firstName: user?.name || 'Passageiro SmartCard',
          cpf: user?.cpf || '',
        },
      });
      setPixOperationContext('loan_settle');
      setActivePixOrder(order);
      setPixModalVisible(true);
    } catch {
      showNotification('Erro no Pix', 'Não foi possível gerar o QR Code Pix.', 'error');
    } finally {
      setIsProcessingMp(false);
    }
  };

  const handlePayLoanCard = async () => {
    if (!balanceLoanRequest) return;
    setIsProcessingMp(true);
    try {
      await mercadoPagoService.processCardOrCheckoutPayment({
        amount: balanceLoanRequest.amount,
        cardId: selectedCard?.id || 'loan',
        userId: user?.id || 'guest',
        operationType: 'balance_loan',
        paymentMethod: paymentCards[0]
          ? `${paymentCards[0].name} (${paymentCards[0].number})`
          : 'Cartão Mercado Pago',
        description: `Quitação de Empréstimo de Saldo - R$ ${balanceLoanRequest.amount.toFixed(2).replace('.', ',')}`,
      });
      settleBalanceLoan('Cartão • Mercado Pago');
    } catch {
      showNotification('Erro no pagamento', 'Não foi possível quitar o empréstimo.', 'error');
    } finally {
      setIsProcessingMp(false);
    }
  };

  const submitCreditReserve = async () => {
    const amount = parseAmount(reserveAmount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > 50) {
      showNotification('Valor inválido', 'Informe um valor acima de R$ 0,00 e até R$ 50,00.', 'error');
      return;
    }
    if (!selectedCard) {
      showNotification('Passe necessário', 'Cadastre ou selecione um passe para receber a reserva de crédito.', 'error');
      return;
    }
    if (!acceptedTerms) {
      showNotification(
        'Confirme o prazo',
        'Leia e aceite o prazo de compensação de até 30 dias úteis para continuar.',
        'error'
      );
      return;
    }
    if (paymentChoice !== 'pix' && !paymentCards.some((card) => card.id === paymentChoice)) {
      showNotification('Forma de pagamento', 'Selecione um cartão cadastrado ou Pix Mercado Pago.', 'error');
      return;
    }
    if (creditReserveRequest) {
      showNotification(
        'Reserva ativa',
        'Já existe uma reserva ativa nesta sessão.',
        'warning'
      );
      return;
    }

    if (paymentChoice === 'pix') {
      setIsProcessingMp(true);
      try {
        const order = await mercadoPagoService.createPixPayment({
          amount,
          cardId: selectedCard.id,
          userId: user?.id || 'guest',
          operationType: 'credit_reserve',
          description: `Reserva de Crédito SmartCard BUS - ${selectedCard.title}`,
          payer: {
            email: user?.email || 'passageiro@smartcardbus.com.br',
            firstName: user?.name || 'Passageiro SmartCard',
            cpf: user?.cpf || '',
          },
        });
        setPixOperationContext('credit_reserve');
        setActivePixOrder(order);
        setPixModalVisible(true);
      } catch {
        showNotification('Erro no Pix', 'Não foi possível gerar o Pix da reserva.', 'error');
      } finally {
        setIsProcessingMp(false);
      }
      return;
    }

    const chosenCard = paymentCards.find((card) => card.id === paymentChoice);
    setIsProcessingMp(true);
    try {
      await mercadoPagoService.processCardOrCheckoutPayment({
        amount,
        cardId: selectedCard.id,
        userId: user?.id || 'guest',
        operationType: 'credit_reserve',
        paymentMethod: chosenCard
          ? `${chosenCard.name} (${chosenCard.number})`
          : 'Cartão Mercado Pago',
        description: `Reserva de Crédito SmartCard BUS - ${selectedCard.title}`,
      });
      requestCreditReserve(amount, `${chosenCard?.name || 'Cartão'} • Mercado Pago`);
      showNotification(
        'Reserva Aprovada via Mercado Pago',
        `R$ ${amount.toFixed(2).replace('.', ',')} foram creditados como reserva emergencial no seu ${selectedCard.title}.`,
        'success'
      );
    } catch {
      showNotification('Erro no pagamento', 'Não foi possível processar a reserva via Mercado Pago.', 'error');
    } finally {
      setIsProcessingMp(false);
    }
  };

  const handlePixModalApproved = (paidAmount: number) => {
    setPixModalVisible(false);
    setActivePixOrder(null);
    if (pixOperationContext === 'loan_settle') {
      settleBalanceLoan('Pix • Mercado Pago');
    } else {
      requestCreditReserve(paidAmount, 'Pix • Mercado Pago');
      showNotification(
        'Reserva Pix Confirmada',
        `R$ ${paidAmount.toFixed(2).replace('.', ',')} foram creditados no seu passe via Pix Mercado Pago.`,
        'success'
      );
    }
  };

  const renderHeader = (title: string, icon: keyof typeof MaterialIcons.glyphMap) => (
    <View style={styles.pageHeader}>
      <TouchableOpacity
        style={styles.headerIcon}
        onPress={() => goBackScreen('home')}
        accessibilityLabel="Voltar para a tela inicial"
      >
        <MaterialIcons name="arrow-back" size={22} color={themeColors.onSurface} />
      </TouchableOpacity>
      <View style={styles.headerIcon}>
        <MaterialIcons name={icon} size={24} color={themeColors.primary} />
      </View>
      <Text style={styles.title}>{title}</Text>
    </View>
  );

  const renderStatus = (title: string, message: string, amount: number) => (
    <View style={styles.pendingCard}>
      <MaterialIcons name="hourglass-top" size={22} color={themeColors.tertiary} />
      <View style={styles.pendingCopy}>
        <Text style={styles.pendingTitle}>{title}</Text>
        <Text style={styles.bodyText}>{message}</Text>
        <Text style={styles.amountText}>Valor solicitado: R$ {amount.toFixed(2).replace('.', ',')}</Text>
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {screen === 'familyPlan' && (
        <>
          {renderHeader('Plano Família', 'family-restroom')}
          <Text style={styles.description}>
            Organize em um só lugar os passes de até 5 pessoas, incluindo o titular. Cada participante deve ter 14 anos ou mais.
          </Text>
          <View style={styles.notice}>
            <MaterialIcons name="verified-user" size={18} color={themeColors.secondary} />
            <Text style={styles.noticeText}>
              Os membros cadastrados ficam salvos na sua conta no banco de dados MySQL.
            </Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Adicionar participante ({familyMembers.length + 1}/5)</Text>
            <Text style={styles.label}>Nome</Text>
            <TextInput
              style={[styles.input, { outlineStyle: 'none' } as any]}
              value={memberName}
              onChangeText={(val) => setMemberName(formatPersonName(val))}
              onKeyPress={(e) => blockNonLetterKeyPress(e, submitFamilyMember)}
              onSubmitEditing={submitFamilyMember}
              placeholder="Nome completo"
              placeholderTextColor={themeColors.outline}
              autoCapitalize="words"
            />
            <Text style={styles.label}>E-mail</Text>
            <TextInput
              style={[styles.input, { outlineStyle: 'none' } as any]}
              value={memberEmail}
              onChangeText={(val) => setMemberEmail(formatEmailInput(val))}
              onKeyPress={(e) => blockInvalidEmailKeyPress(e, memberEmail, submitFamilyMember)}
              onSubmitEditing={submitFamilyMember}
              placeholder="nome@exemplo.com"
              placeholderTextColor={themeColors.outline}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Text style={styles.label}>Data de nascimento (DD/MM/AAAA)</Text>
            <TextInput
              style={[styles.input, { outlineStyle: 'none' } as any]}
              value={memberBirthDate}
              onChangeText={(val) => setMemberBirthDate(formatBirthDateInput(val))}
              onKeyPress={(e) => blockNonDigitKeyPress(e, submitFamilyMember)}
              onSubmitEditing={submitFamilyMember}
              placeholder="DD/MM/AAAA"
              placeholderTextColor={themeColors.outline}
              keyboardType="numeric"
              maxLength={10}
            />
            <TouchableOpacity
              style={[styles.primaryButton, familyMembers.length >= 4 && styles.disabledButton]}
              onPress={submitFamilyMember}
              disabled={familyMembers.length >= 4}
            >
              <Text style={styles.primaryButtonText}>Adicionar participante</Text>
              <MaterialIcons name="person-add" size={18} color="#ffffff" />
            </TouchableOpacity>
          </View>
          {familyMembers.map((member) => (
            <View key={member.id} style={styles.memberRow}>
              <MaterialIcons name="person" size={20} color={themeColors.primary} />
              <View style={styles.pendingCopy}>
                <Text style={styles.memberName}>{member.name}</Text>
                <Text style={styles.bodyText}>{member.email} • Nasc.: {member.birthDate}</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  removeFamilyMember(member.id);
                  showNotification('Participante removido', `${member.name} foi removido do Plano Família.`, 'info');
                }}
                accessibilityLabel={`Remover ${member.name}`}
              >
                <MaterialIcons name="delete-outline" size={20} color={themeColors.outline} />
              </TouchableOpacity>
            </View>
          ))}
        </>
      )}

      {screen === 'balanceLoan' && (
        <>
          {renderHeader('Empréstimo de saldo', 'account-balance-wallet')}
          <Text style={styles.description}>
            Solicite um valor de emergência entre R$ 10,00 e R$ 50,00 creditado na hora no seu passe. Quite em até 30 dias úteis via Pix ou Cartão pelo Mercado Pago.
          </Text>
          <View style={styles.notice}>
            <MaterialIcons name="verified-user" size={18} color={themeColors.secondary} />
            <Text style={styles.noticeText}>
              Integração Mercado Pago ativa: o valor solicitado é creditado imediatamente no passe selecionado e pode ser quitado via Pix ou Cartão.
            </Text>
          </View>
          {balanceLoanRequest ? (
            <View style={styles.card}>
              {renderStatus(
                'Empréstimo ativo • Creditado no passe',
                'Quite seu saldo emergencial utilizando o Gateway Oficial Mercado Pago abaixo.',
                balanceLoanRequest.amount
              )}
              <TouchableOpacity
                style={[styles.primaryButton, isProcessingMp && styles.disabledButton]}
                onPress={handlePayLoanPix}
                disabled={isProcessingMp}
              >
                <MaterialIcons name="qr-code-2" size={18} color="#ffffff" />
                <Text style={styles.primaryButtonText}>Quitar com Pix • Mercado Pago</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  { backgroundColor: themeColors.secondary },
                  isProcessingMp && styles.disabledButton,
                ]}
                onPress={handlePayLoanCard}
                disabled={isProcessingMp}
              >
                <MaterialIcons name="credit-card" size={18} color="#ffffff" />
                <Text style={styles.primaryButtonText}>Quitar com Cartão • Mercado Pago</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Valor do empréstimo</Text>
              <TextInput
                style={[styles.amountInput, { outlineStyle: 'none' } as any]}
                value={loanAmount}
                onChangeText={(val) => setLoanAmount(formatCurrencyInput(val, 2))}
                onKeyPress={(e) => blockInvalidCurrencyKeyPress(e, loanAmount, submitLoanRequest)}
                onSubmitEditing={submitLoanRequest}
                keyboardType="decimal-pad"
                placeholder="10,00"
                placeholderTextColor={themeColors.outline}
              />
              <View style={styles.presetRow}>
                {[10, 20, 50].map((amount) => (
                  <TouchableOpacity
                    key={amount}
                    style={styles.presetButton}
                    onPress={() => setLoanAmount(String(amount))}
                  >
                    <Text style={styles.presetText}>R$ {amount},00</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={styles.primaryButton} onPress={submitLoanRequest}>
                <Text style={styles.primaryButtonText}>Liberar saldo emergencial agora</Text>
                <MaterialIcons name="bolt" size={18} color="#ffffff" />
              </TouchableOpacity>
            </View>
          )}
        </>
      )}

      {screen === 'creditReserve' && (
        <>
          {renderHeader('Reserva de crédito', 'savings')}
          <Text style={styles.description}>
            Adicione uma reserva emergencial de até R$ 50,00 no seu passe utilizando Pix ou Cartão via Mercado Pago.
          </Text>
          <View style={styles.notice}>
            <MaterialIcons name="verified-user" size={18} color={themeColors.secondary} />
            <Text style={styles.noticeText}>
              Gateway Oficial Mercado Pago conectado: pague via QR Code Pix ou Cartão com liberação imediata no passe.
            </Text>
          </View>
          {creditReserveRequest ? (
            <View style={styles.card}>
              {renderStatus(
                'Reserva ativa • Creditada no passe',
                `Forma de pagamento utilizada: ${creditReserveRequest.paymentMethod}.`,
                creditReserveRequest.amount
              )}
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: themeColors.secondary }]}
                onPress={() => settleCreditReserve('Mercado Pago')}
              >
                <MaterialIcons name="check-circle" size={18} color="#ffffff" />
                <Text style={styles.primaryButtonText}>Concluir / Liberar Nova Reserva</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Valor da reserva (máximo R$ 50,00)</Text>
              <TextInput
                style={[styles.amountInput, { outlineStyle: 'none' } as any]}
                value={reserveAmount}
                onChangeText={(val) => setReserveAmount(formatCurrencyInput(val, 2))}
                onKeyPress={(e) => blockInvalidCurrencyKeyPress(e, reserveAmount, submitCreditReserve)}
                onSubmitEditing={submitCreditReserve}
                keyboardType="decimal-pad"
                placeholder="10,00"
                placeholderTextColor={themeColors.outline}
              />
              <View style={styles.presetRow}>
                {[10, 20, 50].map((amount) => (
                  <TouchableOpacity
                    key={amount}
                    style={styles.presetButton}
                    onPress={() => setReserveAmount(String(amount))}
                  >
                    <Text style={styles.presetText}>R$ {amount},00</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Forma de pagamento via Mercado Pago</Text>
              <TouchableOpacity
                style={[styles.choiceRow, paymentChoice === 'pix' && styles.choiceSelected]}
                onPress={() => setPaymentChoice('pix')}
              >
                <MaterialIcons name="qr-code-2" size={20} color={themeColors.primary} />
                <Text style={styles.choiceText}>Pix Instantâneo • Mercado Pago</Text>
                <MaterialIcons
                  name={paymentChoice === 'pix' ? 'radio-button-checked' : 'radio-button-unchecked'}
                  size={20}
                  color={themeColors.primary}
                />
              </TouchableOpacity>
              {paymentCards.map((card) => (
                <TouchableOpacity
                  key={card.id}
                  style={[styles.choiceRow, paymentChoice === card.id && styles.choiceSelected]}
                  onPress={() => setPaymentChoice(card.id)}
                >
                  <MaterialIcons name="credit-card" size={20} color={themeColors.primary} />
                  <Text style={styles.choiceText}>{card.name} ({card.number}) • Mercado Pago</Text>
                  <MaterialIcons
                    name={paymentChoice === card.id ? 'radio-button-checked' : 'radio-button-unchecked'}
                    size={20}
                    color={themeColors.primary}
                  />
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={styles.addCardButton}
                onPress={() => setAddCardModalOpen(true)}
              >
                <MaterialIcons name="add-card" size={18} color={themeColors.primary} />
                <Text style={styles.addCardText}>Cadastrar cartão</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.termsRow}
                onPress={() => setAcceptedTerms((accepted) => !accepted)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: acceptedTerms }}
              >
                <MaterialIcons
                  name={acceptedTerms ? 'check-box' : 'check-box-outline-blank'}
                  size={22}
                  color={acceptedTerms ? themeColors.primary : themeColors.outline}
                />
                <Text style={styles.termsText}>
                  Concordo com o prazo de compensação de até 30 dias úteis.
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.primaryButton, isProcessingMp && styles.disabledButton]}
                onPress={submitCreditReserve}
                disabled={isProcessingMp}
              >
                <Text style={styles.primaryButtonText}>
                  {isProcessingMp
                    ? 'Processando no Mercado Pago...'
                    : paymentChoice === 'pix'
                      ? 'Pagar Reserva com Pix • Mercado Pago'
                      : 'Pagar Reserva com Cartão • Mercado Pago'}
                </Text>
                <MaterialIcons name="arrow-forward" size={18} color="#ffffff" />
              </TouchableOpacity>
            </View>
          )}
        </>
      )}

      <MercadoPagoPixModal
        visible={pixModalVisible}
        orderData={activePixOrder}
        cardTitle={selectedCard?.title || 'Passe SmartCard'}
        isDarkMode={isDarkMode}
        operationLabel={
          pixOperationContext === 'loan_settle'
            ? 'QUITAÇÃO DE EMPRÉSTIMO'
            : 'RESERVA DE CRÉDITO'
        }
        onClose={() => setPixModalVisible(false)}
        onPaymentApproved={handlePixModalApproved}
        showNotification={showNotification}
      />
    </ScrollView>
  );
};

const createStyles = (themeColors: typeof Colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: themeColors.surface,
    },
    content: {
      width: '100%',
      maxWidth: 720,
      alignSelf: 'center',
      padding: Spacing.margin,
      gap: 14,
    },
    pageHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 4,
    },
    headerIcon: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 14,
      backgroundColor: themeColors.surfaceContainerHigh,
    },
    title: {
      flex: 1,
      color: themeColors.onSurface,
      fontSize: 21,
      fontWeight: '800',
    },
    description: {
      color: themeColors.onSurfaceVariant,
      fontSize: 13,
      lineHeight: 20,
      marginBottom: 4,
    },
    notice: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 9,
      padding: 12,
      borderRadius: 12,
      backgroundColor: themeColors.surfaceContainerHigh,
    },
    noticeText: {
      flex: 1,
      color: themeColors.onSurface,
      fontSize: 12,
      lineHeight: 17,
    },
    card: {
      padding: 16,
      borderRadius: 18,
      backgroundColor: themeColors.surfaceContainerLowest,
      borderWidth: 1,
      borderColor: themeColors.surfaceContainerHigh,
      gap: 10,
    },
    sectionTitle: {
      color: themeColors.onSurface,
      fontSize: 15,
      fontWeight: '700',
      marginBottom: 2,
    },
    label: {
      color: themeColors.onSurface,
      fontSize: 12,
      fontWeight: '600',
      marginTop: 4,
    },
    input: {
      minHeight: 44,
      paddingHorizontal: 12,
      borderRadius: 10,
      backgroundColor: themeColors.surfaceContainerLow,
      color: themeColors.onSurface,
      fontSize: 14,
    },
    amountInput: {
      minHeight: 54,
      paddingHorizontal: 14,
      borderRadius: 12,
      backgroundColor: themeColors.surfaceContainerLow,
      color: themeColors.onSurface,
      fontSize: 22,
      fontWeight: '700',
    },
    presetRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 4,
    },
    presetButton: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 9,
      borderRadius: 10,
      backgroundColor: themeColors.surfaceContainerHigh,
    },
    presetText: {
      color: themeColors.primary,
      fontSize: 12,
      fontWeight: '700',
    },
    primaryButton: {
      minHeight: 48,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: 6,
      paddingHorizontal: 14,
      borderRadius: 12,
      backgroundColor: themeColors.primaryContainer,
    },
    primaryButtonText: {
      color: '#ffffff',
      fontSize: 13,
      fontWeight: '700',
    },
    disabledButton: {
      opacity: 0.5,
    },
    memberRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: 12,
      borderRadius: 12,
      backgroundColor: themeColors.surfaceContainerLowest,
    },
    memberName: {
      color: themeColors.onSurface,
      fontSize: 13,
      fontWeight: '700',
    },
    pendingCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      padding: 16,
      borderRadius: 16,
      backgroundColor: themeColors.tertiaryFixed,
    },
    pendingCopy: {
      flex: 1,
      gap: 5,
    },
    pendingTitle: {
      color: themeColors.onTertiaryFixed,
      fontSize: 14,
      fontWeight: '700',
    },
    bodyText: {
      color: themeColors.onSurfaceVariant,
      fontSize: 11,
      lineHeight: 16,
    },
    amountText: {
      color: themeColors.onTertiaryFixed,
      fontSize: 12,
      fontWeight: '700',
      marginTop: 4,
    },
    choiceRow: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 10,
      borderWidth: 1,
      borderColor: themeColors.surfaceContainerHigh,
      borderRadius: 10,
    },
    choiceSelected: {
      borderColor: themeColors.primary,
      backgroundColor: themeColors.surfaceContainerLow,
    },
    choiceText: {
      flex: 1,
      color: themeColors.onSurface,
      fontSize: 12,
      fontWeight: '600',
    },
    addCardButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      alignSelf: 'flex-start',
      paddingVertical: 6,
    },
    addCardText: {
      color: themeColors.primary,
      fontSize: 12,
      fontWeight: '700',
    },
    termsRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      paddingVertical: 4,
    },
    termsText: {
      flex: 1,
      color: themeColors.onSurfaceVariant,
      fontSize: 11,
      lineHeight: 16,
    },
  });
