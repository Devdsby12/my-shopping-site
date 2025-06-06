app.post('/order', async (req, res) => {
  try {
    const { name, mobile, state, district, address } = req.body;

    // Save order to DB
    const order = new Order({ name, mobile, state, district, address });
    await order.save();

    // Setup email transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_FROM,
        pass: process.env.EMAIL_PASS, // Must be App Password, not Gmail password
      }
    });

    // Send order email
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: process.env.EMAIL_TO,
      subject: '🛒 New Order',
      text: `Name: ${name}\nMobile: ${mobile}\nState: ${state}\nDistrict: ${district}\nAddress: ${address}`
    });

    res.send('✅ Order placed!');

  } catch (error) {
    console.error('❌ Order Error:', error.message);
    res.status(500).send('❌ Failed to place order. Please try again later.');
  }
});
