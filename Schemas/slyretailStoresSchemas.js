import mongoose from 'mongoose';
import { type } from 'os';
// Suppress the deprecation warning
mongoose.set('strictQuery', true);

// Define the schema for the Tax (both VAT and ZTE)
const StoresSchema = new mongoose.Schema({
    StoreName: {
        type: String,
    },
    StoreId: {
        type: String
    }
});

const StoresModel = (db) => {
    // Create the model with the specific connection
    return db.model('stores', StoresSchema);
};
export { StoresModel };

