const { traderFns, orderFns, portfolioFns } = require('./queries');
const pool = require('./db');
const express = require('express');
const router = express.Router();

router.post('/traders', async (req, res, next) => {
  try {
    let trader = (await traderFns.create(req.body)).rows[0];
    res.json(trader);
  }
  catch (e) {
    next(e);
  }
});

router.get('/portfolios/:ticker', async (req, res, next) => {
  try {
    let portfolios = (await portfolioFns.get(req.params.ticker)).rows;
    res.json({ portfolios });
  }
  catch (e) {
    next(e);
  }
});

router.get('/orders', async (req, res, next) => {
  try {
    let orders = (await orderFns.getAll()).rows;
    res.json({ orders });
  }
  catch (e) {
    next(e);
  }
});

router.post('/orders', async (req, res, next) => {
  try {
    let order = (await orderFns.create(req.body)).rows[0];
    res.json(order);
  }
  catch (e) {
    next(e);
  }
});

module.exports = router;
