/**
 * Entrypoint Serverless da Vercel (/api/*)
 * Encaminha qualquer requisição para o servidor REST principal do SmartCard BUS.
 */
const { server } = require('../backend/server');

module.exports = (req, res) => {
  server.emit('request', req, res);
};

