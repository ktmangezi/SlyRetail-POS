import mongoose from 'mongoose';
// Suppress the deprecation warning
mongoose.set('strictQuery', true);

// Define the schema for the Tax (both VAT and ZTE)
const TaxSchema = new mongoose.Schema({
    vat: {
        QRCode: {
            type: String,
        },
        DeviceId: {
            type: Number,
        },
        ZimraFsNo: {
            type: String,
        },
        VatNumber: {
            type: Number,
        },
        TinNumber: {
            type: Number,
        },
        VatAmount: {
            type: Number,
        },
        VatStatus: {
            type: String,
        }
    },
    ztf: {
        //     type: Object,   // Object type, meaning an empty object by default
        // default: {},    // Default empty object
        First: {
            type: String,
        },
        Second: {
            type: String,
        },
        LevyAmount: {
            type: Number,
        },
        ZtfStatus: {
            type: String,
        }
    },
});
// Define the CredentialsSchema
const CashflowSchema = new mongoose.Schema({
    CashFlowDate: {
        type: String,
        required: true
    },
    CashFlowShift: {
        type: String
    },
    Tax: {
        type: TaxSchema
    },
    CashFlowInvoiceRef: {
        type: String
    },
    CashFlowDescription: {
        type: String
    },
    CashFlowCategory: {
        type: String
    },
    CashFlowCurrency: {
        type: String,
        required: true
    },
    CashFlowAmount: {
        type: Number,
        required: true
    },
    CashFlowRate: {
        type: Number
    },
    CashFlowCashEquiv: {
        type: Number
    },
    CashFlowType: {
        type: String
    },
    StoreName: {
        type: String
    },
    LoyverseId: {
        type: String
    },

    // Add more fields as needed
});
const CashflowModel = (db) => {
    // Create the model with the specific connection
    return db.model('Cashflow', CashflowSchema);
};
export { CashflowModel };

