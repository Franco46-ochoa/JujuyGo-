const assert = require("node:assert");
const { divide } = require("./divide");

assert.strictEqual(divide(10, 2), 5, "divide(10, 2) devuelve 5");
assert.strictEqual(divide(10, 0), null, "divide(10, 0) devuelve null");
console.log("2 tests pasaron");
