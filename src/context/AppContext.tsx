import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  PassCard,
  Transaction,
  User,
  AutoRechargeConfig,
  ScreenType,
  TransitNotification,
  TransitLineStatus,
  PaymentCard,
  ConfirmDialogOptions,
  SuccessReceiptData,
  CardType,
  FamilyMember,
  PendingCreditRequest,
} from '../types';
import { PASS_TYPE_OPTIONS } from '../utils/passTypes';
import { setSecureItem, getSecureItem, deleteSecureItem, SECURE_KEYS } from '../services/secureStorage';
import { generateSecureJwt } from '../services/cryptoService';
import { mysqlApiService, MysqlUserFullState } from '../services/mysqlApiService';

export type AppNotificationType = 'warning' | 'error' | 'success' | 'info';

export interface AppNotification {
  title: string;
  message: string;
  type: AppNotificationType;
  onDismiss?: () => void;
}

interface AppContextData {
  user: User;
  isLoggedIn: boolean;
  hasCompletedPassSelection: boolean;
  isScreenLoading: boolean;
  familyMembers: FamilyMember[];
  balanceLoanRequest: PendingCreditRequest | null;
  creditReserveRequest: PendingCreditRequest | null;
  isDarkMode: boolean;
  toggleTheme: () => void;
  currentScreen: ScreenType;
  cards: PassCard[];
  selectedCard: PassCard | null;
  transactions: Transaction[];
  autoRecharge: AutoRechargeConfig;
  notifications: TransitNotification[];
  transitLines: TransitLineStatus[];
  paymentCards: PaymentCard[];

  // Modals
  isQrModalOpen: boolean;
  isStatementModalOpen: boolean;
  isNewCardModalOpen: boolean;
  isNotificationsModalOpen: boolean;
  isProofModalOpen: boolean;
  isAddCardModalOpen: boolean;
  isChatModalOpen: boolean;
  isTermsModalOpen: boolean;
  isPrivacyModalOpen: boolean;
  isNetworkModalOpen: boolean;
  socialAuthModal: { provider: 'google' | 'apple'; mode: 'login' | 'register' | 'link' } | null;
  confirmDialog: ConfirmDialogOptions | null;
  successReceipt: SuccessReceiptData | null;
  notification: AppNotification | null;

  // Navigation
  setCurrentScreen: (screen: ScreenType) => void;
  goBackScreen: (screen: ScreenType) => void;
  setSelectedCardId: (id: string) => void;

  // Modals setters
  setQrModalOpen: (open: boolean) => void;
  setStatementModalOpen: (open: boolean) => void;
  setNewCardModalOpen: (open: boolean) => void;
  setNotificationsModalOpen: (open: boolean) => void;
  setProofModalOpen: (open: boolean) => void;
  setAddCardModalOpen: (open: boolean) => void;
  setChatModalOpen: (open: boolean) => void;
  setTermsModalOpen: (open: boolean) => void;
  setPrivacyModalOpen: (open: boolean) => void;
  setNetworkModalOpen: (open: boolean) => void;
  openSocialAuthModal: (provider: 'google' | 'apple', mode: 'login' | 'register' | 'link') => void;
  closeSocialAuthModal: () => void;
  authenticateSocialAccount: (
    provider: 'google' | 'apple',
    name: string,
    email: string,
    mode: 'login' | 'register' | 'link'
  ) => void;
  unlinkSocialAccount: (provider: 'google' | 'apple') => void;
  showConfirmDialog: (options: ConfirmDialogOptions) => void;
  closeConfirmDialog: () => void;
  showSuccessReceipt: (receipt: SuccessReceiptData) => void;
  closeSuccessReceipt: () => void;
  showNotification: (
    title: string,
    message: string,
    type?: AppNotificationType,
    onDismiss?: () => void
  ) => void;
  closeNotification: () => void;

  // Auth & Access
  login: (identifier: string, pass?: string) => boolean;
  loginAsync: (identifier: string, pass: string) => Promise<boolean>;
  loginWithPhone: (phone: string) => boolean;
  loginWithPhoneAsync: (phone: string) => Promise<boolean>;
  enterDemoMode: () => void;
  completePassSelection: (passType: CardType) => void;
  addFamilyMember: (member: Omit<FamilyMember, 'id'>) => boolean;
  removeFamilyMember: (memberId: string) => void;
  requestBalanceLoan: (amount: number) => void;
  settleBalanceLoan: (paymentMethod: string) => void;
  requestCreditReserve: (amount: number, paymentMethod: string) => void;
  settleCreditReserve: (paymentMethod: string) => void;
  logout: () => void;
  deleteAccountAsync: (password: string) => Promise<{ ok: boolean; error?: string }>;
  register: (
    name: string,
    cpf: string,
    email: string,
    phone: string,
    password: string,
    whatsappAlerts: boolean,
    birthDate?: string
  ) => void;
  updateUser: (updates: Partial<User>) => void;
  resetPassword: (identifier: string, newPass: string) => boolean;
  resetPasswordAsync: (identifier: string, newPass: string) => Promise<boolean>;

