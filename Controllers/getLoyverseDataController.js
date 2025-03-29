import moment from "moment-timezone";
import axios from "axios";
import { ObjectId } from 'mongodb';
import { CashflowModel } from '../Schemas/slyretailCashflowSchemas.js';
import { StoresModel } from '../Schemas/slyretailStoresSchemas.js';
import { CurrenciesModel } from '../Schemas/slyretailCurrenciesSchemas.js';
import { CashflowCategoriesModel } from '../Schemas/slyretailCategoriesSchemas.js';
import { connectDB } from '../Schemas/slyretailDbConfig.js';
import { CredentialsModel } from '../Schemas/slyretailLoginSchemas.js';
import { Console } from "console";

import { MongoClient } from 'mongodb';
//=================================================================================================================================================
//THIS CALCULATES ALL THE CASH INFLOWS AND OUTFLOWS FOR A PARTICULAR PERIOD AND PRESENTS IT TO THE USER ON AN ASCENDING ORDER
let cashFlows = []
let amUpdated = false;
let modifiedCount;
let amDeleted = false;
let isSaving = false;
let isSaved = false;
let insertedDocuments = [];
let updatedDocuments = [];
let insertedCategories = [];
let databaseName = ""
let signingCriteria = ""
let anyUpdateSuccessful = ''

// function to get all the stors from loyverse
const STORES_URL = "https://api.loyverse.com/v1.0/stores";
const SHIFTS_URL = "https://api.loyverse.com/v1.0/shifts";
const POSDEVICE_URL = "https://api.loyverse.com/v1.0/pos_devices";
const MERCHANT_URL = "https://api.loyverse.com/v1.0/merchant";

//==============================================================================================================

export async function getStores(req, sessionId) {
    try {
        let storeNames = [];
        const db = await connectDB(req, databaseName, signingCriteria, sessionId);
        if (!db) {
            throw new Error('Failed to connect to the database');
        }
        // Create the model with the specific connection
        const myStoresModel = StoresModel(db);
        const myCredentialsModelModel = CredentialsModel(db);
        const storeExist = await myStoresModel.findOne({ StoreName: 'DEFAULT' });
        if (!storeExist) {
            try {
                const storeEntry = new myStoresModel({ StoreName: 'DEFAULT', StoreId: '1' });
                await storeEntry.save()
            }
            catch (error) {
                console.error("Error saving store", error);
            }
        }
        //if the loyverse field exist save the loyverse token to session and alse if ts not empty
        const mytoken = await myCredentialsModelModel.findOne({ thirdPartyToken: { $exists: true } });
        let existingthirdPartyToken = ''
        if (mytoken) {
            if (mytoken.thirdPartyToken !== '') {
                req.session.thirdPartyToken = mytoken.thirdPartyToken
                existingthirdPartyToken = mytoken.thirdPartyToken
            }

        }
        let allStores = await myStoresModel.find();

        if (existingthirdPartyToken !== '' && allStores.length > 1) {
            //take whats in db
            for (let i = 0; i < allStores.length; i++) {
                //if it doesnt exist in the storesNames array push it
                if (!storeNames.includes(allStores[i].StoreName)) {
                    storeNames.push(allStores[i].StoreName)
                }
            }

        }
        else if (existingthirdPartyToken === '' && allStores.length === 1) {
            //take whats in db
            for (let i = 0; i < allStores.length; i++) {
                //if it doesnt exist in the storesNames array push it
                if (!storeNames.includes(allStores[i].StoreName)) {
                    storeNames.push(allStores[i].StoreName)
                }
            }
        }
        else {
            // Create the model with the specific connection
            const myCredentialModel = CredentialsModel(db);
            const storesResponse = await axios.get(STORES_URL, {
                headers: { Authorization: `Bearer ${existingthirdPartyToken}` },
            });
            // Extract stores from the response
            const { stores } = storesResponse.data;
            if (!Array.isArray(stores)) {
                throw new Error("Stores data is not an array");
            }
            const merchantResponse = await axios.get(MERCHANT_URL, {
                headers: { Authorization: `Bearer ${existingthirdPartyToken}` },
            });
            const merchant = merchantResponse.data;
            //store the merchant id in the user details
            // update the token in database
            const updatedResult = await myCredentialModel.updateOne({ thirdPartyToken: existingthirdPartyToken }, {
                $set: {
                    merchantId: merchant.id
                }
            })
            if (updatedResult.modifiedCount > 0) {
                isSaved = true
            }
            // Extract store names and store id
            storeNames = stores.map(store => (store.name));
            //push a default store named Defaults
            storeNames.push('DEFAULT');
            //save the stores from loyverse in the database
            for (let i = 0; i < stores.length; i++) {
                try {
                    const storeEntry = new myStoresModel({ StoreName: stores[i].name, StoreId: stores[i].id });
                    await storeEntry.save()
                }
                catch (error) {
                    console.error("Error saving store", error);
                }
            }
        }
        //IF THE TOKEN ONLY EXIST THATS WHEN ONE IS ABLE TO GET DATA DROM LOYVERSE
        if (existingthirdPartyToken) {
            //get all computations from getShifts
            await getShifts(req, db)
        }
        return { storeNames: storeNames };
    } catch (error) {
        console.error("Error fetching stores from Loyverse API:", error);
        throw error; // Re-throw the error to be handled by the caller
    }
}
//==================================================================================================================
function dateValidation(csvDate) {
    let formattedDate = "";
    if (csvDate.length > 10) {
        // if it contains T split using T else split using ""
        if (csvDate.includes('T')) {
            csvDate = csvDate.split('T')[0];
        }
        else {
            csvDate = csvDate.split(' ');
        }
        // const formattedDate1 = (csvDate).split(' ')
        if (csvDate) {
            //NOW SPLIT THE DATE TO BE IN THE FORM DD/MM/YYYY
            let parts1
            parts1 = (csvDate).split("-");

            if (parts1[0].length === 4) {
                csvDate = parts1[2] + "/" + parts1[1] + "/" + parts1[0];
            }
        }
    }
    csvDate = csvDate.replace(/[.,-]/g, "/");
    const parts = csvDate.split("/");
    if (parts.length === 3) {
        const day = parseInt(parts[0]);
        const month = parseInt(parts[1]);
        //  const year = parseInt(parts[2]);
        let year = 0;
        //check if the length of the part year is ===4
        //if ===2 add the 20 pekutanga
        if (parts[2].length === 4) {
            year = parseInt(parts[2]);
        } else if (parts[2].length === 2) {
            year = "20" + parseInt(parts[2]);
        }
        else if (parts[2].length === 1) {
            year = '200' + parseInt(parts[2])
        }
        const currentYear = new Date().getFullYear();
        if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 2015 && year <= currentYear) {
            // Date is valid, construct the formatted date string in "dd/mm/yyyy" format
            //.padStart(2, "0") ensures that the resulting string has a minimum length of 2 characters by padding the left side with zeros ("0") if necessary.
            formattedDate = `${day.toString().padStart(2, "0")}/${month.toString().padStart(2, "0")}/${year.toString()}`;
        }
    }
    return formattedDate;
}


