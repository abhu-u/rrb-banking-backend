/**
 * Mock OTP Service
 * In production, replace sendOTP with Twilio / 2Factor.in integration
 */

const storedOTPs = new Map(); // mobile -> { otp, expiresAt, attempts }

const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

const sendOTP = async (mobile, purpose = 'login') => {
    // In production: call Twilio/2Factor API here
    // const otp = generateOTP();
    const otp = '123456'; // Fixed for development/demo
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    storedOTPs.set(mobile, { otp, expiresAt, attempts: 0, purpose });

    console.log(`📱 OTP for ${mobile}: ${otp} (expires: ${expiresAt.toISOString()})`);

    return {
        success: true,
        message: 'OTP sent successfully',
        // In production, don't return OTP in response
        devOtp: process.env.NODE_ENV === 'development' ? otp : undefined,
    };
};

const verifyOTP = async (mobile, otp) => {
    const stored = storedOTPs.get(mobile);

    if (!stored) {
        return { valid: false, message: 'OTP not found. Please request a new OTP.' };
    }

    if (new Date() > stored.expiresAt) {
        storedOTPs.delete(mobile);
        return { valid: false, message: 'OTP has expired. Please request a new one.' };
    }

    stored.attempts += 1;

    if (stored.attempts > 5) {
        storedOTPs.delete(mobile);
        return { valid: false, message: 'Too many attempts. Please request a new OTP.' };
    }

    if (stored.otp !== otp) {
        return { valid: false, message: 'Invalid OTP. Please try again.' };
    }

    storedOTPs.delete(mobile);
    return { valid: true, message: 'OTP verified successfully' };
};

module.exports = { sendOTP, verifyOTP, generateOTP };
