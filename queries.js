const pool = require('./db');

const traders = {
  create: async (trader) => {
    return await pool.query(`INSERT INTO traders (name) VALUES ($1) RETURNING *`, [trader.name]);
  }
};

const portfolios = {
  updateOrCreate: async (client, order, ordersFilled) => {
    // check if there is already a portfolio for the ticker & trader_id
    let exists = (await client.query(`SELECT * FROM portfolios WHERE ticker = $1 AND trader_id = $2 FOR UPDATE`,
      [order.ticker, order.trader_id])).rows.length;

    let queryString;
    if (exists){
      queryString = `UPDATE portfolios SET quantity = quantity + $3 WHERE ticker = $1 AND trader_id = $2`
    } else {
      queryString = `INSERT INTO portfolios (trader_id, ticker, quantity) VALUES ($2, $1, $3)`;
    }
    await client.query(queryString, [order.ticker, order.trader_id, ordersFilled || order.quantity]);
  }
}

const orders = {
  getAll: async () => {
    return await pool.query(`SELECT * FROM orders`);
  },

  create: async (order) => {
    if (order.ticker === 'B') console.log('b here');
    let client = await pool.connect();
    client.query('BEGIN');

    let ordersFilled = 0;
    let oppType = order.type === 'bid' ? 'ask' : 'bid';

    // select potential matching orders
    let matching = (await client.query(`SELECT * FROM orders WHERE ticker = $1 AND type = $2 AND fulfilled < quantity AND price ${oppType === 'ask' ? '<=' : '>='} $3 LIMIT $4 FOR UPDATE`,
      [order.ticker, oppType, order.price, order.quantity])).rows;

    if (matching.length){ // There are orders that match the current order
      ordersFilled = await orders.update(client, matching, order);
      await portfolios.updateOrCreate(client, order, ordersFilled, true);
    }
    else if (!matching.length && order.type === 'ask') { // add or subtract from portfolio
      await portfolios.updateOrCreate(client, order, ordersFilled, false);
    }

    // create order
    let orderCreated = await client.query(`INSERT INTO orders (trader_id, type, ticker, price, quantity, fulfilled) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [order.trader_id, order.type, order.ticker, order.price, order.quantity, ordersFilled]);

    await client.query('COMMIT');
    await client.release();
    return orderCreated;
  },

  update: async (client, matching, order) => {
    // loop through matching orders until there are no more or until the current order has been filled
    let cur = 0;
    let ordersFilled = 0;
    while (ordersFilled < order.quantity && cur < matching.length){
      // subtract number filled from the quantity available
      let poss = matching[cur].quantity - matching[cur].fulfilled;
      let possFilled = 0;
      while (poss && ordersFilled < order.quantity) {
        ordersFilled++;
        possFilled++;
        poss--;
      }

      // update order and portfolio for each matched order
      await client.query(`UPDATE orders SET fulfilled = fulfilled + $1 WHERE id = $2`,
        [possFilled, matching[cur].id]);
      await client.query(`UPDATE portfolios SET quantity = quantity - $1 WHERE trader_id = $2 AND ticker = $3`,
        [possFilled, matching[cur].trader_id, order.ticker]);
      cur++;
    }

    return ordersFilled;
  }
};

module.exports = { traders, orders };
