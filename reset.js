"use strict";

const pool = require('./db');
const { promisify } = require('util');
const fs = require('fs');
const readFile = promisify(fs.readFile);

async function main() {
  let script = await readFile('reset.sql', 'utf8');
  await pool.query(script);
}

main()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
