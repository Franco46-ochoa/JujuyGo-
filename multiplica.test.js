const assert = require("node:assert");
const { multiplica } = require("./multiplica");

assert.strictEqual(multiplica(3, 4), 12, "multiplica dos números");
assert.strictEqual(multiplica("x", 4), 0, "rechaza argumentos no numéricos");
console.log("2 tests pasaron");
