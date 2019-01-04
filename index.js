/**
 * This is just a dummy handler to be overwritten with your own.
 * Simply COPY source with node_modules to /usr/src/app/
 */

module.exports = async function(arg) {
  // You can await stuff here or simply: return { dummyHandlerGotArg: arg };
  return new Promise((resolve, reject) => setTimeout(() => resolve({ dummyHandlerGotArg: arg }), 100))
}
