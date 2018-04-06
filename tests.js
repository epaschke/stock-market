const app = require('./app');
const chai = require('chai');
const chaiHttp = require('chai-http');
chai.use(chaiHttp);

const { pool } = require('./db');
const { promisify } = require('util');
const fs = require('fs');
const readFile = promisify(fs.readFile);

const reset = async () => {
  let script = await readFile('reset.sql', 'utf8');
  await pool.query(script);
};

describe("basic", () => {
  beforeEach(async function() {
    await reset();
    await pool.query('INSERT INTO traders (name) VALUES ($1), ($2)', ["trader1", "trader2"]);
  });

  it("beforeEach created traders", async () => {
    let res = await pool.query('SELECT * FROM traders');
    let traders = res.rows;
    chai.expect(traders.length).to.equal(2);
    chai.expect(traders[0].id).to.equal(1);
    chai.expect(traders[0].name).to.equal("trader1");
    chai.expect(traders[1].id).to.equal(2);
    chai.expect(traders[1].name).to.equal("trader2");
  })

  it("trader post route works", async () => {
    await chai.request(app).post('/traders').send({ "name": "NAME"}).then((res) => {
      chai.expect(res).to.have.status(200);
    });
  });

  it("creation of one order works", async () => {
    await chai.request(app).post('/orders').send({ trader_id: 1, type: 'bid', ticker: 'X', price: 10, quantity: 2 })
    .then((res) => {
      chai.expect(res.body.fulfilled).to.equal(0);
      chai.expect(res.body.trader_id).to.equal(1);
    });
  });

  it("creation of four matching orders works", async () => {
    await chai.request(app).post('/orders').send({ trader_id: 1, type: 'bid', ticker: 'X', price: 10, quantity: 2 })
    .then((res) => {
      chai.expect(res.body.fulfilled).to.equal(0);
    });

    await chai.request(app).post('/orders').send({ trader_id: 2, type: 'ask', ticker: 'X', price: 10, quantity: 2 })
    .then((res) => {
      chai.expect(res.body.fulfilled).to.equal(2);
    });

    await chai.request(app).post('/orders').send({ trader_id: 2, type: 'ask', ticker: 'X', price: 10, quantity: 2 })
    .then((res) => {
      chai.expect(res.body.fulfilled).to.equal(0);
    });

    await chai.request(app).post('/orders').send({ trader_id: 1, type: 'bid', ticker: 'X', price: 10, quantity: 1 })
    .then((res) => {
      chai.expect(res.body.fulfilled).to.equal(1);
    });
  })
});
