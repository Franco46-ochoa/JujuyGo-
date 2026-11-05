const assert = require("node:assert");
const { saluda } = require("./saluda");

assert.strictEqual(saluda("Jujuy"), "Hola, Jujuy!", "saluda con nombre");
assert.strictEqual(saluda(""), "Hola, mundo!", "saluda con string vacío");
console.log("2 tests pasaron");
