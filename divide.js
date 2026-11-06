function divide(a, b) {
  if (b === 0) {
    return null;
  }
  return a / b;
}

divide.divide = divide;
module.exports = divide;
