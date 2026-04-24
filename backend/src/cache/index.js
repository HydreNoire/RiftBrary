const NodeCache = require('node-cache');

// TTL 5 minutes, check des clés expirées toutes les 60s
const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

module.exports = cache;