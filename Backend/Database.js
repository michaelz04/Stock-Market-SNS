const Pool = require('pg').Pool;

const pool = new Pool({
  host: 'localhost',
  database: 'postgres',
  port: 5432,
  password: 'postgres',
  user: 'postgres'
});

module.exports = pool;