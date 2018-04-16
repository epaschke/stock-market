const pool = require('./db');

// TRADER FUNCTIONS
const traders = {
  // creates a trader with a name param
  create: async (trader) => {
    return await pool.query(`INSERT INTO traders (name) VALUES ($1) RETURNING *`, [trader.name]);
  }
};

// PORTFOLIO FUNCTIONS
const portfolios = {
  // gets all portfolios for a certain ticker
  get: async (ticker) => {
    return await pool.query(`SELECT * FROM portfolios WHERE ticker = $1 AND quantity > 0`, [ticker]);
  },

  // updates or creates a portfolio for a trader and ticker
  updateOrCreate: async (client, order, ordersFilled, addToPortfolio) => {
    // check if there is already a portfolio for the ticker & trader_id
    let exists = (await client.query(`SELECT * FROM portfolios WHERE ticker = $1 AND trader_id = $2 FOR UPDATE`,
      [order.ticker, order.trader_id])).rows.length;
    let operator = addToPortfolio ? '+' : '-';

    //create query string based on exists & operator
    let queryString = exists ?
        `UPDATE portfolios SET quantity = quantity ${operator} $3 WHERE ticker = $1 AND trader_id = $2` :
        `INSERT INTO portfolios (trader_id, ticker, quantity) VALUES ($2, $1, $3)`;

    //quantity created w/ portfolio OR quantity to be added/subtracted
    let quant = exists && addToPortfolio ? ordersFilled || order.quantity : order.quantity - ordersFilled;

    await client.query(queryString, [order.ticker, order.trader_id, quant]);
  }
}

// ORDER FUNCTIONS
const orders = {
  // returns all orders
  getAll: async () => {
    return await pool.query(`SELECT * FROM orders`);
  },

  // creates an order
  create: async (order) => {
    // create a client to contain all queries with the same connection
    let client = await pool.connect();
    client.query('BEGIN');

    // initialize ordersFilled to 0
    let ordersFilled = 0;

    // determine opposite type & appropriate operator for SQl query
    let oppositeType = order.type === 'bid' ? 'ask' : 'bid';
    let gtlt = order.type === 'bid' ? '<=' : '>=';

    // select potential matching orders based on oppositeType & gtlt
    let matchingOrders = (await client.query(`SELECT * FROM orders WHERE ticker = $1 AND type = $2 AND trader_id != $3 AND
      fulfilled < quantity AND price ${gtlt} $4 LIMIT $5 FOR UPDATE`,
      [order.ticker, oppositeType, order.trader_id, order.price, order.quantity])).rows;

    // if there are orders that match the current order
    if (matchingOrders.length){
      // try to fill the order with the matching orders, returns number of orders that were filled
      ordersFilled = await orders.fillOrder(client, matchingOrders, order);
    }

    // if it's a sale, add or subtract shares to the portfolio
    if (order.type === 'ask') {
      // update the portfolio, either add or subtract based on whether or not there were matching orders that were filled
      await portfolios.updateOrCreate(client, order, ordersFilled, !matchingOrders.length);
    }

    // create order
    let orderCreated = await client.query(`INSERT INTO orders (trader_id, type, ticker, price, quantity, fulfilled)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [order.trader_id, order.type, order.ticker, order.price, order.quantity, ordersFilled]);

    //commit query, release client
    await client.query('COMMIT');
    await client.release();

    //return the order that was created
    return orderCreated;
  },

  // attempts to fill an order with matching orders
  fillOrder: async (client, matchingOrders, order) => {
    // loop through matching orders until there are no more or until the current order has been filled
    let ordersFilled = 0;
    let ordersToBeFilled = order.quantity;

    for (let match of matchingOrders) {
      let matchHasFilled = 0;
      let matchCanFill = match.quantity - match.fulfilled;

      // match has quant to give & order needs more quant
      while (matchCanFill && ordersFilled < ordersToBeFilled) {
        ordersFilled++;
        matchHasFilled++;
        matchCanFill--;
      }

      // update order and portfolio for each matched order
      await client.query(`UPDATE orders SET fulfilled = fulfilled + $1 WHERE id = $2`, [matchHasFilled, match.id]);
      await portfolios.updateOrCreate(client, match, matchHasFilled, false);

      // break from loop if the order has been filled
      if (ordersFilled >= ordersToBeFilled) {
        break;
      }
    }

    // return the number of orders that were able to be filled
    return ordersFilled;
  }
};

module.exports = {
  traderFns: traders,
  orderFns: orders,
  portfolioFns: portfolios };
