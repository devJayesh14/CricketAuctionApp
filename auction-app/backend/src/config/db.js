const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect("mongodb+srv://bsp7779:FNo92TAJCIj0Yfgv@cluster0.i4orfae.mongodb.net/cricket-auction?retryWrites=true&w=majority");
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

module.exports = connectDB;
