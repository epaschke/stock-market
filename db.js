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

    let matching = await pool.query(`SELECT * FROM orders WHERE ticker = $1 AND type = $2
      AND fulfilled < quantity AND price ${oppType === 'ask' ? '<=' : '>='} $3 LIMIT $4`,
      [order.ticker, oppType, order.price, order.quantity]);

    if (!matching.rows.length){
      return await pool.query(`INSERT INTO orders (trader_id, type, ticker, price, quantity)
        VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [order.trader_id, order.type, order.ticker, order.price, order.quantity]);
    } else {
      // if there are matching ones
      let ordersFilled = 0;
      let cur = 0;
      while (ordersFilled < order.quantity && cur < matching.rows.length){
        let poss = matching.rows[cur].quantity - matching.rows[cur].fulfilled;
        let possFilled = 0;
        while (poss && ordersFilled < order.quantity) {
          ordersFilled++;
          possFilled++;
          poss--;
        }
        await pool.query(`UPDATE orders SET fulfilled = fulfilled + $1 WHERE id = $2`,
          [possFilled, matching.rows[cur].id]);
        cur++;
      }
      return await pool.query(`INSERT INTO orders (trader_id, type, ticker, price, quantity, fulfilled)
        VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [order.trader_id, order.type, order.ticker, order.price, order.quantity, ordersFilled]);
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