const getPosDeviceName = (shifts, posDevices) => {
    let allPosDevices = []
    for (const shift of shifts) {
        const posDevice = posDevices.find(device => device.id === shift.pos_device_id);
        if (posDevice) {
            // return posDevice.name; // Return the name as soon as a match is found
            allPosDevices.push(posDevice.name)
        }
    }
    return allPosDevices;
};

async function getShifts(req, db) {
    try {
        let allShifts = [];

        // // Create the model with the specific connection
        const myStoresModel = StoresModel(db);

        let allStores = await myStoresModel.find();
        //get the pos details
        const posDevicesResponse = await axios.get(POSDEVICE_URL, {
            headers: { Authorization: `Bearer ${req.session.thirdPartyToken}` },
        });
        // Extract stores from the response
        const posDevices = posDevicesResponse.data.pos_devices;
        const shiftsResponse = await axios.get(SHIFTS_URL, {
            headers: { Authorization: `Bearer ${req.session.thirdPartyToken}` },
        });
        // Extract stores from the response
        const { shifts } = shiftsResponse.data;
        if (!Array.isArray(shifts)) {
            throw new Error("shifts data is not an array");
        }

        // // Extract cash movements from each shift
        // allShifts = shifts.map(shift => shift.cash_movements).flat();
        //CODE TO GET THE STORE NAME
        const getStoreName = (shifts, allStores) => {
            for (const shift of shifts) {
                const matchedStore = allStores.find(store => store.StoreId === shift.store_id);
                if (matchedStore) {
                    return matchedStore.StoreName; // Return the name as soon as a match is found
                }
            }
            return null; // Return null if no match is found
        };

        //CODE TO GET THE POSDEVICE NAME
        const storeName = getStoreName(shifts, allStores);
        //store this name in a session
        req.session.storeName = storeName;
        //store this name in a session
        // req.session.posDeviceName = posDeviceName;
        await saveDataToDb(req, databaseName, posDevices, storeName, shifts, db);
    } catch (error) {
        console.error("Error fetching shifts from Loyverse API:", error);
        throw error; // Re-throw the error to be handled by the caller
    }
}
async function populateArrays(date, shiftPos, invoiceNo, description, currency, category, amount, rate, type, store, cashEquivValue, db, loyverseId) {
    const rowData = {
        CashFlowDate: date,
        CashFlowType: type,
        CashFlowShift: shiftPos,
        CashFlowInvoiceRef: invoiceNo,
        CashFlowDescription: description,
        CashFlowCategory: category,
        CashFlowCurrency: currency,
        CashFlowAmount: amount,
        CashFlowRate: rate,
        CashFlowCashEquiv: cashEquivValue,
        StoreName: store,
        LoyverseId: loyverseId,
        Tax: {
            vat: { QRCode: "", DeviceId: 0, ZimraFsNo: '', VatNumber: 0, TinNumber: 0, VatAmount: 0, VatStatus: "N" },
            ztf: { First: '', Second: '', LevyAmount: 0, ZtfStatus: "N" }
        }
    };

    // Check if the data already exists
    const dataExists = await functionToCheckIfDataExist(rowData, db);
    if (!dataExists) {
        return rowData; // Return the row data if it doesn't exist
    }
    return null; // Return null if the data exists
}

