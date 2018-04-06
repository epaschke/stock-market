const { traders, orders, portfolios } = require('./queries');
const pool = require('./db');
const express = require('express');
const router = express.Router();

router.post('/traders', async (req, res, next) => {
  try {
    let trader = await traders.create(req.body);
    res.json(trader.rows[0]);
  }
  catch (e) {
    next(e);
  }
});

router.get('/portfolios/:ticker', async (req, res, next) => {
  try {
    let portfolio = await portfolios.get(req.params.ticker);
    res.json({ portfolios: portfolio.rows});
  }
  catch (e) {
    next(e);
  }
})

router.get('/orders', async (req, res, next) => {
  try {
    let allOrders = await orders.getAll();
    res.json({ orders: allOrders.rows });
  }
  catch (e) {
    next(e);
  }
});

router.post('/orders', async (req, res, next) => {
  try {
    let order = await orders.create(req.body);
    res.json(order.rows[0]);
  }
  catch (e) {
    next(e);
  }
});

module.exports = router;
