const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Inicializa automaticamente o servidor Backend MySQL na porta 3001 e também no middleware do Metro (/api/*)
let backendServer = null;
try {
  const { server } = require('./backend/server');
  const { getMysqlPool, MYSQL_CONFIG } = require('./backend/db');
  backendServer = server;

  getMysqlPool()
    .then(() => {
      console.log(
        `[SmartCard BUS Auto-Backend] Pool MySQL conectado (${MYSQL_CONFIG.database})`
      );
    })
    .catch((err) => {
      console.warn('[SmartCard BUS Auto-Backend] Aviso MySQL:', err.message);
    });

  if (!backendServer.listening) {
    const port = Number(process.env.PORT || process.env.API_PORT || 3001);
    backendServer
      .listen(port, '0.0.0.0', () => {
        console.log(
          `[SmartCard BUS Auto-Backend] API MySQL iniciada automaticamente em http://localhost:${port}/api`
        );
      })
      .on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          console.log(
            `[SmartCard BUS Auto-Backend] Porta ${port} já está ativa com o servidor MySQL.`
          );
        }
      });
  }
} catch (err) {
  console.warn('[SmartCard BUS Auto-Backend] Não foi possível carregar backend no Metro:', err.message);
}

config.server = {
  ...config.server,
  enhanceMiddleware: (metroMiddleware) => {
    return (req, res, next) => {
      if (backendServer && req.url && req.url.startsWith('/api/')) {
        return backendServer.emit('request', req, res);
      }
      return metroMiddleware(req, res, next);
    };
  },
};

module.exports = config;

