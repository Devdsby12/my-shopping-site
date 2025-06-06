const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const basicAuth = require('express-basic-auth');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;

const Product = require('./models/product');
const Order = require('./models/order');

dotenv.config();
const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// ✅ Serve static files from "public" folder
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB error:', err));

// Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'products',
    allowed_formats: ['jpg', 'png', 'jpeg'],
    transformation: [{ width: 800, crop: "scale" }]
  }
});

const upload = multer({ storage });

// 🔐 Admin Auth
app.use('/admin', basicAuth({
  users: { 'imadmin$': 'wwdevkhati1@gmail.com' },
  challenge: true
}));

// ➕ Admin Upload Page
app.get('/admin.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.post('/admin/add-product', upload.array('images'), async (req, res) => {
  const { title, price, description } = req.body;
  const imageUrls = req.files.map(file => file.path);

  const product = new Product({ title, price, description, imageUrls });
  await product.save();
  res.send('✅ Product added!');
});

// 🛍 Products List
app.get('/products', async (req, res) => {
  const products = await Product.find().sort({ createdAt: -1 });
  res.json(products);
});

// 🧾 Order Form (Fixed Version)
app.post('/order', async (req, res) => {
  try {
    const { name, mobile, state, district, address } = req.body;

    const order = new Order({ name, mobile, state, district, address });
    await order.save();

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
      replyTo: process.env.EMAIL_TO,  // ✅ Make replies go to the recipient
      subject: '🛒 New Order',
      text: `Name: ${name}\nMobile: ${mobile}\nState: ${state}\nDistrict: ${district}\nAddress: ${address}`
    });

    res.send('✅ Order placed!');
  } catch (err) {
    console.error('❌ Order Error:', err.message);
    res.status(500).send('❌ Failed to place order. Please try again later.');
  }
});

// 🏠 Home Route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
