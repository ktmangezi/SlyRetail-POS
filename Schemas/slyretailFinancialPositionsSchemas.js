import mongoose from 'mongoose';
// Suppress the deprecation warning
mongoose.set('strictQuery', true);

// Define the CredentialsSchema
const FinancialPositionSchema = new mongoose.Schema({
    PPE: {
        type: Number,
        required: true
    },
    INVENTORY: {
        type: Number
    },
    DEBTORS: {
        type: Number
    },
    CASH: {
        type: Number
    },
    SHARE_CAPITAL: {
        type: Number
    },
    TAXATION: {
        type: Number,
        required: true
    },
    CREDITORS: {
        type: Number,
        required: true
    },
    LONG_TERM_LOAN: {
        type: Number,
        required: true
    },
    DATE: {
        type: Number,
        required: true
    },
    // Add more fields as needed
});
const FinancialPositionModel = (db) => {
    // Create the model with the specific connection
    return db.model('financialPosition', FinancialPositionSchema);
};
export { FinancialPositionModel };