async function functionToCheckIfDataExist(rowData, db) {
    try {
        const myCashflowModel = CashflowModel(db);
        const exists = await myCashflowModel.findOne({
            LoyverseId: rowData.LoyverseId
        }).select('_id').lean();

        if (exists) {
            return true; // Document exists
        } else {
            return false; // Document doesn't exist
        }
    } catch (error) {
        console.error("Error checking if data exists:", error);
        throw error;
    }
}


async function saveDataToDb(req, databaseName, posDevices, storeName, shifts, db) {
    try {
        if (db === '') {
            // Handle database connection
            let sessionId = '';
            db = await connectDB(req, databaseName, signingCriteria, sessionId);
            if (!db) {
                throw new Error('Failed to connect to the database');
            }
        }

        const myCurrenciesModel = CurrenciesModel(db);
        const baseCurrency = await myCurrenciesModel.findOne({ BASE_CURRENCY: 'Y' });
        if (!baseCurrency) throw new Error("Base currency not found");

        let allCashFlows = [];

        // Process each shift
        for (const shift of shifts) {
            // Fetch POS device name for the current shift
            const posDeviceNames = getPosDeviceName([shift], posDevices);
            const posDevice = posDeviceNames[0] || 'Unknown POS';

            // Process cash_movements for the current shift
            if (shift.cash_movements && shift.cash_movements.length > 0) {
                for (const movement of shift.cash_movements) {
                    const date = dateValidation(movement.created_at);
                    const shiftPos = posDevice;
                    const invoiceNo = '';
                    const description = movement.comment;
                    const currency = 'USD';
                    const rate = 1;
                    const category = 'suspense';
                    const amount = movement.money_amount;
                    const type = movement.type === 'PAY_OUT' ? 'Payout' : 'Pay in';
                    const relativeRate = rate / baseCurrency.RATE;
                    const cashEquivValue = Number(parseFloat(amount) / parseFloat(relativeRate)).toFixed(2);
                    const store = storeName;
                    const loyverseId = shift.id; // Assuming you want to use the shift ID as the Loyverse ID

                    // Populate row data for the cash movement
                    const rowData = await populateArrays(date, shiftPos, invoiceNo, description, currency, category, amount, rate, type, store, cashEquivValue, db, loyverseId);

                    // Check for duplicates before pushing to allCashFlows
                    if (rowData && !allCashFlows.some(cashFlow =>
                        cashFlow.CashFlowDate === rowData.CashFlowDate &&
                        cashFlow.CashFlowType === rowData.CashFlowType &&
                        cashFlow.CashFlowShift === rowData.CashFlowShift &&
                        cashFlow.CashFlowInvoiceRef === rowData.CashFlowInvoiceRef &&
                        cashFlow.CashFlowDescription === rowData.CashFlowDescription &&
                        cashFlow.CashFlowCategory === rowData.CashFlowCategory &&
                        cashFlow.CashFlowCurrency === rowData.CashFlowCurrency &&
                        cashFlow.CashFlowAmount === rowData.CashFlowAmount &&
                        cashFlow.CashFlowRate === rowData.CashFlowRate &&
                        cashFlow.CashFlowCashEquiv === rowData.CashFlowCashEquiv &&
                        cashFlow.StoreName === rowData.StoreName &&
                        cashFlow.LoyverseId === rowData.LoyverseId
                    )) {
                        allCashFlows.push(rowData);
                    }
                }
            }
        }

        // Perform bulk insert if there's data to insert
        if (allCashFlows.length > 0) {
            const myCashflowModel = CashflowModel(db);
            const operations = allCashFlows.map(item => ({
                insertOne: { document: item }
            }));

            const result = await myCashflowModel.bulkWrite(operations);
            isSaving = true;
        } else {
            isSaving = false;
        }

        return { isSaving };
    } catch (error) {
        console.error("Error in saveDataToDb:", error);
        throw error;
    }
}
export async function getDatabaseName(req, shifts, merchant_id) {
    const uri = "mongodb+srv://slyretailpos:1234marsr@cluster0.kv9k65a.mongodb.net/?retryWrites=true&w=majority";
    const client = new MongoClient(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });

    try {
        // Connect to the MongoDB client
        await client.connect();
        console.log("Connected to MongoDB to get database name");

        // Get the list of databases
        const adminDb = client.db().admin();
        const databasesList = await adminDb.listDatabases();
        const databases = databasesList.databases.map(db => db.name);

        // Use Promise.all to check all databases concurrently
        const results = await Promise.all(databases.map(async (dbName) => {
            const db = client.db(dbName);
            // Get the list of collections in the current database
            const collections = await db.listCollections().toArray();

            for (const collectionInfo of collections) {
                const collectionName = collectionInfo.name;
                const collection = db.collection(collectionName);

                // Check if the token exists in the current collection
                const query = { merchantId: merchant_id };
                const result = await collection.findOne(query);

                // If the token is found
                if (result) {
                    // Connect to the database which has the token
                    let databaseName = dbName;
                    let sessionId = '';
                    const db = await connectDB(req, databaseName, signingCriteria, sessionId);
                    if (!db) {
                        throw new Error('Failed to connect to the database');
                    }
                    const myStoresModel = StoresModel(db);

                    let allStores = await myStoresModel.find();
                    const posDevicesResponse = await axios.get(POSDEVICE_URL, {
                        headers: { Authorization: `Bearer ${result.thirdPartyToken}` },
                    });
                    // Extract POS devices from the response
                    const posDevices = posDevicesResponse.data.pos_devices;
                    req.session.thirdPartyToken = result.thirdPartyToken;

                    // Iterate through shifts to find a matching store and POS device
                    for (const shift of shifts) {
                        // Ensure the shift has a store_id
                        if (!shift.store_id) {
                            console.warn("Shift is missing store_id:", shift);
                            continue; // Skip this shift and move to the next one
                        }

                        // Find the matching store
                        const matchedStore = allStores.find(store => store.StoreId === shift.store_id);
                        const posDevice = posDevices.find(device => device.id === shift.pos_device_id);

                        if (matchedStore && posDevice) {
                            return {
                                databaseName, // Include the database name in the result
                                storeName: matchedStore.StoreName,
                                posDeviceName: posDevice.name
                            };
                        }
                    }

                    // If no match is found, return null
                    console.warn("No matching store or POS device found for the given shifts.");
                    return {
                        databaseName, // Include the database name even if no match is found
                        storeName: null,
                        posDeviceName: null
                    };
                }
            }
        }));

        // Filter out null results and return the first valid result
        const validResult = results.find(result => result && (result.storeName || result.posDeviceName));
        return validResult || {
            databaseName: null, // Return null for databaseName if no valid result is found
            storeName: null,
            posDeviceName: null
        };

    } catch (error) {
        console.error("Error:", error);
        throw error; // Re-throw the error to handle it in the calling function
    }
}


