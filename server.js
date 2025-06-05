const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const basicAuth = require('express-basic-auth');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));

// ✅ Health check route for Render
app.get("/", (req, res) => {
  res.send("Server is running ✅");
});

// MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB error:', err));

// Schema
const orderSchema = new mongoose.Schema({
  name: String,
  address: String,
  time: { type: Date, default: Date.now }
});
const Order = mongoose.model('Order', orderSchema);

// Order form handler
app.post('/order', async (req, res) => {
  const { name, address } = req.body;
  const newOrder = new Order({ name, address });
  await newOrder.save();

  // Send email
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_FROM,
      pass: process.env.EMAIL_PASS
    }
  });

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: process.env.EMAIL_TO,
    subject: 'New Order Received',
    text: `Name: ${name}\nAddress: ${address}`
  });

  res.send('Order placed successfully!');
});

// Admin page (Basic Auth protected)
app.use('/admin', basicAuth({
  users: { 'imadmin$': 'wwdevkhati1@gmail.com' },
  challenge: true
}));

app.get('/admin', async (req, res) => {
  const orders = await Order.find().sort({ time: -1 });
  const html = orders.map(order => `
    <p><strong>${order.name}</strong><br>${order.address}<br><em>${order.time.toLocaleString()}</em></p>
    <hr>
  `).join('');
  res.send(`<h2>Orders</h2>${html}`);
});

// ✅ Start server on correct port for Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
