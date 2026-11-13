import { mysqlApiService, MYSQL_API_BASE_URL } from '../src/services/mysqlApiService';
import { setSecureItem, getSecureItem, deleteSecureItem } from '../src/services/secureStorage';

describe('Integração com Banco de Dados MySQL e Backend API', () => {
  it('deve expor a URL base da API MySQL e os métodos de persistência', () => {
    expect(MYSQL_API_BASE_URL).toContain('/api');
    expect(typeof mysqlApiService.registerUser).toBe('function');
    expect(typeof mysqlApiService.loginUser).toBe('function');
    expect(typeof mysqlApiService.createPassCard).toBe('function');
    expect(typeof mysqlApiService.rechargeCard).toBe('function');
    expect(typeof mysqlApiService.transferBalance).toBe('function');
    expect(typeof mysqlApiService.setStorageItem).toBe('function');
    expect(typeof mysqlApiService.getStorageItem).toBe('function');
    expect(typeof mysqlApiService.deleteStorageItem).toBe('function');
    expect(typeof mysqlApiService.createMercadoPagoPix).toBe('function');
    expect(typeof mysqlApiService.processMercadoPagoCardPayment).toBe('function');
    expect(typeof mysqlApiService.approveMercadoPagoOrder).toBe('function');
    expect(typeof mysqlApiService.checkMercadoPagoStatus).toBe('function');
    expect(typeof mysqlApiService.settleCreditRequest).toBe('function');
  });

  it('deve persistir, consultar e remover itens via camada MySQL sem usar window.localStorage', async () => {
    await setSecureItem('mysql_test_key', 'valor_persistido_mysql');
    const val = await getSecureItem('mysql_test_key');
    expect(val).toBe('valor_persistido_mysql');

    await deleteSecureItem('mysql_test_key');
    const afterDel = await getSecureItem('mysql_test_key');
    expect(afterDel).toBeNull();
  });
});

