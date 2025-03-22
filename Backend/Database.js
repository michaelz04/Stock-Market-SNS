const Pool = require('pg').Pool;

const pool = new Pool({
  host: '34.0.37.168',
  database: 'postgres',
  port: 5432,
  password: 'postgres',
  user: 'postgres'
});

module.exports = pool;