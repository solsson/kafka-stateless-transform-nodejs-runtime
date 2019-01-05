/**
 * This is just a dummy handler to be overwritten with your own.
 * Simply COPY source with node_modules to /usr/src/app/
 */

let counter = 0;

module.exports = async function(arg) {
  // You can await stuff here or simply: return [{ arg }];
  return new Promise((resolve, reject) => setTimeout(() => resolve([
    { n: counter++, t: new Date().toISOString(), arg }
  ]), 100))
}