  // Operations
  rechargeCard: (cardId: string, amount: number, paymentMethod: string) => void;
  transferBalance: (
    sourceId: string,
    targetInfo: string,
    amount: number,
    isExternal: boolean,
    options?: { paidViaMercadoPago?: boolean; paymentMethod?: string }
  ) => boolean;
  toggleCardBlock: (cardId: string) => void;
  addNewCard: (card: Omit<PassCard, 'id' | 'balance' | 'ridesCount' | 'isBlocked'>) => void;
  addPaymentCard: (card: PaymentCard) => void;
  removePaymentCard: (cardId: string) => void;
  updateAutoRecharge: (config: Partial<AutoRechargeConfig>) => void;
  markNotificationAsRead: (id: string) => void;
  renewStudentProof: (cardId: string, fileName: string) => void;
  syncCorporateBalance: (cardId: string) => void;
}

const AppContext = createContext<AppContextData>({} as AppContextData);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User>({
    name: '',
    cpf: '',
    email: '',
    phone: '',
    biometricsEnabled: false,
    twoFactorEnabled: false,
    whatsappAlerts: false,
    role: 'commuter',
    kycStatus: 'verified',
  });

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [hasCompletedPassSelection, setHasCompletedPassSelection] = useState(false);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [balanceLoanRequest, setBalanceLoanRequest] = useState<PendingCreditRequest | null>(null);
  const [creditReserveRequest, setCreditReserveRequest] =
    useState<PendingCreditRequest | null>(null);
  const [registeredPassword, setRegisteredPassword] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [currentScreen, setCurrentScreenState] = useState<ScreenType>('welcome');
  const [isScreenLoading, setIsScreenLoading] = useState(false);
  const navigationTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setCurrentScreen = (screen: ScreenType) => {
    if (navigationTimeout.current) {
      clearTimeout(navigationTimeout.current);
      navigationTimeout.current = null;
    }
    if (screen === currentScreen && !isScreenLoading) return;
    setIsScreenLoading(false);
    setCurrentScreenState(screen);
  };

  const goBackScreen = (screen: ScreenType) => {
    if (navigationTimeout.current) {
      clearTimeout(navigationTimeout.current);
      navigationTimeout.current = null;
    }
    setCurrentScreenState(screen);
    setIsScreenLoading(false);
  };

  useEffect(
    () => () => {
      if (navigationTimeout.current) clearTimeout(navigationTimeout.current);
    },
    []
  );

  const toggleTheme = () => {
    setIsDarkMode((previous) => {
      const next = !previous;
      setSecureItem('theme_dark_mode', next ? 'true' : 'false');
      return next;
    });
  };

  const [cards, setCards] = useState<PassCard[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [notifications, setNotifications] = useState<TransitNotification[]>([]);
  const [transitLines] = useState<TransitLineStatus[]>([
    {
      id: 'line-1-azul',
      code: 'L1 • Azul',
      name: 'Linha 1 - Azul (Metrô SP)',
      status: 'normal',
      color: '#0153A0',
      description: 'Jabaquara ↔ Tucuruvi • Intervalo médio de 2 min • Catracas QR e NFC ativas.',
    },
    {
      id: 'line-3-vermelha',
      code: 'L3 • Vermelha',
      name: 'Linha 3 - Vermelha (Metrô SP)',
      status: 'normal',
      color: '#EE372F',
      description: 'Corinthians-Itaquera ↔ Palmeiras-Barra Funda • Operação regular em toda a linha.',
    },
    {
      id: 'line-4-amarela',
      code: 'L4 • Amarela',
      name: 'Linha 4 - Amarela (ViaQuatro)',
      status: 'normal',
      color: '#F5B700',
      description: 'Luz ↔ Vila Sônia • Integração gratuita com terminais urbanos e linhas metropolitanas.',
    },
    {
      id: 'line-9-esmeralda',
      code: 'L9 • Esmeralda',
      name: 'Linha 9 - Esmeralda (ViaMobilidade)',
      status: 'normal',
      color: '#00A88E',
      description: 'Osasco ↔ Mendes-Vila Natal • Circulação normal nos dois sentidos.',
    },
    {
      id: 'sptrans-corredores',
      code: 'SPTrans • Ônibus',
      name: 'Corredores Municipais & EMTU',
      status: 'normal',
      color: '#003EC8',
      description: 'Frota municipal e intermunicipal operando regularmente com leitura instantânea.',
    },
  ]);
  const [paymentCards, setPaymentCards] = useState<PaymentCard[]>([]);

  const [autoRecharge, setAutoRecharge] = useState<AutoRechargeConfig>({
    enabled: false,
    threshold: null,
    rechargeAmount: null,
    paymentMethod: null,
    notificationsWhatsapp: false,
  });

  // Modals state
  const [isQrModalOpen, setQrModalOpen] = useState(false);
  const [isStatementModalOpen, setStatementModalOpen] = useState(false);
  const [isNewCardModalOpen, setNewCardModalOpen] = useState(false);
  const [isNotificationsModalOpen, setNotificationsModalOpen] = useState(false);
  const [isProofModalOpen, setProofModalOpen] = useState(false);
  const [isAddCardModalOpen, setAddCardModalOpen] = useState(false);
  const [isChatModalOpen, setChatModalOpen] = useState(false);
  const [isTermsModalOpen, setTermsModalOpen] = useState(false);
  const [isPrivacyModalOpen, setPrivacyModalOpen] = useState(false);
  const [isNetworkModalOpen, setNetworkModalOpen] = useState(false);
  const [socialAuthModal, setSocialAuthModal] = useState<{
    provider: 'google' | 'apple';
    mode: 'login' | 'register' | 'link';
  } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogOptions | null>(null);
  const [successReceipt, setSuccessReceipt] = useState<SuccessReceiptData | null>(null);
  const [notification, setNotification] = useState<AppNotification | null>(null);

  const selectedCard = selectedCardId
    ? cards.find((card) => card.id === selectedCardId) || null
    : null;

  const currentUserId = user.id || user.cpf || user.email || 'default_user';

  const applyMysqlUserState = (state: MysqlUserFullState) => {
    setUser(state.user);
    setHasCompletedPassSelection(state.hasCompletedPassSelection);
    setCards(state.cards);
    setSelectedCardId((prevId) => prevId || state.cards[0]?.id || null);
    setTransactions(state.transactions);
    setPaymentCards(state.paymentCards);
    setAutoRecharge(state.autoRecharge);
    setFamilyMembers(state.familyMembers);
    setBalanceLoanRequest(state.balanceLoanRequest);
    setCreditReserveRequest(state.creditReserveRequest);
    setNotifications(state.notifications);
  };

  // Hidrata automaticamente o estado salvo no banco de dados MySQL ao abrir ou recarregar o app
  useEffect(() => {
    let mounted = true;
    getSecureItem('theme_dark_mode').then((themeVal) => {
      if (mounted && themeVal !== null) {
        setIsDarkMode(themeVal === 'true');
      }
    });

    mysqlApiService.getCurrentSession().then((res) => {
      if (!mounted || !res?.ok || !res.state) return;
      applyMysqlUserState(res.state);
      if (res.isLoggedIn) {
        setIsLoggedIn(true);
        setCurrentScreenState(res.state.hasCompletedPassSelection ? 'home' : 'passSelection');
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  const openSocialAuthModal = (
    provider: 'google' | 'apple',
    mode: 'login' | 'register' | 'link'
  ) => {
    setSocialAuthModal({ provider, mode });
  };

  const closeSocialAuthModal = () => {
    setSocialAuthModal(null);
  };

  const authenticateSocialAccount = (
    provider: 'google' | 'apple',
    name: string,
    email: string,
    mode: 'login' | 'register' | 'link'
  ) => {
    const cleanName = name.trim() || 'Passageiro SmartCard';
    const cleanEmail = email.trim().toLowerCase();
    const providerLabel = provider === 'google' ? 'Google' : 'Apple';

    if (mode === 'link') {
      const updates =
        provider === 'google' ? { googleAccount: cleanEmail } : { appleAccount: cleanEmail };
      setUser((prev) => ({
        ...prev,
        email: prev.email || cleanEmail,
        ...updates,
      }));
      mysqlApiService.updateUser(currentUserId, updates);
      setSocialAuthModal(null);
      showNotification(
        `Conta ${providerLabel} Vinculada`,
        `A conta ${cleanEmail} foi conectada ao seu perfil no banco MySQL com sucesso.`,
        'success'
      );
      return;
    }

    setUser((prev) => ({
      ...prev,
      name: prev.name || cleanName,
      email: cleanEmail,
      role: prev.role || 'commuter',
      kycStatus: 'verified',
      ...(provider === 'google' ? { googleAccount: cleanEmail } : { appleAccount: cleanEmail }),
    }));

    mysqlApiService
      .authenticateSocial({
        provider,
        name: cleanName,
        email: cleanEmail,
        mode,
      })
      .then((res) => {
        if (res?.ok && res.state) {
          applyMysqlUserState(res.state);
          setCurrentScreen(res.state.hasCompletedPassSelection ? 'home' : 'passSelection');
        }
      });

    setSocialAuthModal(null);
    setIsLoggedIn(true);
    setCurrentScreen(hasCompletedPassSelection ? 'home' : 'passSelection');

    generateSecureJwt({
      userId: cleanEmail,
      cpf: user.cpf || '000.000.000-00',
      name: cleanName,
      role: 'passenger',
    })
      .then((token) => {
        setSecureItem(SECURE_KEYS.AUTH_TOKEN, token);
        setSecureItem('user_token', token);
      })
      .catch((err) => console.warn('[Security] Failed to persist social token:', err));
  };

  const unlinkSocialAccount = (provider: 'google' | 'apple') => {
    const providerLabel = provider === 'google' ? 'Google' : 'Apple';
    const updates = provider === 'google' ? { googleAccount: undefined } : { appleAccount: undefined };
    setUser((prev) => ({
      ...prev,
      ...updates,
    }));
    mysqlApiService.updateUser(currentUserId, updates);
    showNotification(
      `Conta ${providerLabel} Desconectada`,
      `O vínculo com sua conta ${providerLabel} foi removido do banco de dados.`,
      'info'
    );
  };

  const showConfirmDialog = (options: ConfirmDialogOptions) => {
    setConfirmDialog(options);
  };

  const closeConfirmDialog = () => {
    setConfirmDialog(null);
  };

  const showSuccessReceipt = (receipt: SuccessReceiptData) => {
    setSuccessReceipt(receipt);
  };

  const closeSuccessReceipt = () => {
    setSuccessReceipt(null);
  };

  const showNotification = (
    title: string,
    message: string,
    type: AppNotificationType = 'warning',
    onDismiss?: () => void
  ) => {
    setNotification({ title, message, type, onDismiss });
  };

  const closeNotification = () => {
    const onDismiss = notification?.onDismiss;
    setNotification(null);
    onDismiss?.();
  };

  const login = (identifier: string, pass?: string) => {
    if (!pass) return false;
    const isEmail = identifier.includes('@');
    const matchesRegisteredAccount = isEmail
      ? Boolean(user.email) && identifier.trim().toLowerCase() === user.email.trim().toLowerCase()
      : Boolean(user.cpf) && identifier.replace(/\D/g, '') === user.cpf.replace(/\D/g, '');

    // Sincroniza autenticação e estado com o Banco de Dados MySQL (suporta login após recarregar a página)
    mysqlApiService.loginUser(identifier, pass).then(async (res) => {
      if (res?.ok && res.state) {
        applyMysqlUserState(res.state);
        setRegisteredPassword(pass);
        setIsLoggedIn(true);
        setCurrentScreen(res.state.hasCompletedPassSelection ? 'home' : 'passSelection');
      } else if (matchesRegisteredAccount && user.cpf && user.email) {
        // Caso o cadastro tenha sido feito com o servidor reiniciando, persiste o usuário agora no MySQL
        const regRes = await mysqlApiService.registerUser({
          id: user.id,
          name: user.name,
          cpf: user.cpf,
          email: user.email,
          phone: user.phone,
          birthDate: user.birthDate,
          password: pass,
          whatsappAlerts: Boolean(user.whatsappAlerts),
        });
        if (regRes?.ok) {
          await mysqlApiService.loginUser(identifier, pass);
        }
      }
    });

    if (!registeredPassword || !matchesRegisteredAccount || pass !== registeredPassword) {
      return false;
    }

    setIsLoggedIn(true);
    setCurrentScreen(hasCompletedPassSelection ? 'home' : 'passSelection');

    // Persiste token de autenticação na tabela user_sessions do MySQL
    generateSecureJwt({
      userId: user.cpf || identifier,
      cpf: user.cpf,
      name: user.name,
      role: 'passenger',
    })
      .then((token) => {
        setSecureItem(SECURE_KEYS.AUTH_TOKEN, token);
        setSecureItem('user_token', token);
      })
      .catch((err) => console.warn('[Security] Failed to persist secure token:', err));

    setCards((prev) =>
      prev.map((c) => ({
        ...c,
        holder: user.name ? user.name.toUpperCase() : c.holder,
      }))
    );
    return true;
  };

  const loginAsync = async (identifier: string, pass: string): Promise<boolean> => {
    if (!pass) return false;
    const isEmail = identifier.includes('@');
    const matchesLocal = isEmail
      ? Boolean(user.email) && identifier.trim().toLowerCase() === user.email.trim().toLowerCase()
      : Boolean(user.cpf) && identifier.replace(/\D/g, '') === user.cpf.replace(/\D/g, '');

    if (registeredPassword && matchesLocal && pass === registeredPassword) {
      login(identifier, pass);
      return true;
    }

    const res = await mysqlApiService.loginUser(identifier, pass);
    if (res?.inactive) {
      setCurrentScreen('register');
      setTimeout(() => {
        showNotification(
          'Conta Inativada',
          res.error ||
            'Esta conta foi inativada. Realize o cadastro novamente para reativar seu acesso.',
          'error'
        );
      }, 60);
      return false;
    }
    if (res?.ok && res.state) {
      applyMysqlUserState(res.state);
      setRegisteredPassword(pass);
      setIsLoggedIn(true);
      setCurrentScreen(res.state.hasCompletedPassSelection ? 'home' : 'passSelection');
      return true;
    }
    return false;
  };

  const loginWithPhone = (phone: string) => {
    const phoneDigits = phone.replace(/\D/g, '');
    if (!phoneDigits || phoneDigits !== user.phone.replace(/\D/g, '')) return false;

    setIsLoggedIn(true);
    setCurrentScreen(hasCompletedPassSelection ? 'home' : 'passSelection');

    mysqlApiService.loginWithPhone(phone).then((res) => {
      if (res?.ok && res.state) {
        applyMysqlUserState(res.state);
      }
    });

    setCards((prev) =>
      prev.map((card) => ({
        ...card,
        holder: user.name ? user.name.toUpperCase() : card.holder,
      }))
    );
    return true;
  };

  const loginWithPhoneAsync = async (phone: string): Promise<boolean> => {
    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits && user.phone && phoneDigits === user.phone.replace(/\D/g, '')) {
      return loginWithPhone(phone);
    }
    const res = await mysqlApiService.loginWithPhone(phone);
    if (res?.ok && res.state) {
      applyMysqlUserState(res.state);
      setIsLoggedIn(true);
      setCurrentScreen(res.state.hasCompletedPassSelection ? 'home' : 'passSelection');
      return true;
    }
    return false;
  };

  const enterDemoMode = () => {
    if (!__DEV__) return;

    const demoCard = PASS_TYPE_OPTIONS.comum;
    const card: PassCard = {
      id: 'demo-card',
      type: 'comum',
      title: demoCard.title,
      tag: demoCard.tag,
      number: '1234',
      balance: 42.5,
      ridesCount: 9,
      holder: user.name ? user.name.toUpperCase() : 'PASSAGEIRO DEMO',
      isBlocked: false,
      colors: demoCard.colors,
    };

    setUser((previous) => ({
      ...previous,
      name: previous.name || 'Passageiro Demo',
    }));
    setCards((currentCards) => (currentCards.length > 0 ? currentCards : [card]));
    setSelectedCardId((currentId) => currentId || card.id);
    setHasCompletedPassSelection(true);
    setIsLoggedIn(true);
    setCurrentScreen('home');

    mysqlApiService
      .enterDemoMode({
        userId: user.id || user.cpf || 'usr_demo_smartcard',
        name: user.name || 'Passageiro Demo',
        card,
      })
      .then((res) => {
        if (res?.ok && res.state) {
          applyMysqlUserState(res.state);
        }
      });
  };

  const completePassSelection = (passType: CardType) => {
    const option = PASS_TYPE_OPTIONS[passType];
    const generatedSuffix = String(Math.floor(1000 + Math.random() * 9000));
    const isStudent = passType === 'estudante' || passType === 'universitario';
    const card: PassCard = {
      id: `card-${Date.now()}-1`,
      type: passType,
      title: option.title,
      tag: option.tag,
      number: generatedSuffix,
      balance: 0,
      ridesCount: 0,
      holder: (user.name || 'PASSAGEIRO SMARTCARD').toUpperCase(),
      isBlocked: false,
      colors: option.colors,
      ...(isStudent ? { validity: 'Dez / 2026', remainingQuota: 44 } : {}),
    };

    setCards((currentCards) => [...currentCards, card]);
    setSelectedCardId(card.id);
    setHasCompletedPassSelection(true);
    setCurrentScreen('home');

    mysqlApiService.createPassCard({
      ...card,
      userId: currentUserId,
      markPassSelectionComplete: true,
    });
  };

  const addFamilyMember = (member: Omit<FamilyMember, 'id'>) => {
    if (familyMembers.length >= 4) return false;
    const newMember: FamilyMember = { ...member, id: `family-member-${Date.now()}` };
    setFamilyMembers((currentMembers) => [...currentMembers, newMember]);
    mysqlApiService.addFamilyMember(currentUserId, newMember);
    return true;
  };

  const removeFamilyMember = (memberId: string) => {
    setFamilyMembers((currentMembers) => currentMembers.filter((m) => m.id !== memberId));
  };

  const requestBalanceLoan = (amount: number) => {
    setBalanceLoanRequest({
      amount,
      paymentMethod: 'Mercado Pago Pix',
      requestedAt: new Date().toISOString(),
      status: 'pending',
    });
    const targetCard = selectedCard || cards[0];
    if (targetCard) {
      rechargeCard(targetCard.id, amount, 'Empréstimo Emergencial (Mercado Pago)');
    }
    mysqlApiService.createCreditRequest({
      userId: currentUserId,
      requestType: 'balance_loan',
      amount,
      paymentMethod: 'Mercado Pago Pix',
    });
  };

  const settleBalanceLoan = (paymentMethod: string) => {
    setBalanceLoanRequest(null);
    mysqlApiService.settleCreditRequest({
      userId: currentUserId,
      requestType: 'balance_loan',
      paymentMethod,
    });
  };

  const requestCreditReserve = (amount: number, paymentMethod: string) => {
    setCreditReserveRequest({
      amount,
      paymentMethod,
      requestedAt: new Date().toISOString(),
      status: 'pending',
    });
    const targetCard = selectedCard || cards[0];
    if (targetCard) {
      rechargeCard(targetCard.id, amount, `Reserva de Crédito (${paymentMethod})`);
    }
    mysqlApiService.createCreditRequest({
      userId: currentUserId,
      requestType: 'credit_reserve',
      amount,
      paymentMethod,
    });
  };

  const settleCreditReserve = (paymentMethod: string) => {
    setCreditReserveRequest(null);
    mysqlApiService.settleCreditRequest({
      userId: currentUserId,
      requestType: 'credit_reserve',
      paymentMethod,
    });
  };

  const logout = () => {
    deleteSecureItem(SECURE_KEYS.AUTH_TOKEN);
    deleteSecureItem('user_token');
    mysqlApiService.logoutSession();
    setIsLoggedIn(false);
    setCurrentScreen('login');
  };

  const deleteAccountAsync = async (
    password: string
  ): Promise<{ ok: boolean; error?: string }> => {
    const cleanPassword = password.trim();
    if (!cleanPassword) {
      return { ok: false, error: 'Digite a senha da sua conta para confirmar a inativação.' };
    }

    const res = await mysqlApiService.deleteUserAccount({
      userId: currentUserId,
      cpf: user.cpf,
      email: user.email,
      password: cleanPassword,
    });

    if (!res.ok) {
      if (registeredPassword && cleanPassword === registeredPassword) {
        // Caso seja conta criada localmente em modo de testes, prossegue inativando localmente
      } else {
        return {
          ok: false,
          error: res.error || 'Senha incorreta. Digite a senha correta da sua conta.',
        };
      }
    }

    deleteSecureItem(SECURE_KEYS.AUTH_TOKEN);
    deleteSecureItem('user_token');
    setRegisteredPassword('');
    setUser({
      name: '',
      cpf: '',
      email: '',
      phone: '',
      biometricsEnabled: false,
      twoFactorEnabled: false,
      whatsappAlerts: false,
      role: 'commuter',
      kycStatus: 'verified',
    });
    setCards([]);
    setSelectedCardId(null);
    setTransactions([]);
    setPaymentCards([]);
    setFamilyMembers([]);
    setBalanceLoanRequest(null);
    setCreditReserveRequest(null);
    setNotifications([]);
    setHasCompletedPassSelection(false);
    setIsLoggedIn(false);
    setCurrentScreen('register');

    return { ok: true };
  };

  const register = (
    name: string,
    cpf: string,
    email: string,
    phone: string,
    password: string,
    whatsappAlerts: boolean,
    birthDate?: string
  ) => {
    const formattedName = name.trim();
    const newUserId = `usr_${Date.now()}`;
    setUser({
      id: newUserId,
      name: formattedName,
      cpf,
      email,
      phone,
      birthDate,
      biometricsEnabled: false,
      twoFactorEnabled: false,
      whatsappAlerts,
    });
    setRegisteredPassword(password);

    mysqlApiService
      .registerUser({
        id: newUserId,
        name: formattedName,
        cpf,
        email,
        phone,
        birthDate,
        password,
        whatsappAlerts,
      })
      .then((res) => {
        if (res?.ok && res.user?.id) {
          setUser((prev) => ({ ...prev, id: res.user!.id }));
        }
      });

    setCards([]);
    setSelectedCardId(null);
    setHasCompletedPassSelection(false);
    setFamilyMembers([]);
    setBalanceLoanRequest(null);
    setCreditReserveRequest(null);

    setTransactions([]);
    setNotifications([]);

    setIsLoggedIn(false);
    setCurrentScreen('login');
  };

  const updateUser = (updates: Partial<User>) => {
    setUser((prev) => ({ ...prev, ...updates }));
    mysqlApiService.updateUser(currentUserId, updates);
  };

  const resetPassword = (identifier: string, newPassword: string) => {
    const cleanId = identifier.trim().toLowerCase();
    const matchesEmail = Boolean(user.email) && cleanId === user.email.trim().toLowerCase();
    const matchesCpf =
      Boolean(user.cpf) && identifier.replace(/\D/g, '') === user.cpf.replace(/\D/g, '');
    if (!matchesEmail && !matchesCpf) return false;
    setRegisteredPassword(newPassword);
    mysqlApiService.resetPassword(identifier, newPassword);
    return true;
  };

  const resetPasswordAsync = async (identifier: string, newPassword: string): Promise<boolean> => {
    const localOk = resetPassword(identifier, newPassword);
    const mysqlOk = await mysqlApiService.resetPassword(identifier, newPassword);
    if (mysqlOk) {
      setRegisteredPassword(newPassword);
      return true;
    }
    return localOk;
  };

  const rechargeCard = (cardId: string, amount: number, paymentMethod: string) => {
    const FARE = 4.4;
    setCards((prev) =>
      prev.map((c) => {
        if (c.id === cardId) {
          const newBal = c.balance + amount;
          return {
            ...c,
            balance: newBal,
            ridesCount: Math.floor(newBal / FARE),
          };
        }
        return c;
      })
    );

    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      cardId,
      type: 'recharge',
      title: 'Recarga de Saldo',
      subtitle: `${paymentMethod} • Confirmado`,
      amount,
      date: 'Hoje',
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      icon: 'bolt',
    };

    setTransactions((prev) => [newTx, ...prev]);

    const newNotif: TransitNotification = {
      id: `notif-${Date.now()}`,
      title: 'Recarga Confirmada',
      message: `R$ ${amount.toFixed(2).replace('.', ',')} creditados via ${paymentMethod}.`,
      time: 'Agora mesmo',
      type: 'recharge',
      read: false,
      icon: 'bolt',
    };
    setNotifications((prev) => [newNotif, ...prev]);

    mysqlApiService.rechargeCard(cardId, {
      userId: currentUserId,
      txId: newTx.id,
      amount,
      paymentMethod,
      title: newTx.title,
      date: newTx.date,
      time: newTx.time,
      icon: newTx.icon,
    });
  };

  const transferBalance = (
    sourceId: string,
    targetInfo: string,
    amount: number,
    isExternal: boolean,
    options?: { paidViaMercadoPago?: boolean; paymentMethod?: string }
  ): boolean => {
    const paidViaMp = Boolean(options?.paidViaMercadoPago);
    const paymentLabel =
      options?.paymentMethod || (paidViaMp ? 'Mercado Pago Pix' : 'Saldo do Passe');
    const src = cards.find((c) => c.id === sourceId);
    if (!paidViaMp && (!src || src.balance < amount)) return false;

    const FARE = 4.4;

    setCards((prev) =>
      prev.map((c) => {
        if (!paidViaMp && c.id === sourceId) {
          const newBal = c.balance - amount;
          return { ...c, balance: newBal, ridesCount: Math.floor(newBal / FARE) };
        }
        if (!isExternal && c.id === targetInfo) {
          const newBal = c.balance + amount;
          return { ...c, balance: newBal, ridesCount: Math.floor(newBal / FARE) };
        }
        return c;
      })
    );

    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      cardId: sourceId || targetInfo,
      type: 'transfer_out',
      title: isExternal ? `Transferência p/ ${targetInfo}` : 'Transferência entre passes',
      subtitle: `${paymentLabel} • Sem taxa`,
      amount: -amount,
      date: 'Hoje',
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      icon: 'swap-horiz',
    };

    setTransactions((prev) => [newTx, ...prev]);

    mysqlApiService.transferBalance({
      userId: currentUserId,
      txId: newTx.id,
      sourceId,
      targetInfo,
      amount,
      isExternal,
      paidViaMercadoPago: paidViaMp,
      paymentMethod: paymentLabel,
    });

    return true;
  };

  const toggleCardBlock = (cardId: string) => {
    setCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, isBlocked: !c.isBlocked } : c))
    );
    mysqlApiService.toggleCardBlock(cardId);
  };

  const addNewCard = (cardData: Omit<PassCard, 'id' | 'balance' | 'ridesCount' | 'isBlocked'>) => {
    const isStudent = cardData.type === 'estudante' || cardData.type === 'universitario';
    const newCard: PassCard = {
      ...cardData,
      number: cardData.number || String(Math.floor(1000 + Math.random() * 9000)),
      holder: (cardData.holder || user.name || 'PASSAGEIRO SMARTCARD').toUpperCase(),
      id: `card-${Date.now()}`,
      balance: 0,
      ridesCount: 0,
      isBlocked: false,
      ...(isStudent
        ? {
            validity: cardData.validity || 'Dez / 2026',
            remainingQuota: cardData.remainingQuota ?? 44,
          }
        : {}),
    };
    setCards((prev) => [...prev, newCard]);
    setSelectedCardId(newCard.id);
    mysqlApiService.createPassCard({
      ...newCard,
      userId: currentUserId,
    });
  };

  const addPaymentCard = (card: PaymentCard) => {
    setPaymentCards((prev) => [card, ...prev]);
    mysqlApiService.addPaymentCard(currentUserId, card);
  };

  const removePaymentCard = (cardId: string) => {
    setPaymentCards((prev) => prev.filter((c) => c.id !== cardId));
  };

  const updateAutoRecharge = (config: Partial<AutoRechargeConfig>) => {
    setAutoRecharge((prev) => {
      const next = { ...prev, ...config };
      mysqlApiService.updateAutoRecharge(currentUserId, next);
      return next;
    });
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    mysqlApiService.markNotificationAsRead(id);
  };

  const renewStudentProof = (cardId: string, fileName: string) => {
    setCards((prev) =>
      prev.map((c) => {
        if (c.id === cardId) {
          return {
            ...c,
            validity: 'Dez / 2027',
            remainingQuota: 50,
          };
        }
        return c;
      })
    );

    const newNotif: TransitNotification = {
      id: `notif-${Date.now()}`,
      title: 'Comprovante Aprovado',
      message: `Comprovante ${fileName} validado com sucesso. Seu Passe Estudante foi renovado até Dez/2027.`,
      time: 'Agora mesmo',
      type: 'transit',
      read: false,
      icon: 'school',
    };
    setNotifications((prev) => [newNotif, ...prev]);
    mysqlApiService.renewStudentProof(cardId, currentUserId, fileName);
  };

  const syncCorporateBalance = (cardId: string) => {
    const BONUS = 50.0;
    const FARE = 4.4;
    setCards((prev) =>
      prev.map((c) => {
        if (c.id === cardId) {
          const newBal = c.balance + BONUS;
          return {
            ...c,
            balance: newBal,
            ridesCount: Math.floor(newBal / FARE),
          };
        }
        return c;
      })
    );

    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      cardId,
      type: 'recharge',
      title: 'Depósito Convênio Corporativo',
      subtitle: 'Tech Solutions Inc. • Folha de Pagamento',
      amount: BONUS,
      date: 'Hoje',
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      icon: 'domain',
    };
    setTransactions((prev) => [newTx, ...prev]);

    mysqlApiService.rechargeCard(cardId, {
      userId: currentUserId,
      txId: newTx.id,
      amount: BONUS,
      paymentMethod: 'Folha de Pagamento Corporativa',
      title: newTx.title,
      date: newTx.date,
      time: newTx.time,
      icon: newTx.icon,
    });
  };

  return (
    <AppContext.Provider
      value={{
        user,
        isLoggedIn,
        hasCompletedPassSelection,
        isScreenLoading,
        familyMembers,
        balanceLoanRequest,
        creditReserveRequest,
        isDarkMode,
        toggleTheme,
        currentScreen,
        cards,
        selectedCard,
        transactions,
        autoRecharge,
        notifications,
        transitLines,
        paymentCards,
        isQrModalOpen,
        isStatementModalOpen,
        isNewCardModalOpen,
        isNotificationsModalOpen,
        isProofModalOpen,
        isAddCardModalOpen,
        isChatModalOpen,
        isTermsModalOpen,
        isPrivacyModalOpen,
        isNetworkModalOpen,
        socialAuthModal,
        confirmDialog,
        successReceipt,
        notification,
        setCurrentScreen,
        goBackScreen,
        setSelectedCardId,
        setQrModalOpen,
        setStatementModalOpen,
        setNewCardModalOpen,
        setNotificationsModalOpen,
        setProofModalOpen,
        setAddCardModalOpen,
        setChatModalOpen,
        setTermsModalOpen,
        setPrivacyModalOpen,
        setNetworkModalOpen,
        openSocialAuthModal,
        closeSocialAuthModal,
        authenticateSocialAccount,
        unlinkSocialAccount,
        showConfirmDialog,
        closeConfirmDialog,
        showSuccessReceipt,
        closeSuccessReceipt,
        showNotification,
        closeNotification,
        login,
        loginAsync,
        loginWithPhone,
        loginWithPhoneAsync,
        enterDemoMode,
        completePassSelection,
        addFamilyMember,
        removeFamilyMember,
        requestBalanceLoan,
        settleBalanceLoan,
        requestCreditReserve,
        settleCreditReserve,
        logout,
        deleteAccountAsync,
        register,
        updateUser,
        resetPassword,
        resetPasswordAsync,
        rechargeCard,
        transferBalance,
        toggleCardBlock,
        addNewCard,
        addPaymentCard,
        removePaymentCard,
        updateAutoRecharge,
        markNotificationAsRead,
        renewStudentProof,
        syncCorporateBalance,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
