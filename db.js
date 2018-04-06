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
      if (order.type === 'ask'){
        let exists = await pool.query(`SELECT * FROM portfolios WHERE ticker = $1 AND trader_id = $2`,
          [order.ticker, order.trader_id]);
        let string;
        if (exists.rows.length){
          string = `UPDATE portfolios SET quantity = quantity + $3 WHERE ticker = $1 AND trader_id = $2 RETURNING *`
        } else {
          string = `INSERT INTO portfolios (trader_id, ticker, quantity) VALUES ($2, $1, $3) RETURNING *`;
        }
        await pool.query(string, [order.ticker, order.trader_id, order.quantity]);
      }
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
        await pool.query(`UPDATE portfolios SET quantity = quantity - $1 WHERE trader_id = $2 AND ticker = $3`,
          [possFilled, matching.rows[cur].trader_id, order.ticker]);
        cur++;
      }
      let exists = await pool.query(`SELECT * FROM portfolios WHERE ticker = $1 AND trader_id = $2`,
        [order.ticker, order.trader_id]);
      let string;
      if (exists.rows.length){
        string = `UPDATE portfolios SET quantity = quantity + $3 WHERE ticker = $1 AND trader_id = $2 RETURNING *`
      } else {
        string = `INSERT INTO portfolios (trader_id, ticker, quantity) VALUES ($2, $1, $3) RETURNING *`;
      }
      await pool.query(string, [order.ticker, order.trader_id, ordersFilled]);
      return await pool.query(`INSERT INTO orders (trader_id, type, ticker, price, quantity, fulfilled)
        VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [order.trader_id, order.type, order.ticker, order.price, order.quantity, ordersFilled]);
    }
  }
};

module.exports = {
  pool,
  traders,
  orders
}
