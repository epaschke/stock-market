const { Pool } = require('pg');

const pool = new Pool({ database: process.env.DATABASE_NAME });
// if using a URL, uncomment this line:
// const pool = new Pool({ connectionString: process.env.DATABASE_URL});

module.exports = pool;
