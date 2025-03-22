const Pool = require('pg').Pool;

const pool = new Pool({
  host: '34.124.126.216',
  database: 'postgre',
  port: 5432,
});

module.exports = pool;