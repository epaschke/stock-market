const { Pool } = require('pg');

const pool = new Pool({ database: process.env.DATABASE_NAME });

const traders = {
  create: async (trader) => {
    return await pool.query(`INSERT INTO traders (name) VALUES ($1) RETURNING *`,
      [trader.name]);
  }
};

const orders = {
  getAll: async () => {
    return await pool.query(`SELECT * FROM orders`);
  },

  create: async (order) => {
    let oppType = order.type === 'bid' ? 'ask' : 'bid';
    let gtlt = oppType === 'ask' ? '<=' : '>=';

    let matching = await pool.query(`SELECT * FROM orders WHERE ticker = $1 AND type = $2
      AND fulfilled < quantity AND price ${gtlt} $3 LIMIT $4`,
      [order.ticker, oppType, order.price, order.quantity]);

    if (!matching.length){
      return await pool.query(`INSERT INTO orders (trader_id, type, ticker, price, quantity)
        VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [order.trader_id, order.type, order.ticker, order.price, order.quantity]);
    } else {
      // if there are matching ones
      return { rows: [{success: true}]};
    }
  }
};

const portfolios = {
  create: async (portfolio) => {
    // let res = await pool.query(``, [])
  }
};

module.exports = {
  pool,
  traders,
  orders,
  portfolios
}
