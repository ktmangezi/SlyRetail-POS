import csvtojson from 'csvtojson';
import { createServer } from 'http';
import { connect } from 'http2';
import { Console } from 'console';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import csv from 'csv-parser';
import express from 'express';
import bodyParser from 'body-parser';
import session from 'express-session';
import cookieParser from 'cookie-parser';


//THE CONTROLLERS
import { signUpSignIn } from './Controllers/loginPageController.js';
import { advCashMngmnt } from './Controllers/advanceCashMngmntController.js';
import { payInData } from './Controllers/payInController.js';
import { logout } from './Schemas/slyretailDbConfig.js';
import { insertNewCurrency, updateCurrencies, updateCurrencyName, updateBaseCurrency, updateCurrencyRate, deleteCurrency } from './Controllers/currenciesController.js';
import { payOutData } from './Controllers/payOutController.js';
// import { getExpenseCategoryTotals } from './Controllers/payOutCategoriesController.js';
// import { getIncomeCategoryTotals } from './Controllers/payInCategoriesController.js';
import { getTrialBalanceData } from './Controllers/trialBalanceController.js';
import { getAccountingPeriodDetails } from './Controllers/accountingPeriodController.js';
import { updateAccountingPeriod } from './Controllers/accountingPeriodController.js';
import {
  updateCashFlowType, getCashFlowArray, updateCashFlowDate, updateCashFlowShift, updateCashFlowInvoice, updateCashFlowDescription, updateCashFlowCategory,
  updateCashFlowCurrency, updateCashFlowAmount, updateCashFlowRate, deleteCashFLow, insertCashFlowData, updateCashFlowData, updateCashFlowTax, saveCashFlowData
} from './Controllers/cashFlowsController.js';
import { getadvancedHeaderStatusArray, saveHeaderStatusAdv } from './Controllers/advaCashMngmentHeadersSettingsController.js';
import { getpayInHeaderStatusArray, saveHeaderStatusPayIn } from './Controllers/payInHeadersSettingsController.js';
import { getpayOutHeaderStatusArray, saveHeaderStatusPayOut } from './Controllers/payOutHeadersSettingsController.js';
import { exportingArray, arrayForImport } from './Controllers/exportImportController.js';
import { insertCategory, getCategories, updateCategoryRow, deleteCategory, getCategoryTotals, updateAssignedCategories } from './Controllers/categoriesController.js';


const upload = multer({ dest: 'uploads/', });
// Get the current directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
app.use(express.json()); // parse request body as JSON
app.use(bodyParser.json());
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
// Initialize cookie-parser middleware
app.use(cookieParser());
// Use express-session middleware
app.use(session({
  secret: 'your-secret-key',  // Secret key to sign the session ID cookie
  // secret: req.sessionID,  // Secret key to sign the session ID cookie
  resave: false,              // Don't save session if unmodified
  saveUninitialized: true,    // Save uninitialized sessions (before any data is stored)
  cookie: {
    httpOnly: false,         // Prevent access to the cookie via JavaScript
    secure: false,          // Set to true if you're using HTTPS
    maxAge: 60 * 60 * 3000  // Set the session duration to 1 hour (in milliseconds)
  }
}));
//===================================================================================
// Render login page using EJS template
app.get('/', (req, res) => {
  res.render('loginpage'); // Render the login page (loginpage.ejs should be in the views folder)
});
// app.post("/login", (req, res) => {
//   // This is just a mock login for the example

//   res.send("Logged in!");
// });
// ================================================================================================
// Handle login form submission
app.post('/signinsignup', async (req, res) => {
  const { buttonContent, dbName, email, myPassword } = req.body;
  // Run the sign-up/sign-in logic
  try {
    const { loggedInStatus } = await signUpSignIn(req, dbName, email, myPassword, buttonContent) //THIS STAGE SHOULD WAIT FOR THE RESPONSE FROM THE FUNCTIONS WITH THE loggedInStatus, NO NEXT LINE SHOULD RUN WITH A BLANK loggedInStatus
    //THIS WHERE YOU WILL SHOW THE NEXT PAGE TO GO TO WHE SUCCESSFULLY LOGED IN
    if (loggedInStatus === "True") {
      // req.session.dbName = { username: dbName };  // Store user info in the session
      res.json({ loggedInStatus: "True" }); //then let the user know
    }
    //THIS WHERE YOU WILL SHOW THE SAME HOME PAGE WHEN UNSUCCESSFUL IN LOGING IN
    if (loggedInStatus !== "True") {
      res.json({ loggedInStatus: loggedInStatus }); //then let the user know
    }
  } catch (error) {
    console.error("Error in sign-in/sign-up", error);
    res.status(500).json({ error: "internal server error" });
  }
});

