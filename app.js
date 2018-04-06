"use strict";

const express = require('express');
const app = express();
const routes = require('./routes');

const bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use('/', routes);

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
