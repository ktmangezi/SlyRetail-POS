
import mongoose from 'mongoose';

// Define a function that returns the CredentialsSchema with specific values
const CredentialsSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true
    },
    User_Account: {
        type: String,
        required: true
    },
    DbPassword: {
        type: String,
        required: true
    },
    Email: {
        type: String,
    },
    thirdPartyToken: {
        type: String,
    },
    merchantId: {
        type: String,
    }
    // Add more fields as needed
});

// Create a model based on the schema
const CredentialsModel = (db) => {
    // Create the model with the specific connection
    return db.model('User', CredentialsSchema);
};
export { CredentialsModel };


