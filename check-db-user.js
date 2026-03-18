const mongoose = require('mongoose');
require('dotenv').config();

async function checkUser() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const User = mongoose.connection.collection('users');
        const user = await User.findOne({ mobile: '9988776655' });
        if (user) {
            console.log('User found in DB:', JSON.stringify(user, null, 2));
        } else {
            console.log('User not found in DB');
        }
        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

checkUser();
