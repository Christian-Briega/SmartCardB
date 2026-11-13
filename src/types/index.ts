export type ScreenType =
  | 'welcome'
  | 'login'
  | 'register'
  | 'forgotPassword'
  | 'smsVerification'
  | 'biometricsEnroll'
  | 'profile'
  | 'settings'
  | 'security'
  | 'help'
  | 'home'
  | 'cards'
  | 'recharge'
  | 'transfer'
  | 'autoRecharge'
  | 'passSelection'
  | 'familyPlan'
  | 'balanceLoan'
  | 'creditReserve';

export type CardType =
  | 'comum'
  | 'estudante'
  | 'universitario'
  | 'vt'
  | 'idoso'
  | 'pcd'
  | 'especial';

export interface PassCard {
  id: string;
  type: CardType;
  title: string;
  tag: string;
  number: string;
  balance: number;
  ridesCount: number;
  holder: string;
  matricula?: string;
  companyName?: string;
  validity?: string;
  monthlyQuota?: number;
  remainingQuota?: number;
  isBlocked: boolean;
  colors: [string, string, ...string[]];
}

export type TransactionType = 'trip' | 'recharge' | 'transfer_out' | 'transfer_in';

export interface Transaction {
  id: string;
  cardId: string;
  type: TransactionType;
  title: string;
  subtitle: string;
  amount: number;
  date: string;
  time: string;
  icon: string;
}

export type UserRole = 'commuter' | 'student' | 'operator' | 'admin';
export type KycStatus = 'verified' | 'pending' | 'unverified';

export interface User {
  id?: string;
  name: string;
  cpf: string;
  email: string;
  phone: string;
  birthDate?: string;
  avatarUri?: string;
  biometricsEnabled: boolean;
  twoFactorEnabled: boolean;
  whatsappAlerts: boolean;
  role?: UserRole;
  kycStatus?: KycStatus;
  matricula?: string;
  companyName?: string;
  lastLoginAt?: string;
  googleAccount?: string;
  appleAccount?: string;
}

export interface FamilyMember {
  id: string;
  name: string;
  email: string;
  birthDate: string;
}

export interface PendingCreditRequest {
  amount: number;
  paymentMethod: string;
  requestedAt: string;
  status: 'pending';
}

export interface PaymentCard {
  id: string;
  name: string;
  number: string;
  holder: string;
  brand: string;
}

export interface AutoRechargeConfig {
  enabled: boolean;
  threshold: number | null;
  rechargeAmount: number | null;
  paymentMethod: string | null;
  notificationsWhatsapp: boolean;
}

export interface TransitNotification {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'transit' | 'recharge' | 'security';
  read: boolean;
  icon: string;
}

export interface TransitLineStatus {
  id: string;
  name: string;
  code: string;
  status: 'normal' | 'velocidade_reduzida' | 'paralisada';
  color: string;
  description: string;
}

export interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
}

export interface SuccessReceiptData {
  title: string;
  subtitle: string;
  amount: number;
  cardTitle: string;
  method: string;
  date: string;
  txId: string;
  primaryActionText?: string;
  onPrimaryAction?: () => void;
}
