function saluda(nombre) {
  return `Hola, ${nombre || "mundo"}!`;
}

module.exports = { saluda };
