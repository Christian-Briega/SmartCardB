import { mercadoPagoService } from '../src/services/mercadoPagoService';
import { localDatabase } from '../src/database/localDatabase';

describe('Protocolo Anti-Gravidade - Integração Mercado Pago', () => {
  it('deve gerar cobrança Pix com QR Code escaneável e payload padrão EMV', async () => {
    const payment = await mercadoPagoService.createPixPayment({
      cardId: 'card-test-1',
      userId: '123.456.789-00',
      amount: 50.0,
      description: 'Recarga SmartCard BUS',
      payer: {
        email: 'passageiro@teste.com',
        firstName: 'Carlos',
        cpf: '12345678909',
      },
    });

    expect(payment).toBeDefined();
    expect(payment.orderId).toBeDefined();
    expect(payment.paymentId).toBeDefined();
    expect(payment.amount).toBe(50.0);
    expect(payment.status).toBe('pending');
    expect(payment.pixCopiaECola).toContain('br.gov.bcb.pix');
    expect(payment.qrCodeBase64).toContain('data:image/png;base64');
  });

  it('deve salvar o pedido no banco de dados local para conciliação', async () => {
    const orders = await localDatabase.getOrders();
    expect(orders.length).toBeGreaterThan(0);
    const lastOrder = orders[0];
    expect(lastOrder.paymentMethod).toBe('pix');
    expect(lastOrder.amount).toBe(50.0);
  });

  it('deve simular aprovação de Pix e creditar saldo no cartão', async () => {
    const card = await localDatabase.saveCard({
      id: 'card-mp-1',
      type: 'comum',
      title: 'Cartão Teste MP',
      tag: 'COMUM',
      number: '4455',
      balance: 10.0,
      ridesCount: 2,
      holder: 'TESTER',
      isBlocked: false,
      colors: ['#003ec8', '#0d53fc'],
    });

    const payment = await mercadoPagoService.createPixPayment({
      cardId: card.id,
      userId: 'user-mp',
      amount: 30.0,
      description: 'Recarga Teste MP',
      payer: {
        email: 'teste@mp.com',
        firstName: 'Tester',
        cpf: '12345678909',
      },
    });

    await mercadoPagoService.simulatePixApproval(payment.orderId, card.id, 30.0);

    const cards = await localDatabase.getCards();
    const updatedCard = cards.find((c) => c.id === card.id);
    expect(updatedCard?.balance).toBe(40.0);

    const txs = await localDatabase.getTransactions();
    expect(txs.some((t) => t.amount === 30.0 && t.cardId === card.id)).toBe(true);
  });

  it('deve processar pagamento via Cartão / Checkout Pro Mercado Pago para recargas, transferências e reservas', async () => {
    const payment = await mercadoPagoService.processCardOrCheckoutPayment({
      userId: 'user-mp',
      cardId: 'card-mp-1',
      amount: 45.0,
      operationType: 'transfer',
      paymentMethod: 'Mercado Pago Checkout Pro',
      description: 'Transferência via Mercado Pago',
      targetInfo: 'card-mp-2',
    });

    expect(payment.status).toBe('approved');
    expect(payment.amount).toBe(45.0);
    expect(payment.authorizationCode).toContain('AUTH-');
    expect(payment.paymentId).toContain('MP-CRD-');
  });

  it('deve permitir configurar e recuperar Access Token customizado do Mercado Pago', () => {
    mercadoPagoService.setCustomAccessToken('TEST-123456789');
    expect(mercadoPagoService.getActiveAccessToken()).toBe('TEST-123456789');
    mercadoPagoService.setCustomAccessToken('');
  });
});

