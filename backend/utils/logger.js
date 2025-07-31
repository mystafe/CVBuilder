function logStep(msg) {
  console.log(`[LOG ${new Date().toISOString()}] ${msg}`);
}
module.exports = { logStep };