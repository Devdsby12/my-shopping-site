const mongoose = require('mongoose');
const orderSchema = new mongoose.Schema({
  name: String,
  mobile: String,
  state: String,
  district: String,
  address: String,
  time: { type: Date, default: Date.now }
});
module.exports = mongoose.model('Order', orderSchema);
