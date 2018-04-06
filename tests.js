const app = require('./app');
const chai = require('chai');
const chaiHttp = require('chai-http');
chai.use(chaiHttp);

const pool = require('./db');
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

  it("creation of 2 matching orders", async () => {
    let res1 = await chai.request(app).post('/orders').send({ trader_id: 1, type: 'bid', ticker: 'X', price: 10, quantity: 2 })
    chai.expect(res1.body.fulfilled).to.equal(0);


    let portfolio1 = (await pool.query(`SELECT * FROM portfolios WHERE trader_id = $1 AND ticker = 'X'`, [1])).rows;
    chai.expect(portfolio1.length).to.equal(0);

    let res2 = await chai.request(app).post('/orders').send({ trader_id: 2, type: 'ask', ticker: 'X', price: 10, quantity: 2 })
    chai.expect(res2.body.fulfilled).to.equal(2);

    let portfolio2 = (await pool.query(`SELECT * FROM portfolios WHERE trader_id = $1 AND ticker = 'X'`, [2])).rows;
    chai.expect(portfolio2[0].quantity).to.equal(0);

  })

  it("creation of matching and unmatching orders works", async () => {
    await chai.request(app).post('/orders').send({ trader_id: 1, type: 'bid', ticker: 'X', price: 10, quantity: 2 })
    let portfolio1 = (await pool.query(`SELECT * FROM portfolios WHERE trader_id = $1 AND ticker = 'X'`, [1])).rows;
    chai.expect(portfolio1.length).to.equal(0);

    await chai.request(app).post('/orders').send({ trader_id: 2, type: 'ask', ticker: 'X', price: 10, quantity: 2 })

    let portfolio2 = (await pool.query(`SELECT * FROM portfolios WHERE trader_id = $1 AND ticker = 'X'`, [2])).rows;
    chai.expect(portfolio2[0].quantity).to.equal(0);

    await chai.request(app).post('/orders').send({ trader_id: 2, type: 'ask', ticker: 'X', price: 10, quantity: 2 })

    let portfolio3 = (await pool.query(`SELECT * FROM portfolios WHERE trader_id = $1 AND ticker = 'X'`, [2])).rows;
    chai.expect(portfolio3[0].quantity).to.equal(2);

    await chai.request(app).post('/orders').send({ trader_id: 1, type: 'bid', ticker: 'B', price: 10, quantity: 1 })

    let portfolio4 = (await pool.query(`SELECT * FROM portfolios WHERE trader_id = $1 AND ticker = 'B'`, [1])).rows;
    chai.expect(portfolio4.length).to.equal(0);

    let res = await chai.request(app).get('/portfolios/X')
      chai.expect(res.body.portfolios.length).to.equal(1);
  });


});
