const MOCK_USERS = [
    {
        _id: 'user_001',
        mobile: '9876543210',
        pin: '$2a$10$QlWeRbubIA94cNEVdxiV1.GRf44fNQCcBJ0Y1dos3lIbsv2.MkkmYq', // hashed '1234'
        bankId: 'bank_001',
        bankCode: 'UBGB001',
        isVerified: true,
        isActive: true,
        languagePreference: 'hi',
        name: 'Ramesh Kumar Yadav',
        email: 'ramesh@example.com',
        address: 'Village Rampur, Muzaffarpur, Bihar',
        state: 'Bihar',
        cbsId: 'CBS_001',
    },
    {
        _id: 'user_002',
        mobile: '9123456780',
        pin: '$2a$10$QlWeRbubIA94cNEVdxiV1.GRf44fNQCcBJ0Y1dos3lIbsv2.MkkmYq', // hashed '1234'
        bankId: 'bank_002',
        bankCode: 'JRGB001',
        isVerified: true,
        isActive: true,
        languagePreference: 'en',
        name: 'Sunita Devi',
        email: 'sunita@example.com',
        address: '15, Lal Colony, Ranchi, Jharkhand',
        state: 'Jharkhand',
        cbsId: 'CBS_002',
    },
    {
        _id: 'user_003',
        mobile: '9988776655',
        pin: '$2a$10$QlWeRbubIA94cNEVdxiV1.GRf44fNQCcBJ0Y1dos3lIbsv2.MkkmYq', // hashed '1234'
        bankId: 'bank_003',
        bankCode: 'MGB001',
        isVerified: true,
        isActive: true,
        languagePreference: 'mr',
        name: 'Ganesh Patil',
        email: 'ganesh@example.com',
        address: 'Near Shiv Mandir, Aurangabad, Maharashtra',
        state: 'Maharashtra',
        failedAttempts: 0,
        lockUntil: null,
        cbsId: 'CBS_003',
    },
];

module.exports = MOCK_USERS;