//WHEN LOGGED IN SUCCEFULLY THE SYSTEM WILL FIRST PRESENT THE USER WITH THE ADVANCED CASH MANAGEMENT
//get the database name of the loggd account
app.get('/dbname', async (req, res) => {
  try {
    const actualSessionId = req.cookies['connect.sid']; // Access the cookie directly
    //Remove the 's:' prefix and return only the actual session ID
    const sessionId = actualSessionId.split(':')[1].split('.')[0];
    if (req.sessionID === sessionId) {
      // console.log("iam the new1111 " + req.session.myDatabase)
      const dbName = req.session.myDatabase
      res.json({ dbName });
    }

  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }


});
//========================================================================================================
app.get('/advanceCashMngmnt', async (req, res) => {
  try {
    const actualSessionId = req.cookies['connect.sid']; // Access the cookie directly
    //Remove the 's:' prefix and return only the actual session ID
    const sessionId = actualSessionId.split(':')[1].split('.')[0];
    const { isBaseCurrency, currencies, isoCode } = await advCashMngmnt(req, sessionId);
    res.render('advanceCashMngmnt', { isBaseCurrency, currencies, isoCode });
  } catch (error) {
    console.error("Error in sign-in/sign-up", error);
    res.status(500).json({ error: "internal server error" });
  }
});
//====================================================================================================================================
app.get("/userAccount", async (req, res,) => {

  const { currencies } = await signUpSignIn()
  const database = dbName
  res.render('userAccount', { currencies, database });
});
// //======================================================================================================
app.get('/currencies', async (req, res) => {
  try {
    const actualSessionId = req.cookies['connect.sid']; // Access the cookie directly
    //Remove the 's:' prefix and return only the actual session ID
    const sessionId = actualSessionId.split(':')[1].split('.')[0];
    const { currencies } = await advCashMngmnt(req, sessionId);
    res.json(currencies);
  } catch (err) {
    console.error('Error fetching currencies:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
//======================================================================================================
app.get('/expenseCategories', async (req, res) => {
  try {
    const actualSessionId = req.cookies['connect.sid']; // Access the cookie directly
    //Remove the 's:' prefix and return only the actual session ID
    const sessionId = actualSessionId.split(':')[1].split('.')[0];
    const { expCategories } = await advCashMngmnt(req, sessionId);
    res.json(expCategories);
  } catch (err) {
    console.error('Error fetching expenseCategories:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
app.get('/incomeCategories', async (req, res) => {
  try {
    const actualSessionId = req.cookies['connect.sid']; // Access the cookie directly
    //Remove the 's:' prefix and return only the actual session ID
    const sessionId = actualSessionId.split(':')[1].split('.')[0];
    const { incCategories } = await advCashMngmnt(req, sessionId);
    res.json(incCategories);
  } catch (err) {
    console.error('Error fetching incomeCategories:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
//======================================================================================================
// app.get('/payOut', async (req, res,) => {
//   try {
//     const { isoCode, currencies, expenseCategories, expenses, symbols, totalCostIncome, UpdatedExpenses, isBaseCurrency, totalCostExpenses } = await payOutData();
//     res.render('payOut', { isoCode, currencies, expenseCategories, expenses, symbols, totalCostIncome, UpdatedExpenses, isBaseCurrency, totalCostExpenses });
//   } catch (error) {
//     console.error("Error in payOut", error);
//     res.status(500).json({ error: "internal server error" });
//   }
// });
// //======================================================================================================
// app.get('/payIn', async (req, res,) => {
//   try {
//     const { symbols, income, isBaseCurrency, categories, isoCode, currencies } = await payInData();
//     res.render('payIn', { symbols, income, isBaseCurrency, categories, isoCode, currencies });
//   } catch (error) {
//     console.error("Error in payIn", error);
//     res.status(500).json({ error: "internal server error" });
//   }
// });
//========================================================================================
// endpoint for signing out
app.post('/logout', async (req, res) => {
  try {
    const { sessionId } = req.body;
    console.log(sessionId + "received")
    const { loggedOut } = await logout(req, sessionId)
    res.status(200).json({
      loggedOut: loggedOut,
    });
  } catch (error) {
    console.error('Error during logout:', error);
    res.status(500).send("An error occurred during logout.");
  }
});
//======================================================================================
// Handle the incoming request to display the default contents
app.post('/defaultDisplayThePaginationWay', async (req, res) => {
  try {
    // Extract the data from the request payload
    const startDate = new Date(req.body.startDate);
    const endDate = new Date(req.body.endDate);
    const pageSize = parseInt(req.body.pageSize);
    const page = parseInt(req.body.page);
    const payInFilterCategory = (req.body.payInFilterCategory);
    const payOutFilterCategory = (req.body.payOutFilterCategory);
    const advancedSearchInput = (req.body.advancedSearchInput);
    const searchInput = (req.body.searchInput);
    const payOutSearchInput = (req.body.payOutSearchInput);
    const sessionId = (req.body.sessionId);
    const { data } = await getCashFlowArray(req, startDate, endDate, pageSize, page, payInFilterCategory, payOutFilterCategory, advancedSearchInput, searchInput, payOutSearchInput, sessionId);

    // Send a response back to the client
    res.json(data);
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'An error occurred' });
  }
});
//-=--------------------------------------------------------------------------------------------
//THIS IS FOR CUSTOMISATION OF COLUMNS AND HEADINGS
app.get('/getAdvHeaderStatus', async (req, res) => {
  try {
    const actualSessionId = req.cookies['connect.sid']; // Access the cookie directly
    //Remove the 's:' prefix and return only the actual session ID
    const sessionId = actualSessionId.split(':')[1].split('.')[0];
    const { advancedHeaderStatus } = await getadvancedHeaderStatusArray(req, sessionId)
    res.json(advancedHeaderStatus);
  } catch (err) {
    console.error('Error fetching status:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
//==============================================================================
// app.get('/getPayInHeaderStatus', async (req, res) => {
//   try {
//     const { payInHeaderStatus } = await getpayInHeaderStatusArray(); // Destructure directly
//     res.json(payInHeaderStatus); // Return the status as part of the response object
//   } catch (err) {
//     console.error('Error fetching status:', err);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// });


// //==================================================================================
// app.get('/getPayOutHeaderStatus', async (req, res) => {
//   try {
//     const { payOutHeaderStatus } = await getpayOutHeaderStatusArray()
//     res.json(payOutHeaderStatus);
//   } catch (err) {
//     console.error('Error fetching status:', err);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// });
//========================================================================================================

app.post('/getCategoriesTotals', async (req, res) => {
  try {
    // Extract the data from the request payload
    const startDate = new Date(req.body.startDate);
    const endDate = new Date(req.body.endDate);
    const payOutSearchInput = req.body.payOutSearchInput;
    const searchInput = req.body.searchInput;
    const pageSize = parseInt(req.body.pageSize);
    const page = parseInt(req.body.page);
    const theCategoryName = req.body.theCategoryName
    const sessionId = req.body.sessionId
    const { data } = await getCategoryTotals(req, startDate, endDate, payOutSearchInput, searchInput, pageSize, page, theCategoryName, sessionId)
    res.json(data);

  } catch (err) {
    console.error('Error fetching  expense cat totals:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
})
//============================================================================================================
//Update Header Status For: ADVANCED CASH MANAGEMENT
app.post('/updateHeaderStatusAdv', async (req, res) => {
  const { headerNamefcb, headerisDisplayed, sessionId } = req.body;
  try {
    const { isSaving } = await saveHeaderStatusAdv(req, headerNamefcb, headerisDisplayed, sessionId)
    //ON CONDITION THAT THE DOCUMENT HAS BEEN SAVED IN THE MONGO DB SUCCESSFULLY
    res.status(200).json({
      isSaving: isSaving,
    });
  } catch (error) {
    res.status(403).json({ isSaving: false, })
    console.error(error)
  }
})
//=====================================================================================
// //Update Header Status For: PayIn
// app.post('/updateHeaderStatusPayin', async (req, res) => {
//   const { headerNamefcb, headerisDisplayed } = req.body;
//   try {
//     const { isSaving } = await saveHeaderStatusPayIn(headerNamefcb, headerisDisplayed)
//     //ON CONDITION THAT THE DOCUMENT HAS BEEN SAVED IN THE MONGO DB SUCCESSFULLY
//     res.status(200).json({
//       isSaving: isSaving,
//     });
//   } catch (error) {
//     res.status(403).json({ isSaving: false, })
//     console.error(error)
//   }
// })
// //==============================================================================================
// //Update Header Status For: PayIn
// app.post('/updateHeaderStatusPayOut', async (req, res) => {
//   const { headerNamefcb, headerisDisplayed } = req.body;
//   try {
//     const { isSaving } = await saveHeaderStatusPayOut(headerNamefcb, headerisDisplayed)
//     //ON CONDITION THAT THE DOCUMENT HAS BEEN SAVED IN THE MONGO DB SUCCESSFULLY
//     res.status(200).json({
//       isSaving: isSaving,
//     });
//   } catch (error) {
//     res.status(403).json({ isSaving: false, })
//     console.error(error)
//   }
// })
//================================================================================================
// define the '/updatetheCashFlowDate' endpoint to handle POST requests
app.post('/updateCashFlowDate', async (req, res) => {
  const { rowId, newDate, sessionId } = req.body;
  try {
    const { amUpdated } = await updateCashFlowDate(req, rowId, newDate, sessionId)
    res.status(200).json({ amUpdated: amUpdated })
  }
  catch (error) {
    console.error(error)
    res.status(403).json({ amUpdated: false })

  }

})
//==========================================================================================================
///updateCashFlowType'
app.post('/updateCashFlowType', async (req, res) => {
  const { rowId, typeSelected, sessionId } = req.body;
  try {
    const { amUpdated } = await updateCashFlowType(req, rowId, typeSelected, sessionId)
    res.status(200).json({ amUpdated: amUpdated })
  }
  catch (error) {
    console.error(error)
    res.status(403).json({ amUpdated: false })
  }
})
//==========================================================================================================
///updateCashFlowShift'
app.post('/updateCashFlowShift', async (req, res) => {
  const { rowId, shift, sessionId } = req.body;
  try {
    const { amUpdated } = await updateCashFlowShift(req, rowId, shift, sessionId)
    res.status(200).json({ amUpdated: amUpdated })
  }
  catch (error) {
    console.error(error)
    res.status(403).json({ amUpdated: false })

  }

})
//==========================================================================================================
app.post('/updateCashFlowTax', async (req, res) => {
  const { rowId, taxDataToUpdate, sessionId } = req.body;
  try {
    const { amUpdated } = await updateCashFlowTax(req, rowId, taxDataToUpdate, sessionId)
    console.log(amUpdated)
    res.status(200).json({ amUpdated: amUpdated })
  }
  catch (error) {
    console.error(error)
    res.status(403).json({ amUpdated: false })

  }

})

//==========================================================================================================
app.post('/updateCashFlowInvoice', async (req, res) => {
  const { rowId, InvoiceRef, sessionId } = req.body;
  // process the database connection request
  try {
    const { amUpdated } = await updateCashFlowInvoice(req, rowId, InvoiceRef, sessionId)
    res.status(200).json({ amUpdated: amUpdated })
  }
  catch (error) {
    console.error(error)
    res.status(403).json({ amUpdated: false })

  }
})
//======================================================================================================================
app.post('/updateCashFlowDescription', async (req, res) => {
  const { rowId, description, sessionId } = req.body;
  // process the database connection request
  try {
    const { amUpdated } = await updateCashFlowDescription(req, rowId, description, sessionId)
    res.status(200).json({ amUpdated: amUpdated })
  }
  catch (error) {
    console.error(error)
    res.status(403).json({ amUpdated: false })

  }
})

//===================================================================================================================================
app.post('/updateCashFlowCategory', async (req, res) => {
  const { rowId, newCategory, sessionId } = req.body;
  try {
    const { amUpdated } = await updateCashFlowCategory(req, rowId, newCategory, sessionId)
    res.status(200).json({ amUpdated: amUpdated })
  }
  catch (error) {
    console.error(error)
    res.status(403).json({ amUpdated: false })

  }

})

//====================================================================================================================================
app.post('/updateCashFlowCurrency', async (req, res) => {
  const { rowId, newCurrency, cashEquivValue2, newCashFlowRate, sessionId } = req.body;
  const newCashFlowRate1 = parseFloat(newCashFlowRate)
  const cashEquivValue = parseFloat(cashEquivValue2)
  try {
    const { amUpdated } = await updateCashFlowCurrency(req, rowId, newCurrency, cashEquivValue, newCashFlowRate1, sessionId)
    res.status(200).json({ amUpdated: amUpdated })
  }
  catch (error) {
    console.error(error)
    res.status(403).json({ amUpdated: false })

  }
})

//====================================================================================================================================
app.post('/updateCashFlowAmount', async (req, res) => {
  const { rowId, newCashFlowAmount, cashEquivValue3, sessionId } = req.body;
  const newAmount = parseFloat(newCashFlowAmount);
  const cashEquivValue = parseFloat(cashEquivValue3);
  try {
    const { amUpdated } = await updateCashFlowAmount(req, rowId, newAmount, cashEquivValue, sessionId)
    res.status(200).json({ amUpdated: amUpdated })
  }
  catch (error) {
    console.error(error)
    res.status(403).json({ amUpdated: false })

  }
})
//===================================================================================================================================
app.post('/updateCashFlowRate', async (req, res) => {
  const { rowId, newCashFlowRate, newCashFlowCashEquiv1, sessionId } = req.body;
  const newRate = parseFloat(newCashFlowRate);
  const newCashFlowCashEquiv = parseFloat(newCashFlowCashEquiv1);
  try {
    const { amUpdated } = await updateCashFlowRate(req, rowId, newRate, newCashFlowCashEquiv, sessionId)
    console.log("Sly " + amUpdated)
    res.status(200).json({ amUpdated: amUpdated })
  }
  catch (error) {
    console.error(error)
    res.status(403).json({ amUpdated: false })

  }

})
//=========================================================================================================================

//DELETING ROW BASED ON ID
app.delete('/delete', async (req, res) => {
  console.log('i am the delete row procedure ');
  const { checkedRowsId, sessionId } = req.body;
  try {
    const { amDeleted } = await deleteCashFLow(req, checkedRowsId, sessionId)
    res.status(200).json({ amDeleted: amDeleted })
  }
  catch (error) {
    console.error(error)
    res.status(403).json({ amDeleted: false })

  }
})

//===================================================================================================================================

app.post('/saveCashflow', async (req, res) => { // CONNECT THE API END POINT
  //take the array transfered
  const { itemsToProcess, sessionId } = req.body
  try {
    const { isSaving, insertedDocuments } = await saveCashFlowData(req, itemsToProcess, sessionId)

    res.status(200).json({
      isSaving: isSaving,
      documents: insertedDocuments

    });
  }
  catch (error) {
    console.error(error)
    res.status(403).json({ isSaving: false })
  }
})

// ==========================================================================================
app.post('/cashFlowData', upload.single('csvFile'), (req, res) => {
  // Access the sessionid from the form data
  const sessionId = req.body.sessionId;
  console.log(sessionId)
  // Get the file path using __dirname and the uploaded file's filename
  const filePath = path.join(__dirname, 'uploads', req.file.filename);

  // Define headers for each template
  let loyverseHeaders = ["Date", "Store", "POS", "Shift number", "Type", "Employee", "Comment", "Amount"];
  let slyRetailHeaders = ["Id", "Date", 'Type', "ShiftNo", "Tax", "InvoiceRef", "Description", "Category", "Currency", "Amount", "Rate", "CashEquiv"];
  const itemsToProcess = [];
  let checkTemplateStatus = '';

  // Stream the file to detect the separator and process the data
  const fileStream = fs.createReadStream(filePath);

  // To detect the separator, we only need to read the first chunk of the file
  fileStream.once('data', (chunk) => {
    const firstLine = chunk.toString().split('\n')[0];  // Get the first line
    const separator = firstLine.includes(';') ? ';' : ','; // Check if semicolon or comma
    // Reopen the file stream to process the CSV file using the detected separator
    fs.createReadStream(filePath)
      .pipe(csv({ separator })) // Use the detected separator
      .on('data', (row) => {
        // Check if row matches any of the predefined templates
        if (loyverseHeaders.every(header => row.hasOwnProperty(header))) {
          checkTemplateStatus = 'loyverseHeaders';
        } else if (slyRetailHeaders.every(header => row.hasOwnProperty(header))) {
          checkTemplateStatus = 'slyRetailHeaders';
        }
        // Loop through the row keys and trim any extra spaces
        for (const key in row) {
          if (row.hasOwnProperty(key)) {
            // Trim the key and value
            const trimmedKey = key.trim().replace(/\s+/g, '');  // Remove spaces from key
            const trimmedValue = row[key].trim();
            // Remove the original key and update with trimmed key and value
            delete row[key];
            row[trimmedKey] = trimmedValue;
          }
        }

        // Push the processed row to the itemsToProcess array
        itemsToProcess.push(row);
      })
      .on('end', async () => {
        try {
          const { isSaving, insertedDocuments, insertedCategories } = await insertCashFlowData(req, itemsToProcess, checkTemplateStatus, sessionId);
          res.status(200).json({
            isSaving: isSaving,
            documents: insertedDocuments,
            categoriesDocs: insertedCategories
          });
        } catch (error) {
          console.error('Error inserting data:', error);
          res.status(500).json({ message: 'Error processing data' });
        } finally {
          // Clean up the uploaded file after processing
          fs.unlink(filePath, (err) => {
            if (err) {
              console.error('Error deleting file:', err);
            } else {
              console.log('Uploaded file deleted successfully');
            }
          });
        }
      })
      .on('error', (error) => {
        console.error('Error parsing CSV:', error);
        res.status(500).json({ message: 'Error parsing CSV file' });
      });
  });

  fileStream.on('error', (error) => {
    console.error('Error reading file:', error);
    res.status(500).json({ message: 'Error reading uploaded file' });
  });
});

//===================================================================================
app.get('/getCategories', async (req, res) => {
  try {
    const actualSessionId = req.cookies['connect.sid']; // Access the cookie directly
    //Remove the 's:' prefix and return only the actual session ID
    const sessionId = actualSessionId.split(':')[1].split('.')[0];
    const { allCashFlowCategories } = await getCategories(req, sessionId);
    // console.log(allCashFlowCategories +'sly')
    res.json(allCashFlowCategories);
  } catch (err) {
    console.error('Error fetching categories :', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
//===================================================================
app.post('/UpdateCashFlowData', async (req, res) => { // CONNECT THE API END POINT TO UPDATE ONE EXPENSE PER TIME
  const { itemsToProcess } = req.body
  try {
    const { amUpdated, insertedDocuments } = await updateCashFlowData(itemsToProcess)
    console.log(amUpdated)
    res.status(200).json({
      amUpdated: amUpdated,
      documents: insertedDocuments
    });
  }
  catch (error) {
    console.error(error)
    res.status(403).json({ amUpdated: false })
  }

});
//========================================================================================
app.post('/insertCategory', async (req, res) => { // CONNECT THE API END POINT

  const { categoryToDb, sessionId } = req.body;
  try {
    const { isSaving, insertedCategories } = await insertCategory(req, categoryToDb, sessionId)
    // console.log(insertedCategories)
    // console.log(isSaving)
    res.status(200).json({
      isSaving: isSaving,
      documents: insertedCategories
    });
  }
  catch (error) {
    console.error(error)
    res.status(403).json({ isSaving: false })
  }

})
//======================================================================================================
app.post('/updateAssignedDocs', async (req, res) => { // CONNECT THE API END POINT
  const { assignedItemsArray, sessionId } = req.body; //TAKE THE VARIABLES TRANSFERED
  const theCategoryName = req.body.theCategoryName; //TAKE THE VARIABLES TRANSFERED
  try {
    const { isUpdated } = await updateAssignedCategories(req, assignedItemsArray, theCategoryName, sessionId)
    res.status(200).json({
      isUpdated: isUpdated,
    });
  }
  catch (error) {
    console.error(error)
    res.status(403).json({ isSaving: false })
  }

})
//========================================================================================
app.post('/UpdateCategoryRow', async (req, res) => { // CONNECT THE API END POINT
  const categoryId = req.body.categoryId; //TAKE THE VARIABLES TRANSFERED
  const categoryName = req.body.categoryName; //TAKE THE VARIABLES TRANSFERED
  const oldCatName = req.body.oldCatName; //TAKE THE VARIABLES TRANSFERED
  const categoryLimit = req.body.categoryLimit;
  const limitRange = req.body.limitRange;
  const balanceValue = req.body.balanceValue;
  const sessionId = req.body.sessionId;
  try {
    const { isUpdated } = await updateCategoryRow(req, categoryId, oldCatName, categoryName, categoryLimit, limitRange, balanceValue, sessionId)
    res.status(200).json({
      isUpdated: isUpdated,
    });
  }
  catch (error) {
    console.error(error)
    res.status(403).json({ isSaving: false })
  }

})
//====================================================================================================================
//DELETING PAYMENT TYPE ROW 
app.delete('/deleteCategoriesRows', async (req, res) => {
  const { checkedRowsId, sessionId } = req.body;
  try {
    const { amDeleted } = await deleteCategory(req, checkedRowsId, sessionId)
    console.log(amDeleted)

    res.status(200).json({
      amDeleted: amDeleted,
    });
  }
  catch (error) {
    console.error(error)
    res.status(403).json({ amDeleted: false })
  }
})
//===================================================================================

// Handle the incoming request to get the array for exporting
app.post('/getArrayForExport', async (req, res) => {
  try {
    // Extract the data from the request payload
    const startDate = new Date(req.body.startDate);
    const endDate = new Date(req.body.endDate);
    const pageSize = parseInt(req.body.pageSize);
    const page = parseInt(req.body.page);
    const payInFilterCategory = (req.body.payInFilterCategory);
    const payOutFilterCategory = (req.body.payOutFilterCategory);
    const exportingCriteria = (req.body.exportingCriteria);
    const advExportingCriteria = (req.body.advExportingCriteria);
    const sessionId = (req.body.sessionId);
    const { data } = await exportingArray(req, startDate, endDate, pageSize, page, payInFilterCategory, payOutFilterCategory, exportingCriteria, advExportingCriteria, sessionId);
    // Send a response back to the client
    res.json(data);
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'An error occurred' });
  }
});
//=========================================================================================
app.get('/details', async (req, res) => {
  try {
    // Get the session ID from the 'connect.sid' cookie
    const actualSessionId = req.cookies['connect.sid']; // Access the cookie directly
    //Remove the 's:' prefix and return only the actual session ID
    const sessionId = actualSessionId.split(':')[1].split('.')[0];
    const { details } = await getAccountingPeriodDetails(req, sessionId);
    // console.log(details)
    res.json(details);
  } catch (err) {
    console.error('Error fetching accounting details:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
//========================================================================================
app.post('/updateAccountingPeriod', async (req, res) => {
  const id = req.body.id;
  const startDate = req.body.startDate;
  const sessionId = req.body.sessionId;
  try {
    const { isModified } = await updateAccountingPeriod(req, id, startDate, sessionId);
    res.status(200).json({
      isModified: isModified
    });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'An error occurred' });
  }
});

//========================================================================================
app.get('/cashFlowArray', async (req, res) => {

  try {
    // Get the session ID from the 'connect.sid' cookie
    const actualSessionId = req.cookies['connect.sid']; // Access the cookie directly
    //Remove the 's:' prefix and return only the actual session ID
    const sessionId = actualSessionId.split(':')[1].split('.')[0];
    const { cashFlows } = await arrayForImport(req, sessionId);
    // Send a response back to the client
    res.status(200).json(cashFlows);
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'An error occurred' });
  }
});
//=======================================================================================
app.get('/TrialBalance', async (req, res) => {
  // Get the session ID from the 'connect.sid' cookie
  const actualSessionId = req.cookies['connect.sid']; // Access the cookie directly
  //Remove the 's:' prefix and return only the actual session ID
  const sessionId = actualSessionId.split(':')[1].split('.')[0];
  const { isocode, totalCostIncome, totalCostExpenses } = await getTrialBalanceData(req, sessionId)
  const accountName = dbName
  res.render("trialBalance", { isocode, accountName, totalCostIncome, totalCostExpenses });
});

//===========================================================================================
//CATEGORIES PAGE

app.get('/Categories', async (req, res) => {
  // Get the session ID from the 'connect.sid' cookie
  const actualSessionId = req.cookies['connect.sid']; // Access the cookie directly
  //Remove the 's:' prefix and return only the actual session ID
  const sessionId = actualSessionId.split(':')[1].split('.')[0];

  const { isocode } = await getCategories(req, sessionId)
  res.render("categories", { isocode });
  // res.render("Categories", { isocode }, { sessionId });
});

//===================================================================================
//SETTINGS PAGE
app.get("/settings", function (req, res,) {
  res.render("settings");
});
//==========================================================================================
//terms and conditions PAGE
app.get("/termsandconditions", function (req, res,) {
  res.render("terms");
});
//==========================================================================================
//currency table edit mode
app.post('/UpdateCurrencies', async (req, res) => { // CONNECT THE API END POINT

  const currencyId = req.body.currencyId; //TAKE THE VARIABLES TRANSFERED
  const paymentType = req.body.paymentType; //TAKE THE VARIABLES TRANSFERED
  const paymentName = req.body.paymentName;
  const paymentRate = req.body.paymentRate;
  const sessionId = req.body.sessionId;
  try {
    const { isUpdated } = await updateCurrencies(req, currencyId, paymentType, paymentName, paymentRate, sessionId)
    res.status(200).json({
      isUpdated: isUpdated
    });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'An error occurred' });
  }


});
//==============================================================================================
//UPDATE THE BASE CURRENCY VALUE IN DATABASE

app.post('/updateBaseCurrency', async (req, res) => {
  const paymentId = req.body.paymentId;
  const sessionId = req.body.sessionId;
  try {
    const { isUpdated } = await updateBaseCurrency(req, paymentId, sessionId)
    res.status(200).json({
      isUpdated: isUpdated
    });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'An error occurred' });
  }
});
//==============================================================================================
app.post('/createNewCurrency', async (req, res) => { // CONNECT THE API END POINT
  const paymentType = req.body.paymentType; //TAKE THE VARIABLES TRANSFERED
  const paymentName = req.body.paymentName;
  const paymentRate = req.body.paymentRate;
  const sessionId = req.body.sessionId;
  try {
    const { isSaved } = await insertNewCurrency(req, paymentType, paymentName, paymentRate, sessionId)
    res.status(200).json({
      isSaved: isSaved
    });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'An error occurred' });
  }
});

//==============================================================================================
app.post('/UpdateCurrenciesName', async (req, res) => { // CONNECT THE API END POINT

  const currencyId = req.body.currencyId; //TAKE THE VARIABLES TRANSFERED
  const paymentType = req.body.newPaymentType; //TAKE THE VARIABLES TRANSFERED
  const sessionId = req.body.sessionId; //TAKE THE VARIABLES TRANSFERED
  try {
    const { isUpdated } = await updateCurrencyName(req, currencyId, paymentType, sessionId)
    res.status(200).json({
      isUpdated: isUpdated
    });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'An error occurred' });
  }
});
//==================================================================================================
//RateCell to post the value and update database
app.post('/updateCurrencyRate', async (req, res) => {
  const { currencyId, CurrencyRate, sessionId } = req.body;
  try {
    const { isUpdated } = updateCurrencyRate(req, currencyId, CurrencyRate, sessionId)
    res.status(200).json({
      isUpdated: isUpdated
    });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'An error occurred' });
  }

})
// //================================================================================================
//DELETING PAYMENT TYPE ROW 
app.delete('/deletePaymentTypeRows', async (req, res) => {
  const { idToDelete, sessionId } = req.body;
  try {
    const { amDeleted } = await deleteCurrency(req, idToDelete, sessionId)
    res.status(200).json({
      amDeleted: amDeleted
    });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'An error occurred' });
  }
})
//================================================================================================
app.listen(2000, function () {
  console.log("Server started on port 2000");
});

