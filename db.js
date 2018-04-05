const { Pool } = require('pg');

const pool = new Pool({ database: process.env.DATABASE_NAME });

const traders = {
  create: async (trader) => {
    return await pool.query(`INSERT INTO traders (name) VALUES ($1) RETURNING *`, [trader.name]);
  }
};

const orders = {
  create: async (order) => {
    // let res = await pool.query(``, [])
  }
};

const portfolios = {
  create: async (porfolio) => {
    // let res = await pool.query(``, [])
  }
};

module.exports = {
  pool,
  traders,
  orders,
  portfolios
}
