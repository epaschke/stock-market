const app = require('./app');
const chai = require('chai');
const chaiHttp = require('chai-http');
chai.use(chaiHttp);

const { pool } = require('./db');
const { promisify } = require('util');
const fs = require('fs');
const readFile = promisify(fs.readFile);

async function reset() {
  let script = await readFile('reset.sql', 'utf8');
  await pool.query(script);
}

describe("basic", () => {
  beforeEach(async () => {
    await reset();
    await pool.query('INSERT INTO traders (id, name) VALUES ($1, $2), ($3, $4)', [1, "trader1", 2, "trader2"]);
  });

  it("beforeEach created traders", async function(){
    let res = await pool.query('SELECT * FROM traders');
    let traders = res.rows;
    chai.expect(traders.length).to.equal(2);
    chai.expect(traders[0].id).to.equal(1);
    chai.expect(traders[0].name).to.equal("trader1");
    chai.expect(traders[1].id).to.equal(2);
    chai.expect(traders[1].name).to.equal("trader2");
  })

  it("trader post route works", async function() {
    chai.request(app).post('/traders').send({ name: "NAME"}).end((err, res) => {
      expect(err).to.be.null;
      expect(res).to.have.status(200);
    });
  });
});
