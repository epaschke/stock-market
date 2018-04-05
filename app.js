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
    console.log(trader.rows);
    res.json(trader.rows[0]);
  }
  catch (e) {
    next(e);
  }
});


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
