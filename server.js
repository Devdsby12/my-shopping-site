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

// Serve static files from "public" folder
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB error:', err));

// Cloudinary config
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

// Admin Basic Auth (protect /admin routes)
app.use('/admin', basicAuth({
  users: { 'imadmin$': 'wwdevkhati1@gmail.com' },
  challenge: true
}));

// Serve admin upload page
app.get('/admin.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// ✅ Add new product with detailed error logging
app.post('/admin/add-product', upload.array('images'), async (req, res) => {
  try {
    const { title, price, description } = req.body;

    if (!req.files || req.files.length === 0) {
      console.error('❌ No images received:', req.files);
      return res.status(400).send('❌ No images uploaded');
    }

    const imageUrls = req.files.map(file => file.path);

    const product = new Product({ title, price, description, imageUrls });
    await product.save();

    res.send('✅ Product added!');
  } catch (error) {
    console.error('❌ Error adding product:');
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    console.error('Request Body:', req.body);
    console.error('Files:', req.files);
    res.status(500).send('❌ Internal Server Error: ' + error.message);
  }
});

// Get all products list
app.get('/products', async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).send('❌ Failed to load products');
  }
});

// Handle order submission
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
      replyTo: process.env.EMAIL_TO,
      subject: '🛒 New Order',
      text: `Name: ${name}\nMobile: ${mobile}\nState: ${state}\nDistrict: ${district}\nAddress: ${address}`
    });

    res.send('✅ Order placed!');
  } catch (err) {
    console.error('❌ Order Error:', err.message);
    res.status(500).send('❌ Failed to place order. Please try again later.');
  }
});

// Serve homepage
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
// Handle 404 errors