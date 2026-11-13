import { setSecureItem, getSecureItem } from '../services/secureStorage';
import { PassCard, Transaction, User } from '../types';
import { generateSecureUUID } from '../services/cryptoService';

const DB_KEYS = {
  USERS: 'db_table_users',
  CARDS: 'db_table_cards',
  TRANSACTIONS: 'db_table_transactions',
  ORDERS: 'db_table_mp_orders',
};

export interface MercadoPagoOrder {
  id: string;
  cardId: string;
  userId: string;
  amount: number;
  paymentMethod: 'pix' | 'credit_card';
  status: 'pending' | 'approved' | 'rejected';
  pixQrCode?: string;
  pixQrCodeBase64?: string;
  ticketUrl?: string;
  mpPaymentId?: string;
  createdAt: string;
  expiresAt: string;
}

class LocalDatabase {
  private async getCollection<T>(key: string): Promise<T[]> {
    try {
      const raw = await getSecureItem(key);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  private async saveCollection<T>(key: string, data: T[]): Promise<void> {
    await setSecureItem(key, JSON.stringify(data));
  }

  // --- CARDS CRUD ---
  public async getCards(): Promise<PassCard[]> {
    return await this.getCollection<PassCard>(DB_KEYS.CARDS);
  }

  public async saveCard(card: PassCard): Promise<PassCard> {
    const cards = await this.getCards();
    const existingIndex = cards.findIndex((c) => c.id === card.id);
    if (existingIndex >= 0) {
      cards[existingIndex] = card;
    } else {
      cards.push(card);
    }
    await this.saveCollection(DB_KEYS.CARDS, cards);
    return card;
  }

  public async updateCardBalance(cardId: string, deltaAmount: number): Promise<PassCard | null> {
    const cards = await this.getCards();
    const card = cards.find((c) => c.id === cardId);
    if (!card) return null;

    card.balance = Math.max(0, Math.round((card.balance + deltaAmount) * 100) / 100);
    card.ridesCount = Math.floor(card.balance / 4.4);
    await this.saveCollection(DB_KEYS.CARDS, cards);
    return card;
  }

  public async toggleCardBlock(cardId: string): Promise<PassCard | null> {
    const cards = await this.getCards();
    const card = cards.find((c) => c.id === cardId);
    if (!card) return null;

    card.isBlocked = !card.isBlocked;
    await this.saveCollection(DB_KEYS.CARDS, cards);
    return card;
  }

  // --- TRANSACTIONS CRUD ---
  public async getTransactions(): Promise<Transaction[]> {
    return await this.getCollection<Transaction>(DB_KEYS.TRANSACTIONS);
  }

  public async addTransaction(tx: Omit<Transaction, 'id'>): Promise<Transaction> {
    const transactions = await this.getTransactions();
    const newTx: Transaction = {
      ...tx,
      id: `tx-${generateSecureUUID().slice(0, 8)}`,
    };
    transactions.unshift(newTx);
    await this.saveCollection(DB_KEYS.TRANSACTIONS, transactions);
    return newTx;
  }

  // --- MERCADO PAGO ORDERS CRUD ---
  public async getOrders(): Promise<MercadoPagoOrder[]> {
    return await this.getCollection<MercadoPagoOrder>(DB_KEYS.ORDERS);
  }

  public async createOrder(order: Omit<MercadoPagoOrder, 'id' | 'createdAt'>): Promise<MercadoPagoOrder> {
    const orders = await this.getOrders();
    const newOrder: MercadoPagoOrder = {
      ...order,
      id: generateSecureUUID(),
      createdAt: new Date().toISOString(),
    };
    orders.unshift(newOrder);
    await this.saveCollection(DB_KEYS.ORDERS, orders);
    return newOrder;
  }

  public async updateOrderStatus(orderId: string, status: 'approved' | 'rejected'): Promise<MercadoPagoOrder | null> {
    const orders = await this.getOrders();
    const order = orders.find((o) => o.id === orderId);
    if (!order) return null;

    order.status = status;
    await this.saveCollection(DB_KEYS.ORDERS, orders);
    return order;
  }
}

export const localDatabase = new LocalDatabase();

