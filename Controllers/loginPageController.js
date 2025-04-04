import { MongoClient, ObjectId } from 'mongodb';
import { CredentialsModel } from '../Schemas/slyretailLoginSchemas.js';
import { connectDB } from '../Schemas/slyretailDbConfig.js';
import { CurrenciesModel } from '../Schemas/slyretailCurrenciesSchemas.js';
import { accountingPeriodModel } from '../Schemas/slyretailAccountingPeriodSettingsSchemas.js';
import { advaHeadersModel } from '../Schemas/slyretailAdvCashMngmntHeadersSettingsSchemas.js';
import { CashflowCategoriesModel } from '../Schemas/slyretailCategoriesSchemas.js';
import { CashflowModel } from '../Schemas/slyretailCashflowSchemas.js';
import { versionControlModel } from '../Schemas/slyretailVersionControlSchemas.js';
import { StoresModel } from '../Schemas/slyretailStoresSchemas.js';
import { FinancialPositionModel } from '../Schemas/slyretailFinancialPositionsSchemas.js';

import { v4 as uuidv4 } from 'uuid';
import e from 'express';
let cashFlows = []

let loggedInStatus = "False";
let currencies = [];
let dbConnection = null; // Global database connection
let latestVersion = "1.5"
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
                const myCategoriesModel = CashflowCategoriesModel(db);
                loggedInStatus = await createDatabase(email, databaseName, databasePassword);
                req.session.userAccount = databaseName

                existingthirdPartyToken = await getExistingToken();
                // Function to all all necessary user account data
                async function createDatabase(email, databaseName, databasePassword) {
                    try {
                        // Create the model with the specific connection
                        currencies = await myCurrenciesModelModel.find()
                        //this is to keep the current structure of databases, the web interface does not have a version but the database will need to be controlled
                        const newVersionEntry = new myversionControlModelModel({ version: latestVersion });
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
                        //save to category collection categorise suspense both type payin and payout
                        const myC = db.collection('CostCentreCategories')


                        try {
                            const currencyEntry = new myCurrenciesModelModel({ Currency_Name: 'USD', paymentType: 'CASH', RATE: Number(1).toFixed(2), BASE_CURRENCY: 'Y' });
                            // const currencyEntry = new CurrenciesModel({ Currency_Name: 'USD', paymentType: 'CASH', RATE: Number(1).toFixed(2), BASE_CURRENCY: 'Y' });
                            const result = await currencyEntry.save();
                        } catch (error) {
                            console.error("Error inserting currencies", error);
                            return
                        }
                        const categoryData = [{ category: 'suspense', CategoryLimit: 0, CategoryLimitRange: '', Balance: 'PayIn' }, { category: 'suspense', CategoryLimit: 0, CategoryLimitRange: '', Balance: 'PayOut' }]
                        try {
                            try {
                                // Using insertMany to insert multiple documents at once
                                await myCategoriesModel.insertMany(categoryData);
                            } catch (error) {
                                console.error('Error saving catgories:', error);
                            }

                        } catch (error) {
                            console.error('Error inserting headers:', error);
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

                        //save the financial position dta
                        // Save as a new financial position
                        try {
                            const financialPosition = {
                                PPE: 0,
                                INVENTORY: 0,
                                DEBTORS: 0,
                                CASH: 0,
                                SHARE_CAPITAL: 0,
                                SHAREHOLDER_LOAN: 0,
                                TAXATION: 0,
                                CREDITORS: 0,
                                LONG_TERM_LOAN: 0,
                                DATE: new Date().getFullYear(), // Get the current year
                            };
                            const financialPositionEntry = new FinancialPositionModel(financialPosition);
                            await financialPositionEntry.save();
                        }
                        catch (error) {
                            console.error("Error saving financial position", error);
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
        // function for all migration purposes

        if (signingCriteria === "Sign In") {
            let db;

            const adminClient = new MongoClient("mongodb+srv://slyretailpos:1234marsr@cluster0.kv9k65a.mongodb.net/?retryWrites=true&w=majority", {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds if unable to connect to the server
                socketTimeoutMS: 10000 // Timeout after 10 seconds for socket inactivity

            });

            await adminClient.connect();
            const adminDb = adminClient.db('admin');

            // Get list of all databases
            const allDatabases = (await adminDb.admin().listDatabases()).databases
                .filter(db => db.name.startsWith('user_') || db.name === databaseName);

            let newDBName = '';
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
                    const mytoken = await credentialsCollection.findOne({ thirdPartyToken: { $exists: false } });
                    if (mytoken) {
                        console.log('token field doesnt exist.creating one')
                        try {
                            await credentialsCollection.updateOne({ _id: user._id }, { $set: { thirdPartyToken: '' } });
                        } catch (error) {
                            console.error("Error saving cashflow", error);
                        }
                    }

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
            if (needsMigration) {
                // Migrate data (using your existing migrateTenantDatabase function)
                newDBName = await migrateTenantDatabase(databaseName);
                console.log(`Migration complete! New database: ${newDBName}`)
                try {
                    db = await connectDB(req, newDBName, signingCriteria);
                    if (!db) {
                        //THIS IS WHEN THE DATABASE NAME IS ALREADY EXISTING WITHIN THE SYSTEM, AND IT HAS BEEN CONFIRMED BY DBCONFIG
                        loggedInStatus = "The User Does Not Exist";
                        console.log("Login status:", loggedInStatus);
                        return { loggedInStatus, existingthirdPartyToken };
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
                //  Delete old DB after successful migration
                try {
                    await adminClient.db(targetDbName).command({ dropDatabase: 1 });
                } catch (error) {
                    console.error(`Failed to delete old database: ${databaseName}`, error);
                }

            } else {
                // Connect to existing valid database
                db = await connectDB(req, targetDbName, signingCriteria);
            }
            async function migrateTenantDatabase(oldDBName, batchSize = 1000) {
                try {
                    const oldDB = adminClient.db(oldDBName);
                    const newDBName = `user_${uuidv4().replace(/-/g, '').substring(0, 22)}`;
                    const newDB = adminClient.db(newDBName);

                    const collections = (await oldDB.listCollections().toArray())
                        .filter(coll => !coll.name.startsWith('system.'));

                    // Process collections in parallel with progress
                    let migrated = 0;
                    const results = await Promise.all(collections.map(async coll => {
                        const oldColl = oldDB.collection(coll.name);
                        const newColl = newDB.collection(coll.name);

                        const count = await migrateCollection(oldColl, newColl, batchSize);
                        // console.log(`Migrated ${coll.name}: ${count} docs`);
                        console.time(`Migrate ${coll.name}`);
                        migrated++;
                        console.log(`[${migrated}/${collections.length}] Migrated ${coll.name}: ${count} docs`);

                        return { name: coll.name, count };
                    }));
                    // Verification
                    for (const coll of collections) {
                        const [oldCount, newCount] = await Promise.all([
                            oldDB.collection(coll.name).countDocuments(),
                            newDB.collection(coll.name).countDocuments()
                        ]);

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

            async function migrateCollection(oldColl, newColl, batchSize = 1000) {
                let count = 0;
                let cursor = oldColl.find().batchSize(batchSize);

                while (await cursor.hasNext()) {
                    const batch = [];
                    for (let i = 0; i < batchSize && await cursor.hasNext(); i++) {
                        batch.push(await cursor.next());
                    }

                    if (batch.length > 0) {
                        await newColl.insertMany(batch, { ordered: false });
                        count += batch.length;
                    }
                    // else create the collection those where baatch is 0
                    else {
                        const db = newColl.db; // Get the database object
                        const existingCollections = await db.listCollections({ name: newCollection }).toArray();
                        console.log(existingCollections)
                        const newCollection = oldColl.collectionName;
                        console.log(newCollection)
                        if (existingCollections.length === 0) {
                            await db.createCollection(newCollection);
                            console.log(`Collection ${newCollection} created successfully.`);
                        } else {
                            console.log(`Collection ${newCollection} already exists.`);
                        }
                    }



                }
                return count;
            }

            try {

                const myAdvHeadersModelModel = advaHeadersModel(db);
                const myCashflowModelModel = CashflowModel(db);
                const myversionControlModelModel = versionControlModel(db);
                const myCurrenciesModelModel = CurrenciesModel(db);
                const myCredentialsModelModel = CredentialsModel(db);
                const myCategoriesModel = CashflowCategoriesModel(db);
                try {
                    const credentials = await myCredentialsModelModel.findOne({ DbPassword: databasePassword });
                    if (credentials) { //THEN CHECK ALSO IF THE PASSWORD IS THERE AND MATCHING
                        loggedInStatus = "True";
                        if (credentials.thirdPartyToken !== '') {
                            req.session.thirdPartyToken = credentials.thirdPartyToken
                            existingthirdPartyToken = credentials.thirdPartyToken
                        }
                        else {
                            existingthirdPartyToken = 'no token'
                        }
                        currencies = await myCurrenciesModelModel.find()
                    } else {
                        loggedInStatus = "Password Do Not Match";
                    }

                } catch (error) {
                    console.error("Error occurred while querying CredentialsModel:", error);
                    return
                }
                // //create versioncontrols collection if it doesnt exist and create a version control document with version 1.4
                // const existingVersionControl = await myversionControlModelModel.findOne({ version: latestVersion });
                // if (!existingVersionControl) {
                //     const newVersionEntry = new myversionControlModelModel({ version: latestVersion });
                //     await newVersionEntry.save();
                //     console.log('New version entry saved successfully!');
                // }
                //==============================================================
                const existingVersion = await myversionControlModelModel.find();
                async function handleDatabaseUpgrades(db, latestVersion) {
                    try {
                        const versionControlModel = myversionControlModelModel;
                        const cashflowModel = myCashflowModelModel;
                        const headersModel = myAdvHeadersModelModel;
                        const storesModel = StoresModel(db);
                        const categoriesModel = CashflowCategoriesModel(db);

                        // Get current version
                        const existingVersion = await versionControlModel.find().sort({ _id: -1 }).limit(1);
                        if (!existingVersion.length) return;
                        let currentDBVersion = existingVersion[0].version;

                        // Define upgrade steps
                        const upgradeSteps = {
                            '1.2': async () => {
                                console.log('Running upgrade to 1.2');
                                const cashFlows = await cashflowModel.find();

                                for (const row of cashFlows) {
                                    // Initialize tax objects if they don't exist
                                    row.Tax = row.Tax || {};
                                    row.Tax.vat = row.Tax.vat || {};
                                    row.Tax.ztf = row.Tax.ztf || {};

                                    // Update VAT data
                                    if (row.Tax.vat.ZimraFsNo === '0') {
                                        row.Tax.vat.ZimraFsNo = '';
                                    }

                                    // Standardize VAT structure
                                    row.Tax.vat = {
                                        QRCode: row.Tax.vat.QRCode || '',
                                        DeviceId: row.Tax.vat.DeviceId || 0,
                                        ZimraFsNo: row.Tax.vat.ZimraFsNo || '',
                                        VatNumber: row.Tax.vat.VatNumber || 0,
                                        TinNumber: row.Tax.vat.TinNumber || 0,
                                        VatAmount: row.Tax.vat.VatAmount || 0,
                                        VatStatus: row.Tax.vat.VatStatus || 'N'
                                    };

                                    // Standardize ZTF structure
                                    row.Tax.ztf = {
                                        First: row.Tax.ztf.First || '',
                                        Second: row.Tax.ztf.Second || '',
                                        LevyAmount: row.Tax.ztf.LevyAmount || 0,
                                        ZtfStatus: row.Tax.ztf.ZtfStatus || 'N'
                                    };

                                    await row.save();
                                }
                            },
                            '1.3': async () => {
                                console.log('Running upgrade to 1.3');
                                // Remove Vat field and ensure Tax field exists
                                await cashflowModel.updateMany(
                                    {},
                                    [
                                        {
                                            $set: {
                                                Tax: {
                                                    $ifNull: ["$Tax", {}],
                                                    vat: { $ifNull: ["$Tax.vat", {}] },
                                                    ztf: { $ifNull: ["$Tax.ztf", {}] }
                                                }
                                            }
                                        },
                                        { $unset: "Vat" }
                                    ]
                                );

                                // Update header names
                                await headersModel.updateOne(
                                    { HeaderName: 'Vat' },
                                    { $set: { HeaderName: 'Tax' } }
                                );

                                // Ensure Type header exists
                                if (!await headersModel.findOne({ HeaderName: 'Type' })) {
                                    await new headersModel({ HeaderName: 'Type', isDisplayed: true }).save();
                                }
                            },
                            '1.4': async () => {
                                console.log('Running upgrade to 1.4');
                                // Ensure default store exists
                                if (!await storesModel.findOne({ StoreName: 'DEFAULT' })) {
                                    await new storesModel({ StoreName: 'DEFAULT', StoreId: '1' }).save();
                                }

                                // Update cashflows with default store and empty LoyverseId
                                await cashflowModel.updateMany(
                                    { StoreName: { $exists: false } },
                                    { $set: { StoreName: 'DEFAULT' } }
                                );

                                await cashflowModel.updateMany(
                                    { LoyverseId: { $exists: false } },
                                    { $set: { LoyverseId: '' } }
                                );

                                const categoryExistPayIn = await myCategoriesModel.findOne({ category: 'suspense', Balance: 'PayIn' });
                                if (!categoryExistPayIn) {
                                    await new myCategoriesModel({ category: 'suspense', Balance: 'PayIn' }).save();
                                }
                                const categoryExistPayOut = await myCategoriesModel.findOne({ category: 'suspense', Balance: 'PayOut' });
                                if (!categoryExistPayOut) {
                                    await new myCategoriesModel({ category: 'suspense', Balance: 'PayOut' }).save();
                                }
                                const database = db.db; // Ensure db is the database object
                                const existingCollections = await database.listCollections().toArray();
                                const collectionNames = [
                                    'CostCentreCategories', "Customers", 'Employees', "Invoices", "Products", 'Sales', "Suppliers", 'Vouchers'
                                ];
                                const existingCollectionNames = existingCollections.map(coll => coll.name);
                                for (let i = 0; i < collectionNames.length; i++) {
                                    if (!existingCollectionNames.includes(collectionNames[i])) {
                                        try {
                                            await database.createCollection(collectionNames[i]);
                                            // console.log(`Collection ${collectionNames[i]} created successfully.`);
                                        } catch (error) {
                                            console.error(`Error creating collection ${collectionNames[i]}`, error);
                                        }
                                    }
                                }

                                //================================================================================================================
                                await calculateYearlyClosingBalances(db)
                                async function calculateYearlyClosingBalances(db) {
                                    const Cashflow = CashflowModel(db);
                                    const financialPositionModel = FinancialPositionModel(db);
                                    try {
                                        // Get all cashflows (optimized query)
                                        const cashflows = await Cashflow.find({})
                                            .select('CashFlowDate CashFlowAmount CashFlowType') // Only needed fields
                                            .lean(); // Faster processing
                                        if (!cashflows.length) return [];

                                        // Step 1: Group transactions by Year
                                        const yearlyTransactions = {};
                                        cashflows.forEach((flow) => {
                                            const [day, month, year] = flow.CashFlowDate.split('/');
                                            if (!yearlyTransactions[year]) {
                                                yearlyTransactions[year] = {
                                                    payins: 0,
                                                    payouts: 0
                                                };
                                            }
                                            if (flow.CashFlowType === 'Pay in') {
                                                yearlyTransactions[year].payins += parseFloat(Number(flow.CashFlowAmount).toFixed(2));
                                            } else if (flow.CashFlowType === 'Payout') {
                                                yearlyTransactions[year].payouts += parseFloat(Number(flow.CashFlowAmount).toFixed(2));
                                            }
                                        });
                                        // Step 2: Sort years chronologically
                                        const sortedYears = Object.keys(yearlyTransactions).sort();
                                        // Step 3: Calculate yearly closing balances
                                        let runningBalance = 0;
                                        const yearlyBalances = [];

                                        sortedYears.forEach((year) => {
                                            const { payins, payouts } = yearlyTransactions[year];
                                            const netFlow = payins - payouts;

                                            const openingBalance = runningBalance;
                                            runningBalance += netFlow;

                                            yearlyBalances.push({
                                                year: parseInt(year),
                                                openingBalance: openingBalance,
                                                totalPayins: payins,
                                                totalPayouts: payouts,
                                                netFlow: netFlow,
                                                closingBalance: runningBalance
                                            });
                                            // console.log(yearlyBalances)
                                        });
                                        //save these yearly balances in the financial position collection
                                        for (let i = 0; i < yearlyBalances.length; i++) {
                                            const yearlyBalance = yearlyBalances[i];
                                            const year = yearlyBalance.year;
                                            const openingBalance = yearlyBalance.openingBalance;

                                            const financialPosition = {
                                                PPE: 0,
                                                INVENTORY: 0,
                                                DEBTORS: 0,
                                                CASH: openingBalance,
                                                SHARE_CAPITAL: 0,
                                                SHAREHOLDER_LOAN: 0,
                                                TAXATION: 0,
                                                CREDITORS: 0,
                                                LONG_TERM_LOAN: 0,
                                                DATE: year,
                                            };
                                            console.log(financialPosition)
                                            try {
                                                const existingPosition = await financialPositionModel.findOne({ DATE: year });
                                                if (!existingPosition) {
                                                    //     // Update the existing financial position
                                                    //     await financialPositionModel.updateOne(
                                                    //         { DATE: year },
                                                    //         { $set: financialPosition }
                                                    //     );
                                                    // } else {
                                                    // Save as a new financial position
                                                    const financialPositionEntry = new financialPositionModel(financialPosition);
                                                    await financialPositionEntry.save();
                                                }
                                            } catch (error) {
                                                console.error('Error saving or updating financial position:', error);
                                            }
                                        }
                                        console.log(yearlyBalances)
                                        return yearlyBalances;
                                    } catch (error) {
                                        console.error('Error calculating yearly balances:', error);
                                        throw error;
                                    }
                                }
                            }
                        };

                        // Execute necessary upgrades in order
                        const versions = ['1.2', '1.3', '1.4', '1.5'];
                        const currentIndex = versions.indexOf(currentDBVersion);
                        console.log(currentIndex + 'currentIndex')
                        if (currentIndex === -1) {
                            console.log(`Current version ${currentDBVersion} not in upgrade path`);
                            return;
                        }

                        for (let i = currentIndex; i < versions.length; i++) {
                            const targetVersion = versions[i];
                            console.log(`Upgrading from ${currentDBVersion} to ${targetVersion}`);
                            if (upgradeSteps[targetVersion]) {
                                await upgradeSteps[targetVersion]();
                                // Update the collection to the next upgrade version
                                const nextVersionIndex = i + 1;
                                if (nextVersionIndex <= versions.length) {
                                    const nextVersion = versions[nextVersionIndex];
                                    await versionControlModel.updateOne(
                                        { _id: existingVersion[0]._id },
                                        { $set: { version: nextVersion } }
                                    );
                                    console.log(`Collection updated to next upgrade version: ${nextVersion}`);
                                }
                            }
                        }

                        console.log('Database upgrades completed successfully');
                    } catch (error) {
                        console.error('Error during database upgrades:', error);
                        throw error;
                    }
                }
                // In your main code
                try {
                    await handleDatabaseUpgrades(db, "1.4");
                } catch (error) {
                    console.error("Failed to complete database upgrades:", error);
                }
            } catch (error) {
                console.error("Error occurred while connecting to database:", error);
                return
            }

        }
        // Return the logged-in status and existing third-party token
        return { loggedInStatus: loggedInStatus, existingthirdPartyToken: existingthirdPartyToken }
    } catch (error) {
        console.error("Error occurred signin sugnup:", error);
    }
}

export { signUpSignIn, dbConnection }; 
