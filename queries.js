const pool = require('./db');

const traders = {
  create: async (trader) => {
    return await pool.query(`INSERT INTO traders (name) VALUES ($1) RETURNING *`, [trader.name]);
  }
};

const portfolios = {
  get: async (ticker) => {
    return await pool.query(`SELECT * FROM portfolios WHERE ticker = $1 AND quantity > 0`, [ticker]);
  },

  updateOrCreate: async (client, order, ordersFilled, add) => {
    // check if there is already a portfolio for the ticker & trader_id
    let exists = (await client.query(`SELECT * FROM portfolios WHERE ticker = $1 AND trader_id = $2 FOR UPDATE`,
      [order.ticker, order.trader_id])).rows.length;

    let queryString;
    if (exists){
      queryString = `UPDATE portfolios SET quantity = quantity ${add ? '+' : '-'} $3 WHERE ticker = $1 AND trader_id = $2`
    } else {
      queryString = `INSERT INTO portfolios (trader_id, ticker, quantity) VALUES ($2, $1, $3)`;
    }
    if (exists && add){
      await client.query(queryString, [order.ticker, order.trader_id, ordersFilled || order.quantity]);
    } else {
      await client.query(queryString, [order.ticker, order.trader_id, order.quantity - ordersFilled]);
    }
  }
}

const orders = {
  getAll: async () => {
    return await pool.query(`SELECT * FROM orders`);
  },

  create: async (order) => {
    let client = await pool.connect();
    client.query('BEGIN');

    let ordersFilled = 0;
    let oppType = order.type === 'bid' ? 'ask' : 'bid';

    // select potential matching orders
    let matching = (await client.query(`SELECT * FROM orders WHERE ticker = $1 AND type = $2 AND trader_id != $3 AND fulfilled < quantity AND price ${oppType === 'ask' ? '<=' : '>='} $4 LIMIT $5 FOR UPDATE`,
      [order.ticker, oppType, order.trader_id, order.price, order.quantity])).rows;

    if (matching.length){ // There are orders that match the current order
      ordersFilled = await orders.update(client, matching, order);
    }

    if (!matching.length && order.type === 'ask') {
      await portfolios.updateOrCreate(client, order, ordersFilled, true);
    } else if (matching.length && order.type === 'ask') {
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
    let ordersFilled = 0;
    for (let matched of matching){
      let poss = matched.quantity - matched.fulfilled;
      let possFilled = 0;

      // subtract number filled from the quantity available
      while (poss && ordersFilled < order.quantity) {
        ordersFilled++;
        possFilled++;
        poss--;
      }

      // update order and portfolio for each matched order
      await client.query(`UPDATE orders SET fulfilled = fulfilled + $1 WHERE id = $2`, [possFilled, matched.id]);
      await portfolios.updateOrCreate(client, matched, possFilled, false);

      //break from loop
      if (ordersFilled >= order.quantity){
        break;
      }
    }
    return ordersFilled;
  }
};

module.exports = { traders, orders, portfolios };
