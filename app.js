"use strict";

const express = require('express');
const app = express();
const { pool, traders, orders, portfolios } = require('./db');

const bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.post('/traders', async (req, res, next) =>{
  try {
    let trader = await traders.create(req.body);
    res.json(trader.rows[0]);
  }
  catch (e) {
    next(e);
  }
});

app.get('/orders', async (req, res, next) => {
  try {
    let allOrders = await orders.getAll();
    res.json({ orders: allOrders.rows });
  }
  catch (e) {
    next(e);
  }
});

app.post('/orders', async (req, res, next) => {
  try {
    let order = await orders.create(req.body);
    res.json(order.rows[0]);
  }
  catch (e) {
    next(e);
  }
})

app.use((err, req, res, next) => {
  console.log('Error', err);
  res.status(500).json({
    error: err.message
  });
});

app.listen(3000, function() {
  console.log('Started listening on 3000');
});

module.exports = app;
