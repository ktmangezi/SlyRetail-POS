
import { CredentialsModel } from '../Schemas/slyretailLoginSchemas.js';
import { connectDB } from '../Schemas/slyretailDbConfig.js';
import { updateBaseCurrency } from '../Controllers/currenciesController.js';

import { MongoClient, ObjectId } from 'mongodb';
//=================================================================================================================================================
//THIS CALCULATES ALL THE CASH INFLOWS AND OUTFLOWS FOR A PARTICULAR PERIOD AND PRESENTS IT TO THE USER ON AN ASCENDING ORDER
let isSaved = false;
let Databases = [];
let sessionId = ''
let signingCriteria = ''
//function to check if token exist in any database
export async function checkIfTokenExists(req, token) {
    const uri = "mongodb+srv://slyretailpos:1234marsr@cluster0.kv9k65a.mongodb.net/?retryWrites=true&w=majority";
    const client = new MongoClient(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });
    let doExist = false
    try {
        // Connect to the MongoDB client
        await client.connect();
        console.log("Connected to MongoDB");

        // Get the list of databases
        const adminDb = client.db().admin();
        const databasesList = await adminDb.listDatabases();
        const databases = databasesList.databases.map(db => db.name);

        // Use Promise.all to check all databases concurrently
        await Promise.all(databases.map(async (dbName) => {
            const db = client.db(dbName);
            // Get the list of collections in the current database
            const collections = await db.listCollections().toArray();

            for (const collectionInfo of collections) {
                const collectionName = collectionInfo.name;
                const collection = db.collection(collectionName);

                // Check if the token exists in the current collection
                const query = { thirdPartyToken: token };
                const result = await collection.findOne(query);

                // If the token is found
                if (result) {
                    console.log(`Token found in database: ${dbName}, collection: ${collectionName}`);
                    // Connect to the database which has the token
                    let databaseName = dbName;
                    const db = await connectDB(req, databaseName, signingCriteria, sessionId);
                    if (!db) {
                        throw new Error('Failed to connect to the database');
                    }
                    doExist = true;
                    return { doExist }; // Exit the function if the token is found
                }
            }
        }));

        if (!doExist) {
            console.log("Token not found in any database or collection.");
            doExist = false;
        }
        return { doExist }; // Token not found
    } catch (error) {
        console.error("Error:", error);
    }
}
//===========================================================================================================================
export async function getUserCredentials(req, sessionId) {//these empty variables will be overidden with the value
    try {
        let databaseName = ''
        // Connect to the database
        const db = await connectDB(req, databaseName, signingCriteria, sessionId);
        if (!db) {
            throw new Error('Failed to connect to the database');
        }

        // Create the model with the specific connection
        const myCredentialModel = CredentialsModel(db);
        //get all the credentials of the matched u in session
        let userName = req.session.myDatabase
        const credentials = await myCredentialModel.findOne
            ({ userId: userName });
        if (!credentials) {
            throw new Error('User credentials not found');
        }
        return { credentials: credentials };
    } catch (error) {
        console.error("Error in saveToken function:", error);
        return { credentials: null, error: error.message };
    }
}
//==========================================================================================================================

//function to save token to databse
export async function saveToken(req, token, sessionId) {//these empty variables will be overidden with the value
    try {
        let databaseName = ''
        // Connect to the database
        const db = await connectDB(req, databaseName, signingCriteria, sessionId);
        if (!db) {
            throw new Error('Failed to connect to the database');
        }

        // Create the model with the specific connection
        const myCredentialModel = CredentialsModel(db);

        let userName = req.session.myDatabase
        // update the token in database
        const updatedResult = await myCredentialModel.updateOne({ userId: userName }, {
            $set: {
                thirdPartyToken: token
            }
        })
        if (updatedResult.modifiedCount > 0) {
            isSaved = true
        }
        //store in session the token saved
        req.session.thirdPartyToken = token
        return { isSaved: true };
    } catch (error) {
        console.error("Error in saveToken function:", error);
        return { isSaved: false, error: error.message };
    }
}
//===========================================================================================================================
export async function updateUserAccount(req, userAccount, email, myPassword, tokenValue, baseCurrency, sessionId) {
    // Track updates separately
    const results = {
        credentialsUpdated: false,
        currencyUpdated: false,
        error: null
    };
    let databaseName = ''
    try {
        const db = await connectDB(req, databaseName, signingCriteria, sessionId);
        if (!db) throw new Error('Failed to connect to database');

        const myCredentialModel = CredentialsModel(db);

        // 1. Update credentials if any fields are provided
        if (userAccount || email || myPassword || tokenValue) {
            const updateFields = {};
            if (userAccount) updateFields.User_Account = userAccount;
            if (email) updateFields.Email = email;
            if (myPassword) updateFields.DbPassword = myPassword;
            if (tokenValue) updateFields.thirdPartyToken = tokenValue;
            const myDb = req.session.myDatabase
            const updatedResult = await myCredentialModel.updateOne(
                { userId: myDb },
                { $set: updateFields }
            );

            results.credentialsUpdated = updatedResult.modifiedCount > 0;
        }

        // 2. Update currency if provided (runs regardless of credentials update)
        if (baseCurrency) {
            const currencyResult = await updateBaseCurrency(req, baseCurrency, sessionId);
            results.currencyUpdated = currencyResult.isUpdated;
        }

        // 3. Determine overall success
        return {
            success: results.credentialsUpdated || results.currencyUpdated,
            details: results
        };

    } catch (err) {
        console.error('Update failed:', err);
        return {
            success: false,
            error: err.message,
            details: results
        };
    }
}
//===========================================================================================================================
export async function deleteDatabase(email) {
    let amDeleted = false; //boolean to check if the account is deleted or not
    const uri = "mongodb+srv://slyretailpos:1234marsr@cluster0.kv9k65a.mongodb.net/?retryWrites=true&w=majority";
    const client = new MongoClient(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });
    try {
        // Connect to the MongoDB client
        await client.connect();
        console.log("Connected to MongoDB");
        const database = email.split("@")[0];
        const adminDb = client.db('admin'); //connect THE ADMIN PART
        const dbList = await adminDb.admin().listDatabases(); //GET THE LIST OF ALL DATABASES
        const dbNames = dbList.databases.map(db => db.name); //MAP WITHIN THEM TO AN ARRAY
        //find if the database name exist
        for (const dbName of dbNames) { //loop in the whole database array and check if the database exist.if so delete it that is drop it
            if (dbName === database) {
                await client.db(database).dropDatabase();
                amDeleted = true;
                console.log('Database deleted successfully');
                break;
            }
        }
        // Close the connection to the MongoDB server
        await client.close();
        return { amDeleted };

    } catch (error) {
        console.error("Error:", error);
        await client.close();
        return { amDeleted: false, error: error.message };
    } finally {
        // Ensure the client is closed in case of any other issues
        if (client.isConnected()) {
            await client.close();
        }
    }

}
