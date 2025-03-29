import { MongoClient, ObjectId } from 'mongodb';
import { CredentialsModel } from '../Schemas/slyretailLoginSchemas.js';
import { connectDB } from '../Schemas/slyretailDbConfig.js';
import { CurrenciesModel } from '../Schemas/slyretailCurrenciesSchemas.js';
import { accountingPeriodModel } from '../Schemas/slyretailAccountingPeriodSettingsSchemas.js';
import { advaHeadersModel } from '../Schemas/slyretailAdvCashMngmntHeadersSettingsSchemas.js';
import { CashflowModel } from '../Schemas/slyretailCashflowSchemas.js';
import { versionControlModel } from '../Schemas/slyretailVersionControlSchemas.js';
import { StoresModel } from '../Schemas/slyretailStoresSchemas.js';
import { v4 as uuidv4 } from 'uuid';
let cashFlows = []

let loggedInStatus = "False";
let currencies = [];
let dbConnection = null; // Global database connection
let currentVersion = "1.4"
let loggedInStatus2 = ""
let existingthirdPartyToken = ''
// SignUp/SignIn function
async function signUpSignIn(req, databaseName, email, databasePassword, signingCriteria, token) {
    try {
        if (signingCriteria === "Sign Up") {
            const db = await connectDB(req, databaseName, signingCriteria);
            if (db) {
                // Create the model with the specific connection
                const myaccountingPeriodModelModel = accountingPeriodModel(db);
                const myAdvHeadersModelModel = advaHeadersModel(db);
                const myversionControlModelModel = versionControlModel(db);
                const myCurrenciesModelModel = CurrenciesModel(db);
                const myCredentialsModelModel = CredentialsModel(db);
                const myStoresModel = StoresModel(db);

                loggedInStatus = await createDatabase(email, databaseName, databasePassword);
                req.session.userAccount = databaseName

                existingthirdPartyToken = await getExistingToken();
                // Function to all all necessary user account data
                async function createDatabase(email, databaseName, databasePassword) {
                    try {
                        // Create the model with the specific connection
                        currencies = await myCurrenciesModelModel.find()
                        //this is to keep the current structure of databases, the web interface does not have a version but the database will need to be controlled
                        const newVersionEntry = new myversionControlModelModel({ version: currentVersion });
                        await newVersionEntry.save()
                            .then(() => console.log('New version entry saved successfully!'))
                            .catch(error => {
                                console.error('Error saving version entry:', error);
                                if (error.errors) {
                                    console.log('Validation errors:', error.errors);
                                }
                            });
                        //EVERYTHING TO DO WITH DATABASE CREATION MUST HAPPEN HERE, eg creating all the neccessary collections
                        const collectionNames = [
                            'CostCentreCategories', "Customers", 'Employees', "Invoices", "Products", 'Sales', "Suppliers", 'Vouchers'
                        ];

                        for (let i = 0; i < collectionNames.length; i++) {
                            try {
                                const result = await db.createCollection(collectionNames[i]);
                            } catch (error) {
                                console.error("Error creating collections", error);
                            }
                        }

                        try {
                            const currencyEntry = new myCurrenciesModelModel({ Currency_Name: 'USD', paymentType: 'CASH', RATE: Number(1).toFixed(2), BASE_CURRENCY: 'Y' });
                            // const currencyEntry = new CurrenciesModel({ Currency_Name: 'USD', paymentType: 'CASH', RATE: Number(1).toFixed(2), BASE_CURRENCY: 'Y' });
                            const result = await currencyEntry.save();
                        } catch (error) {
                            console.error("Error inserting currencies", error);
                            return
                        }
                        try {
                            //a collection called accounting period
                            const currentYear = new Date().getFullYear();
                            const accountingEntry = new myaccountingPeriodModelModel({ startDate: (`${currentYear}-01-01`) });
                            const result = await accountingEntry.save();
                        } catch (error) {
                            console.error("Error inserting accounting period", error);
                            return
                        }
                        const data = [{ HeaderName: 'Date', isDisplayed: true }, { HeaderName: 'ShiftNo', isDisplayed: true },
                        { HeaderName: 'InvoiceRef', isDisplayed: true }, { HeaderName: 'Tax', isDisplayed: true }, { HeaderName: 'Description', isDisplayed: true },
                        { HeaderName: 'Category', isDisplayed: true }, { HeaderName: 'Currency', isDisplayed: true }, { HeaderName: 'Amount', isDisplayed: true },
                        { HeaderName: 'Rate', isDisplayed: true }, { HeaderName: 'Type', isDisplayed: true }, { HeaderName: 'CashEquiv', isDisplayed: true }, { HeaderName: 'RunningBalance', isDisplayed: true }]
                        try {
                            try {
                                // Using insertMany to insert multiple documents at once
                                await myAdvHeadersModelModel.insertMany(data);
                            } catch (error) {
                                console.error('Error saving adv headers:', error);
                            }

                        } catch (error) {
                            console.error('Error inserting headers:', error);
                        }
                        //saving the default store
                        try {
                            const storeEntry = new myStoresModel({ StoreName: 'DEFAULT', StoreId: '1' });
                            await storeEntry.save()
                        }
                        catch (error) {
                            console.error("Error saving store", error);
                        }
                        // Save credentials
                        const createAndSaveCredentials = async (User_Account, DbPassword, Email) => {
                            try {
                                let thirdPartyToken = ''
                                let userId = req.session.myDatabase
                                // await connectDB(databaseName);
                                const newCredentials = new myCredentialsModelModel({ userId, User_Account, DbPassword, Email, thirdPartyToken });
                                await newCredentials.save();
                                return "True";
                            } catch (error) {
                                console.error('Error saving credentials:', error);
                                return "False";
                            }
                        };

                        loggedInStatus2 = await createAndSaveCredentials(databaseName, databasePassword, email);

                        return loggedInStatus2
                    } catch (error) {
                        console.error('Error creating database:', error);
                        return "False";
                    }

                }
                async function getExistingToken() {
                    const mytoken = await myCredentialsModelModel.findOne({ thirdPartyToken: { $exists: true } });
                    try {
                        if (mytoken) {
                            if (mytoken.thirdPartyToken !== '') {
                                req.session.thirdPartyToken = credentials.thirdPartyToken
                                existingthirdPartyToken = mytoken.thirdPartyToken
                            }
                            else {
                                existingthirdPartyToken = 'no token'
                            }
                            return existingthirdPartyToken
                        }
                    } catch (error) {
                        console.error("Error occurred while querying CredentialsModel:", error);
                        return
                    }
                }
            }
            else {
                //THIS IS WHEN THE DATABASE NAME IS ALREADY EXISTING WITHIN THE SYSTEM, AND IT HAS BEEN CONFIRMED BY DBCONFIG
                loggedInStatus = " The User Already Exist";
                return { loggedInStatus, existingthirdPartyToken };
            }

        }

        if (signingCriteria === "Sign In") {
            try {
                // First check across all databases for the email
                const adminClient = new MongoClient("mongodb+srv://slyretailpos:1234marsr@cluster0.kv9k65a.mongodb.net/?retryWrites=true&w=majority", {
                    useNewUrlParser: true,
                    useUnifiedTopology: true
                });

                await adminClient.connect();
                const adminDb = adminClient.db('admin');

                // Get list of all databases
                const allDatabases = (await adminDb.admin().listDatabases()).databases
                    .filter(db => db.name.startsWith('user_') || db.name === databaseName);

                let targetDbName = null;
                let needsMigration = false;

                // Search all databases for the email
                for (const dbInfo of allDatabases) {
                    const tempDb = adminClient.db(dbInfo.name);
                    const credentialsCollection = tempDb.collection('users'); // Adjust collection name if needed

                    const user = await credentialsCollection.findOne({
                        User_Account: databaseName
                    });

                    if (user) {
                        if (user.userId) {
                            // Found with userId - use this database
                            targetDbName = dbInfo.name;
                            break;
                        } else {
                            // Found without userId - mark for migration
                            targetDbName = dbInfo.name;
                            needsMigration = true;
                            break;
                        }
                    }

                }
                req.session.userAccount = databaseName

                if (!targetDbName) {
                    // No database found with this email
                    loggedInStatus = "The User Does Not Exist";
                    return { loggedInStatus, existingthirdPartyToken };
                }
                let db;
                if (needsMigration) {
                    // Migrate data (using your existing migrateTenantDatabase function)
                    const newDBName = await migrateTenantDatabase(databaseName);
                    console.log(`Migration complete! New database: ${newDBName}`)
                    try {
                        db = await connectDB(req, newDBName, signingCriteria);
                        if (!db) {
                            //THIS IS WHEN THE DATABASE NAME IS ALREADY EXISTING WITHIN THE SYSTEM, AND IT HAS BEEN CONFIRMED BY DBCONFIG
                            loggedInStatus = "The User Does Not Exist";
                        }
                        const myCredentialsModelModel = CredentialsModel(db);
                        await myCredentialsModelModel.updateOne(
                            { User_Account: databaseName },
                            { $set: { userId: newDBName } },
                            { upsert: true } // This will create the field if it doesn't exist
                        );
                        // console.log(`Updated userId in credentials for ${databaseName} to ${newDBName}`);
                    } catch (error) {
                        console.error("Error updating userId in credentials:", error);
                    }
                    // Delete old DB after successful migration
                    try {
                        await adminClient.db(databaseName).command({ dropDatabase: 1 });
                    } catch (error) {
                        console.error(`Failed to delete old database: ${databaseName}`, error);
                    }

                } else {
                    // Connect to existing valid database
                    db = await connectDB(req, targetDbName, signingCriteria);
                }
                async function migrateTenantDatabase(oldDBName) {
                    try {
                        const oldDB = adminClient.db(oldDBName);
                        // Generate new DB name (22-char UUID without hyphens)
                        const newDBName = `user_${uuidv4().replace(/-/g, '').substring(0, 22)}`;
                        const newDB = adminClient.db(newDBName);
                        // Get all collections (excluding system collections)
                        const collections = (await oldDB.listCollections().toArray())
                            .filter(coll => !coll.name.startsWith('system.'));
                        // Copy each collection
                        for (const coll of collections) {
                            const docs = await oldDB.collection(coll.name).find().toArray();

                            if (docs.length > 0) {
                                await newDB.collection(coll.name).insertMany(docs, { ordered: false });
                            }
                            else {
                                //create the collection that dont have data to insert
                                await newDB.createCollection(coll.name);
                            }
                            // console.log(` Copied ${docs.length} documents to ${newDBName}.${coll.name}`);
                        }

                        // Verify counts match (optional)
                        for (const coll of collections) {
                            const oldCount = await oldDB.collection(coll.name).countDocuments();
                            const newCount = await newDB.collection(coll.name).countDocuments();
                            if (oldCount !== newCount) {
                                throw new Error(`Count mismatch in ${coll.name} (old: ${oldCount}, new: ${newCount})`);
                            }
                        }
                        return newDBName;
                    } catch (err) {
                        console.error('Migration failed:', err);
                        throw err;
                    }
                }


                // Create the model with the specific connection
                const myAdvHeadersModelModel = advaHeadersModel(db);
                const myCashflowModelModel = CashflowModel(db);
                const myversionControlModelModel = versionControlModel(db);
                const myCurrenciesModelModel = CurrenciesModel(db);
                const myCredentialsModelModel = CredentialsModel(db);
                const existingVersion = await myversionControlModelModel.find();

                try {
                    const credentials = await myCredentialsModelModel.findOne({ DbPassword: databasePassword });
                    if (credentials) { //THEN CHECK ALSO IF THE PASSWORD IS THERE AND MATCHING
                        loggedInStatus = "True";

                        currencies = await myCurrenciesModelModel.find()
                    } else {
                        loggedInStatus = "Password Do Not Match";
                    }

                } catch (error) {
                    console.error("Error occurred while querying CredentialsModel:", error);
                    return
                }
                //==============================================================
                //first check if the versioncontrols collection exist,if not create it
                //FOR UPGRADES
                try {
                    const collections = await db.db.listCollections().toArray();
                    const collectionName = 'versioncontrols'
                    const collectionExists = collections.some(col => col.name === collectionName);

                    if (!collectionExists) {
                        //this is to keep the current structure of databases, the web interface does not have a version but the database will need to be controlled
                        const newVersionEntry = new myversionControlModelModel({ version: currentVersion });
                        await newVersionEntry.save()
                            .then(() => console.log('New version entry saved successfully!'))
                            .catch(error => {
                                console.error('Error saving version entry:', error);
                                if (error.errors) {
                                    console.log('Validation errors:', error.errors);
                                }
                            });
                    }
                } catch (error) {
                    console.error("Error occurred while saving version:", error);
                    return
                }
                //===================================================

                existingthirdPartyToken = await getExistingToken();
                async function getExistingToken() {
                    const mytoken = await myCredentialsModelModel.findOne({ thirdPartyToken: { $exists: true } });
                    try {
                        if (mytoken) {
                            if (mytoken.thirdPartyToken !== '') {
                                req.session.thirdPartyToken = mytoken.thirdPartyToken
                                existingthirdPartyToken = mytoken.thirdPartyToken
                            }
                            else {
                                existingthirdPartyToken = 'no token'
                            }
                            return existingthirdPartyToken
                        }
                    } catch (error) {
                        console.error("Error occurred while querying CredentialsModel:", error);
                        return
                    }
                }
                //================================================================

                try {
                    // const db = await connectDB(databaseName, signingCriteria); // Reuse the connection globally
                    const cashflowData = db.collection('cashflows')
                    const CashflowData = await cashflowData.find().toArray()
                    //get the currencies
                    currencies = await myCurrenciesModelModel.find()


                    //next upgrade from 1 to 1.2
                    if (existingVersion[0].version === "1.2" && existingVersion[0].version !== currentVersion) {
                        try {
                            // Loop through each cash flow document
                            const cashFlows = await myCashflowModelModel.find();
                            for (let a = 0; a < cashFlows.length; a++) {
                                const row = cashFlows[a];
                                // Initialize Tax.vat if it doesn't exist
                                const documentVat = row.Tax.vat
                                const documentZtf = row.Tax.ztf
                                // Update Tax.vat and Tax.ztf for each row where Vat exists
                                if (documentVat.ZimraFsNo === '0') {
                                    documentVat.ZimraFsNo = ''
                                }
                                row.Tax.vat = {
                                    QRCode: documentVat.QRCode || '',       // Use actual values from documentVat
                                    DeviceId: documentVat.DeviceId || 0,
                                    ZimraFsNo: documentVat.ZimraFsNo || '',
                                    VatNumber: documentVat.VatNumber || 0,             // Setting the VatNumber as 0
                                    TinNumber: documentVat.TinNumber || 0,             // Setting the TinNumber as 0
                                    VatAmount: documentVat.VatAmount || 0,    // Corrected VatAmount reference
                                    VatStatus: documentVat.VatStatus || 'N' // Use VatStatus from Vat
                                };
                                row.Tax.ztf = {
                                    First: documentZtf.First || '',       // Use actual values from Vat
                                    Second: documentZtf.Second || '',
                                    LevyAmount: documentZtf.LevyAmount || 0,
                                    ZtfStatus: documentZtf.ZtfStatus || 'N',
                                }

                                const cashflowEntry = new myCashflowModelModel(row);
                                await cashflowEntry.save();
                            }
                        }
                        catch (error) {
                            console.error("Error during the operation:", error);
                        }
                        //set the latest version currentVersion
                        await myversionControlModelModel.updateOne(
                            { _id: ObjectId(existingVersion[0]._id) },
                            { $set: { version: currentVersion } } // Correct
                        )
                    }
                    //next upgrade (from 1.2 to 1.3) to tax
                    if (existingVersion[0].version === "1.3" && existingVersion[0].version !== currentVersion) { //and it must not be equal to the currentVersion
                        try {
                            // Log the filtered data to verify if Vat exists and is not empty
                            const vatExistsAndNotEmpty = CashflowData.filter(row =>
                                row.Vat && typeof row.Vat === 'object' && Object.keys(row.Vat).length > 0
                            );
                            // Loop through each cash flow document
                            const cashFlows = await myCashflowModelModel.find();
                            for (let a = 0; a < cashFlows.length; a++) {
                                const row = cashFlows[a];

                                // Initialize Tax if it doesn't exist
                                if (!row.Tax) {
                                    row.Tax = {};  // Ensure Tax is an object
                                }

                                // Initialize Tax.vat if it doesn't exist
                                row.Tax.vat = row.Tax.vat || {};  // Ensure Tax.vat is an object if it doesn't exist
                                row.Tax.ztf = row.Tax.ztf || {};  // Ensure Tax.ztf is an object if it doesn't exist
                                // Update Tax.vat and Tax.ztf for each row where Vat exists
                                vatExistsAndNotEmpty.forEach(documentVat => {
                                    const documentZtf = row.Tax.ztf
                                    if (documentVat.ZimraFsNo === '0') {
                                        documentVat.ZimraFsNo = ''
                                    } row.Tax.vat = {
                                        QRCode: documentVat.QRCode || '',       // Use actual values from documentVat
                                        DeviceId: documentVat.DeviceId || 0,
                                        ZimraFsNo: documentVat.ZimraFsNo || '',
                                        VatNumber: documentVat.VatNumber || 0,             // Setting the VatNumber as 0
                                        TinNumber: documentVat.TinNumber || 0,             // Setting the TinNumber as 0
                                        VatAmount: documentVat.VatAmount || 0,    // Corrected VatAmount reference
                                        VatStatus: documentVat.VatStatus || 'N' // Use VatStatus from Vat
                                    }
                                    row.Tax.ztf = {
                                        First: documentZtf.First || '',       // Use actual values from Vat
                                        Second: documentZtf.Second || '',
                                        LevyAmount: documentZtf.LevyAmount || 0,
                                        ZtfStatus: documentZtf.ZtfStatus || 'N',
                                    }

                                });
                                const cashflowEntry = new myCashflowModelModel(row);
                                await cashflowEntry.save();
                                // remove the Vat field using $unset directly on the database 
                                cashflowData.updateOne(
                                    { _id: row._id }, // Find the document by its _id
                                    {
                                        $unset: { "Vat": "" }      // Remove the Vat field
                                    }
                                );
                            }
                        }
                        catch (error) {
                            console.error("Error during the operation:", error);
                        }

                        //CHANGE HEADERNAME vAT TO tAX 

                        try {
                            await myAdvHeadersModelModel.updateOne({ HeaderName: 'Vat' }, {
                                $set: {
                                    HeaderName: 'Tax'
                                }
                            }).then(result => {
                                console.log(`${result.modifiedCount} document(s) updated.`);

                            })
                            // Check if the document already exists with HeaderName: 'Type'
                            const existingHeader = await myAdvHeadersModelModel.findOne({ HeaderName: 'Type' });

                            if (!existingHeader) {
                                // If the document doesn't exist, create a new one
                                const newHeader = new myAdvHeadersModelModel({ HeaderName: 'Type', isDisplayed: true });
                                const result = await newHeader.save();
                            }

                        } catch (err) {
                            console.error('Error connecting to MongoDB:', err);
                        }
                        //set the latest version currentVersion
                        await myversionControlModelModel.updateOne({ _id: ObjectId(existingVersion[0]._id) },
                            { set: { version: currentVersion } });
                        // }

                    }
                    //next upgrade from 1.3 to 1.4
                    if (existingVersion[0].version === "1.3") {
                        console.log('updating to latest version')
                        try {
                            if (existingVersion.length > 0) {
                                // Update the version field
                                const updateResult = await myversionControlModelModel.updateOne(
                                    { _id: ObjectId(existingVersion[0]._id) }, // Filter by _id
                                    { $set: { version: currentVersion } } // Update the version field
                                );

                                if (updateResult.modifiedCount > 0) {
                                    console.log('Version updated successfully');
                                } else {
                                    console.log('No changes were made');
                                }
                            } else {
                                console.log('No existing version document found');
                            }
                        } catch (error) {
                            console.error('Error updating version:', error);
                        }
                    }
                    if (existingVersion[0].version === "1.4") {
                        //A MISTAKE MADE ON NOT INCLUDING TYPE HEADER STATUS IN THE ADV HEADER SETTINGS
                        // Check if the document already exists with HeaderName: 'Type'
                        const existingHeader = await myAdvHeadersModelModel.findOne({ HeaderName: 'Type' });

                        if (!existingHeader) {
                            // If the document doesn't exist, create a new one
                            const newHeader = new myAdvHeadersModelModel({ HeaderName: 'Type', isDisplayed: true });
                            await newHeader.save();
                        }
                        //first check if it not already exist in the database
                        const myStoresModel = StoresModel(db);
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
                    }

                } catch (error) {
                    console.error("Error occurred while saving version:", error);
                    return
                }

            } catch (error) {
                console.error("Error occurred while connecting to database:", error);
                return
            }

        }
        return { loggedInStatus: loggedInStatus, existingthirdPartyToken: existingthirdPartyToken }
    } catch (error) {
        console.error("Error occurred signin sugnup:", error);
    }
}

export { signUpSignIn, dbConnection }; 