export async function nameOfStoreAndPOSdeviceName(req, shifts) {
    // Create the model with the specific connection
    const db = await connectDB(req, databaseName, signingCriteria, sessionId);
    const myStoresModel = StoresModel(db);

    let allStores = await myStoresModel.find();
    const posDevicesResponse = await axios.get(POSDEVICE_URL, {
        headers: { Authorization: `Bearer ${req.session.thirdPartyToken}` },
    });
    // Extract POS devices from the response
    const posDevices = posDevicesResponse.data.pos_devices;

    // Iterate through shifts to find a matching store and POS device
    for (const shift of shifts) {
        // Ensure the shift has a store_id
        if (!shift.store_id) {
            console.warn("Shift is missing store_id:", shift);
            continue; // Skip this shift and move to the next one
        }

        // Find the matching store
        const matchedStore = allStores.find(store => store.StoreId === shift.store_id);
        const posDevice = posDevices.find(device => device.id === shift.pos_device_id);

        if (matchedStore && posDevice) {
            return { storeName: matchedStore.StoreName, posDeviceName: posDevice.name }; // Return both names as soon as a match is found
        }
    }

    // If no match is found, return null
    console.warn("No matching store or POS device found for the given shifts.");
    return { storeName: null, posDeviceName: null };
}
export { saveDataToDb }