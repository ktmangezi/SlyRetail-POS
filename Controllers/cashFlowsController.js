import moment from "moment-timezone";
import { ObjectId } from 'mongodb';
import { CashflowModel } from '../Schemas/slyretailCashflowSchemas.js';
import { CurrenciesModel } from '../Schemas/slyretailCurrenciesSchemas.js';
import { CashflowCategoriesModel } from '../Schemas/slyretailCategoriesSchemas.js';
import { connectDB } from '../Schemas/slyretailDbConfig.js';

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
export async function getCashFlowArray(req, startDate, endDate, pageSize, page, payInFilterCategory, payOutFilterCategory, advancedSearchInput, searchInput, payOutSearchInput, sessionId) {
    try {
        const db = await connectDB(req, databaseName, signingCriteria, sessionId);
        if (db) {
            // Create the model with the specific connection
            const myCashflowModel = CashflowModel(db);
            const myCurrenciesModel = CurrenciesModel(db);
            cashFlows = await myCashflowModel.find()
            // Always Sort the array by 'income date' in ascending order, when the user want to change this it is up to her
            //and the settings are to be kept under local storage
            cashFlows.sort((a, b) => {
                const [dayA, monthA, yearA] = a.CashFlowDate.split('/');
                const [dayB, monthB, yearB] = b.CashFlowDate.split('/');
                return new Date(yearA, monthA - 1, dayA) - new Date(yearB, monthB - 1, dayB);
            });

            let totalExpensesPerRange = 0;
            let totalIncomePerRange = 0;
            let advSearchedInputTotal = 0;
            let payInSearchedInputTotal = 0;
            let payOutSearchedInputTotal = 0;
            let totalExpensesPerRangeAdv = 0;
            let totalIncomePerRangeAdv = 0;
            let theBeforeIncome = 0
            let theBeforeExpenses = 0
            let cashFlowArray = []
            let payOutcashFlowArray = []
            let allCashFlows = []
            let payOutsearchedInputArray = []
            let payInsearchedInputArray = []
            let advSearchedInputArray = []
            //CHECK THE BASE CURRENCY
            let myRate = ''
            let baseCurrency = await myCurrenciesModel.findOne({ BASE_CURRENCY: 'Y' });
            if (baseCurrency) {
                myRate = baseCurrency.RATE
            }
            for (let a = 0; a < cashFlows.length; a++) { //first loop for the purpose of PAYINs AND OUTs totals
                //DURING THIS LOOP, ONE CAN TAKE ADVANTAGE AND CALCULATE THE OPENING BAL FOR BOTH THE PAYINs AND OUTs
                const row = cashFlows[a];
                const date = row.CashFlowDate;
                //    console.log(row)
                const parts = date.split("/");
                const formattedDate = parts[1] + "/" + parts[0] + "/" + parts[2];
                const formattedDates2 = new Date(formattedDate);
                //RE CALCULATE THE CASH EQUIVE BASE ON THE CURRENCY SELECTED

                const relativeRate = row.CashFlowRate / baseCurrency.RATE;
                row.CashFlowCashEquiv = Number(parseFloat(row.CashFlowAmount) / parseFloat(relativeRate)).toFixed(2);
                //calculate the opening balance
                //GET THE VALUE OF THE PREVIOUS MONTH BASED ON THE RANGE SELECTED
                const momntStartDate1 = moment.tz(startDate, "Africa/Harare").startOf('day'); // Midnight in Zimbabwe

                // Subtract 1 day correctly
                let theBeforeStartDate1 = momntStartDate1.clone().subtract(1, "days");

                // Convert to JavaScript Date without shifting to UTC
                theBeforeStartDate1 = moment.tz(theBeforeStartDate1.format("YYYY-MM-DD HH:mm:ss"), "Africa/Harare").toDate();

                // Ensure formattedDates2 is also in Zimbabwe timezone
                const formattedDates2Zim = moment.tz(formattedDates2, "Africa/Harare").startOf('day').toDate();

                if (row.CashFlowType === "Payout") {
                    if (theBeforeStartDate1.getTime() >= formattedDates2Zim.getTime()) {
                        theBeforeExpenses += parseFloat(parseFloat(row.CashFlowCashEquiv).toFixed(2));
                    }
                } else if (row.CashFlowType === "Pay in") {
                    if (theBeforeStartDate1.getTime() >= formattedDates2Zim.getTime()) {
                        theBeforeIncome += parseFloat(parseFloat(row.CashFlowCashEquiv).toFixed(2));
                    }
                }


                // const momntStartDate = moment(startDate)

                // let theBeforeStartDate = momntStartDate.subtract(1, "days")

                // theBeforeStartDate = new Date(theBeforeStartDate)
                // if (row.CashFlowType === "Payout") {
                //     if (theBeforeStartDate.getTime() >= formattedDates2.getTime()) {
                //         theBeforeExpenses += parseFloat(row.CashFlowCashEquiv);
                //     }
                // }
                // else if (row.CashFlowType === "Pay in") {
                //     if (theBeforeStartDate.getTime() >= formattedDates2.getTime()) {
                //         theBeforeIncome += parseFloat(row.CashFlowCashEquiv);
                //     }
                // }
                // const openingBalance = parseFloat(theBeforeIncome) - parseFloat(theBeforeExpenses)
                // console.log("Iam The opening Bal local " + openingBalance)
                // // console.log("Ihave started my computation from" + theBeforeStartDate.getTime())

                if (startDate.getTime() <= formattedDates2.getTime() && formattedDates2.getTime() <= endDate.getTime()) {
                    if (row.CashFlowType === 'Payout') {

                        //ALSO IF THE SARCH INPUT HAS SOMETHING BUT THE CATEGORY FILTE DOESNT
                        const match = (row.CashFlowDescription).toLowerCase().includes(advancedSearchInput)
                        if (match) {
                            //collect the totals of the filterd stuff
                            payOutSearchedInputTotal += parseFloat(row.CashFlowCashEquiv);
                            //THEN CREATE THE ARRAY FOR all the searched stuff
                            payOutsearchedInputArray.push(cashFlows[a])
                        }

                        //get totals for advanced sheet
                        totalExpensesPerRangeAdv = parseFloat(totalExpensesPerRangeAdv) + parseFloat(row.CashFlowCashEquiv)


                    }
                    if (row.CashFlowType === 'Pay in') {

                        //ALSO IF THE SARCH INPUT HAS SOMETHING BUT THE CATEGORY FILTE DOESNT
                        const match = (row.CashFlowDescription).toLowerCase().includes(advancedSearchInput)
                        if (match) {
                            //collect the totals of the filterd stuff
                            payInSearchedInputTotal += parseFloat(row.CashFlowCashEquiv);
                            //THEN CREATE THE ARRAY FOR all the searched stuff
                            payInsearchedInputArray.push(cashFlows[a])
                        }

                        //get totals for advanced sheet
                        totalIncomePerRangeAdv = parseFloat(totalIncomePerRangeAdv) + (row.CashFlowCashEquiv)
                        //get the payOuts
                    }

                    //FOR ADVANCE
                    const match = (row.CashFlowDescription).toLowerCase().includes(advancedSearchInput)
                    if (match) {
                        //collect the totals of the filterd stuff
                        advSearchedInputTotal = parseFloat(advSearchedInputTotal) + (row.CashFlowCashEquiv);
                        //get the array of both payins and payouts searched
                        advSearchedInputArray.push(cashFlows[a])
                    }
                    else {
                        // advSearchedInputTotal = parseFloat(advSearchedInputTotal) + (row.CashFlowCashEquiv);
                        //get the array of both payins and payouts
                        allCashFlows.push(cashFlows[a])
                    }

                }
            }

            // console.log(index2 +'index2')
            //THE OPENING BALANCE FOR THE SELECTED RANGE
            const openingBalance = parseFloat(theBeforeIncome) - parseFloat(theBeforeExpenses)
            // console.log("Iam The opening Bal " + openingBalance)
            //THEN CREATE THE ARRAY FOR PAYINS, FOR THE CURRENT RANGE 'this is the one to go to the client side js'
            const startIndex = (parseInt(page) - 1) * parseInt(pageSize);
            const endIndex = startIndex + parseInt(pageSize);
            const itemsToProcess = cashFlowArray.slice(startIndex, endIndex);
            const totalPages = Math.ceil(cashFlowArray.length / pageSize);
            const itemsToProcess1 = payOutcashFlowArray.slice(startIndex, endIndex);
            const totalPages1 = Math.ceil(payOutcashFlowArray.length / pageSize);
            const itemsToProcess2 = allCashFlows.slice(startIndex, endIndex);
            const totalPages2 = Math.ceil(allCashFlows.length / pageSize);
            const payOutSearchedItemsToProcess = payOutsearchedInputArray.slice(startIndex, endIndex);
            const payOutSearchedTotalPages = Math.ceil(payOutsearchedInputArray.length / pageSize);
            const payInSearchedItemsToProcess = payInsearchedInputArray.slice(startIndex, endIndex);
            const payInSearchedTotalPages = Math.ceil(payInsearchedInputArray.length / pageSize);
            const advSearchedItemsToProcess = advSearchedInputArray.slice(startIndex, endIndex);
            const advSearchedTotalPages = Math.ceil(advSearchedInputArray.length / pageSize);


            const data = {
                startDate: startDate,
                endDate: endDate,
                openingBalance: openingBalance,
                payOutSearchedInputTotal: payOutSearchedInputTotal,
                payInSearchedInputTotal: payInSearchedInputTotal,
                totalIncomePerRange: totalIncomePerRange,
                totalExpensesPerRange: totalExpensesPerRange,
                totalPages: totalPages,
                itemsToProcess: itemsToProcess, //THIS MUST ONLY CONTAINS THE INFORMATION OF WHATEVER THAT IS THE CURRENT PAGE BY THE USER
                totalPages1: totalPages1,
                itemsToProcess1: itemsToProcess1,
                itemsToProcess2: itemsToProcess2,
                allCashFlows: allCashFlows,
                totalPages2: totalPages2,
                payInSearchedItemsToProcess: payInSearchedItemsToProcess,
                payInSearchedTotalPages: payInSearchedTotalPages,
                payOutSearchedItemsToProcess: payOutSearchedItemsToProcess,
                payOutSearchedTotalPages: payOutSearchedTotalPages,
                totalExpensesPerRangeAdv: totalExpensesPerRangeAdv,
                totalIncomePerRangeAdv: totalIncomePerRangeAdv,
                advSearchedItemsToProcess: advSearchedItemsToProcess,
                advSearchedTotalPages: advSearchedTotalPages,


            };
            return { data };
        }
    }
    catch (err) {
        console.error('Error connecting to MongoDB:', err);
    }

}


export async function updateCashFlowDate(req, rowId, newDate, startDate, endDate, pageSize, page, advancedSearchInput, sessionId) {
    try {
        const db = await connectDB(req, databaseName, signingCriteria, sessionId);
        if (!db) {
            throw new Error('Failed to connect to the database');
        }
        // Create the model with the specific connection
        const myCashflowModel = CashflowModel(db);
        const myCurrenciesModel = CurrenciesModel(db);

        // Convert startDate and endDate to Date objects
        startDate = new Date(startDate);
        endDate = new Date(endDate);
        cashFlows = await myCashflowModel.find()
        // Always Sort the array by 'income date' in ascending order, when the user want to change this it is up to her
        //and the settings are to be kept under local storage
        cashFlows.sort((a, b) => {
            const [dayA, monthA, yearA] = a.CashFlowDate.split('/');
            const [dayB, monthB, yearB] = b.CashFlowDate.split('/');
            return new Date(yearA, monthA - 1, dayA) - new Date(yearB, monthB - 1, dayB);
        });


        console.log('i am the  update date  procedure  ');
        const updatedResult = await myCashflowModel.updateOne({ _id: ObjectId(rowId) }, {
            $set: {
                CashFlowDate: newDate
            }
        })
        if (updatedResult.modifiedCount > 0) {
            // Fetch updated data after update
            const allDocuments = await myCashflowModel.find({});
            let allCashFlows = [];
            let advsearchedInputArray = [];
            let payOutSearchedInputTotal = 0;
            let payInSearchedInputTotal = 0;
            let totalExpensesPerRangeAdv = 0;
            let totalIncomePerRangeAdv = 0;

            // Get base currency
            const baseCurrency = await myCurrenciesModel.findOne({ BASE_CURRENCY: 'Y' });
            if (!baseCurrency) {
                throw new Error('Base currency not found');
            }

            // Process all documents
            for (let a = 0; a < allDocuments.length; a++) {
                const row = allDocuments[a];
                const date = row.CashFlowDate;
                const parts = date.split("/");
                const formattedDate = parts[1] + "/" + parts[0] + "/" + parts[2];
                const formattedDates2 = new Date(formattedDate);

                // Recalculate the cash equivalent based on the selected currency
                const relativeRate = row.CashFlowRate / baseCurrency.RATE;
                row.CashFlowCashEquiv = Number(parseFloat(row.CashFlowAmount) / parseFloat(relativeRate)).toFixed(2);

                // Convert dates to Africa/Harare timezone
                const startDateZim = moment.tz(startDate, "Africa/Harare").startOf('day').toDate();
                const endDateZim = moment.tz(endDate, "Africa/Harare").startOf('day').toDate();
                const formattedDates2Zim = moment.tz(formattedDates2, "Africa/Harare").startOf('day').toDate();

                // Check if the date is within the range
                if (startDateZim.getTime() <= formattedDates2Zim.getTime() && formattedDates2Zim.getTime() <= endDateZim.getTime()) {
                    if (row.CashFlowType === 'Payout') {
                        const match = (row.CashFlowDescription).toLowerCase().includes(advancedSearchInput);
                        if (match) {
                            payOutSearchedInputTotal += parseFloat(row.CashFlowCashEquiv);
                            advsearchedInputArray.push(row);
                        }
                        allCashFlows.push(row);
                        totalExpensesPerRangeAdv += parseFloat(row.CashFlowCashEquiv);
                    }
                    if (row.CashFlowType === 'Pay in') {
                        const match = (row.CashFlowDescription).toLowerCase().includes(advancedSearchInput);
                        if (match) {
                            payInSearchedInputTotal += parseFloat(row.CashFlowCashEquiv);
                            advsearchedInputArray.push(row);
                        }
                        allCashFlows.push(row);
                        totalIncomePerRangeAdv += parseFloat(row.CashFlowCashEquiv);
                    }
                }
            }

            // Paginate the results
            const startIndex = (parseInt(page) - 1) * parseInt(pageSize);
            const endIndex = startIndex + parseInt(pageSize);
            const itemsToProcess = allCashFlows.slice(startIndex, endIndex);
            const totalPages = Math.ceil(allCashFlows.length / pageSize);
            const searchedItemsToProcess = advsearchedInputArray.slice(startIndex, endIndex);
            const searchedTotalPages = Math.ceil(advsearchedInputArray.length / pageSize);

            // Prepare the response data
            const data = {
                amUpdated: true,
                totalPages: totalPages,
                itemsToProcess: itemsToProcess,
                searchedTotalPages: searchedTotalPages,
                searchedItemsToProcess: searchedItemsToProcess,
                allCashFlows: allCashFlows,
                advIncomeTotal: totalIncomePerRangeAdv,
                advExpenseTotal: totalExpensesPerRangeAdv,
                advSearchedpayinTotal: payInSearchedInputTotal,
                advSearchedpayoutTotal: payOutSearchedInputTotal,
            };

            return { data };
        } else {
            // No documents were deleted
            return { data: { amUpdated: false } };
        }

    } catch (err) {
        console.error('Error updating date:', err);
        return { amUpdated: 'Failed to update,please try again' }

    }
}
//=================================================================================================

export async function updateCashFlowType(req, rowId, typeSelected, sessionId) {
    try {
        const db = await connectDB(req, databaseName, signingCriteria, sessionId);
        if (db) {
            // Create the model with the specific connection
            const myCashflowModel = CashflowModel(db);
            cashFlows = await myCashflowModel.find()
            const myCategoriesModel = CashflowCategoriesModel(db);
            // Always Sort the array by 'income date' in ascending order, when the user want to change this it is up to her 
            //and the settings are to be kept under local storage
            cashFlows.sort((a, b) => {
                const [dayA, monthA, yearA] = a.CashFlowDate.split('/');
                const [dayB, monthB, yearB] = b.CashFlowDate.split('/');
                return new Date(yearA, monthA - 1, dayA) - new Date(yearB, monthB - 1, dayB);
            });
            console.log('i am the  update cashflow type  procedure  ');
            const updatedDocument = await myCashflowModel.findOneAndUpdate(
                { _id: ObjectId(rowId) },
                {
                    $set: {
                        CashFlowType: typeSelected,
                        CashFlowCategory: 'suspense'
                    }
                },
                { new: true } // Return the updated document
            );

            if (updatedDocument) {
                console.log('Document updated successfully:', updatedDocument);
                amUpdated = true;
            } else {
                console.log('No document was updated.');
                amUpdated = false;
            }


            //update the categories based on the type selected
            if (typeSelected === 'Pay in') {
                typeSelected = 'PayIn'
            }
            else if (typeSelected === 'Payout') {
                typeSelected = 'PayOut'
            }
            let categoryExist = await myCategoriesModel.findOne({ category: 'suspense', Balance: typeSelected });
            if (!categoryExist) {
                try {
                    const categoryEntry = new myCategoriesModel({ category: 'suspense', CategoryLimit: 0, CategoryLimitRange: '', Balance: typeSelected });
                    await categoryEntry.save()
                }
                catch (error) {
                    console.error("Error saving category", error);
                }
            }
            return { amUpdated, updatedDocument };
        }

    } catch (err) {
        console.error('Error updating type:', err);
        return { amUpdated: 'Failed to update,please try again' }

    }
}
// //=====================================================================================================
export async function updateCashFlowShift(req, rowId, shift, sessionId) {
    try {
        const db = await connectDB(req, databaseName, signingCriteria, sessionId);
        if (db) {
            // Create the model with the specific connection
            const myCashflowModel = CashflowModel(db);
            cashFlows = await myCashflowModel.find()
            // Always Sort the array by 'income date' in ascending order, when the user want to change this it is up to her
            //and the settings are to be kept under local storage
            cashFlows.sort((a, b) => {
                const [dayA, monthA, yearA] = a.CashFlowDate.split('/');
                const [dayB, monthB, yearB] = b.CashFlowDate.split('/');
                return new Date(yearA, monthA - 1, dayA) - new Date(yearB, monthB - 1, dayB);
            });
            console.log('i am the  update cashflow shift  procedure  ');
            await myCashflowModel.updateOne({ _id: ObjectId(rowId) }, {
                $set: {
                    CashFlowShift: shift
                }
            }).then(result => {
                console.log(`${result.modifiedCount} document(s) updated.`);
                modifiedCount = result.modifiedCount
                if (modifiedCount !== 0) {
                    amUpdated = true;
                }
                else if (modifiedCount === 0) {
                    amUpdated = false;
                }
            })
            return { amUpdated };
        }
    } catch (err) {
        console.error('Error updating shift:', err);
        return { amUpdated: 'Failed to update,please try again' }

    }
}
//====================================================================================================
export async function updateCashFlowTax(req, rowId, taxDataToUpdate, sessionId) {
    try {
        const db = await connectDB(req, databaseName, signingCriteria, sessionId);
        if (db) {
            // Create the model with the specific connection
            const myCashflowModel = CashflowModel(db);
            cashFlows = await myCashflowModel.find()
            // Always Sort the array by 'income date' in ascending order, when the user want to change this it is up to her
            //and the settings are to be kept under local storage
            cashFlows.sort((a, b) => {
                const [dayA, monthA, yearA] = a.CashFlowDate.split('/');
                const [dayB, monthB, yearB] = b.CashFlowDate.split('/');
                return new Date(yearA, monthA - 1, dayA) - new Date(yearB, monthB - 1, dayB);
            });
            let updatedDocument
            for (let v = 0; v < taxDataToUpdate.length; v++) {
                const tax = taxDataToUpdate[v];
                if (tax.taxName === 'vat') {

                    if (tax.VatStatus === 'N') {

                        updatedDocument = await myCashflowModel.findOneAndUpdate({ _id: ObjectId(rowId) },  // Find the document by its _id
                            {
                                $set: {
                                    "Tax.vat.QRCode": tax.QRCode,  // Update only the taxStatusus field inside the Vat object
                                    "Tax.vat.DeviceId": tax.DeviceId, // Update only the taxStatus field inside the Vat object
                                    "Tax.vat.ZimraFsNo": tax.ZimraFsNo, // Update only the taxStatus field inside the Vat object
                                    "Tax.vat.VatNumber": tax.VatNumber, // Update only the taxStatus field inside the Vat object
                                    "Tax.vat.TinNumber": tax.TinNumber, // Update only the taxStatus field inside the Vat object
                                    "Tax.vat.VatAmount": tax.VatAmount, // Update only the taxStatus field inside the Vat object
                                    "Tax.vat.VatStatus": tax.VatStatus  // Update only the VatStatus field inside the Vat object
                                }
                            },
                            { new: true } // Return the updated document
                        )
                        if (updatedDocument) {
                            console.log('Document updated successfully:', updatedDocument);
                            amUpdated = true;
                        } else {
                            console.log('No document was updated.');
                            amUpdated = false;
                        }
                    } else if (tax.VatStatus === 'Y') {
                        console.log('i am the  update cashflow vat procedure  to true ' + tax.VatStatus + rowId);

                        updatedDocument = await myCashflowModel.findOneAndUpdate({ _id: ObjectId(rowId) },  // Find the document by its _id
                            {
                                $set: {
                                    "Tax.vat.QRCode": tax.QRCode,  // Update only the taxStatusus field inside the Vat object
                                    "Tax.vat.DeviceId": tax.DeviceId, // Update only the taxStatus field inside the Vat object
                                    "Tax.vat.ZimraFsNo": tax.ZimraFsNo, // Update only the taxStatus field inside the Vat object
                                    "Tax.vat.VatNumber": tax.VatNumber, // Update only the taxStatus field inside the Vat object
                                    "Tax.vat.TinNumber": tax.TinNumber, // Update only the taxStatus field inside the Vat object
                                    "Tax.vat.VatAmount": tax.VatAmount, // Update only the taxStatus field inside the Vat object
                                    "Tax.vat.VatStatus": tax.VatStatus  // Update only the VatStatus field inside the Vat object
                                }
                            },
                            { new: true } // Return the updated document
                        )
                        if (updatedDocument) {
                            console.log('Document updated successfully:', updatedDocument);
                            amUpdated = true;
                        } else {
                            console.log('No document was updated.');
                            amUpdated = false;
                        }
                    }
                }
                else if (tax.taxName === 'ztf') {
                    if (tax.ZtfStatus === 'N') {
                        console.log('i am the  update cashflow ztf procedure FALSE ' + tax.ZtfStatus + rowId);

                        updatedDocument = await myCashflowModel.findOneAndUpdate({ _id: ObjectId(rowId) },  // Find the document by its _id
                            {
                                $set: {
                                    "Tax.ztf.First": tax.First,  // Update only the taxStatusus field inside the Vat object
                                    "Tax.ztf.Second": tax.Second, // Update only the taxStatusus field inside the Vat object
                                    "Tax.ztf.LevyAmount": tax.LevyAmount, // Update only the taxStatusus field inside the Vat object
                                    "Tax.ztf.ZtfStatus": tax.ZtfStatus  // Update only the VatStatus field inside the Vat object
                                }
                            },
                            { new: true } // Return the updated document
                        )
                        if (updatedDocument) {
                            console.log('Document updated successfully:', updatedDocument);
                            amUpdated = true;
                        } else {
                            console.log('No document was updated.');
                            amUpdated = false;
                        }
                    }
                    else if (tax.ZtfStatus === 'Y') {
                        console.log('i am the  update cashflow ztf procedure YES ' + tax.ZtfStatus + tax.LevyAmount);
                        updatedDocument = await myCashflowModel.findOneAndUpdate({ _id: ObjectId(rowId) },  // Find the document by its _id
                            {
                                $set: {
                                    "Tax.ztf.First": tax.First,  // Update only the taxStatusus field inside the Vat object
                                    "Tax.ztf.Second": tax.Second, // Update only the taxStatusus field inside the Vat object
                                    "Tax.ztf.LevyAmount": tax.LevyAmount, // Update only the taxStatusus field inside the Vat object
                                    "Tax.ztf.ZtfStatus": tax.ZtfStatus  // Update only the VatStatus field inside the Vat object
                                }
                            },
                            { new: true } // Return the updated document
                        )
                        if (updatedDocument) {
                            console.log('Document updated successfully:', updatedDocument);
                            amUpdated = true;
                        } else {
                            console.log('No document was updated.');
                            amUpdated = false;
                        }
                    }
                }

            }
            return { amUpdated, updatedDocument }
        }

    } catch (err) {
        console.error('Error updating tax:', err);
        return { amUpdated: 'Failed to update,please try again' }

    }
}
//=====================================================================================================
export async function updateCashFlowInvoice(req, rowId, InvoiceRef, sessionId) {
    try {
        const db = await connectDB(req, databaseName, signingCriteria, sessionId);
        if (db) {
            // Create the model with the specific connection
            const myCashflowModel = CashflowModel(db);
            cashFlows = await myCashflowModel.find()
            // Always Sort the array by 'income date' in ascending order, when the user want to change this it is up to her
            //and the settings are to be kept under local storage
            cashFlows.sort((a, b) => {
                const [dayA, monthA, yearA] = a.CashFlowDate.split('/');
                const [dayB, monthB, yearB] = b.CashFlowDate.split('/');
                return new Date(yearA, monthA - 1, dayA) - new Date(yearB, monthB - 1, dayB);
            });
            console.log('i am the  update cashflow InvoiceRef  procedure  ');
            const updatedDocument = await myCashflowModel.findOneAndUpdate({ _id: ObjectId(rowId) }, {
                $set: {
                    CashFlowInvoiceRef: InvoiceRef
                }
            },
                { new: true } // Return the updated document
            )
            if (updatedDocument) {
                console.log('Document updated successfully:', updatedDocument);
                amUpdated = true;
            } else {
                console.log('No document was updated.');
                amUpdated = false;
            }

            return { amUpdated, updatedDocument };
        }
    } catch (err) {
        console.error('Error updating invoice number:', err);
        return { amUpdated: 'Failed to update,please try again' }

    }
}
//=====================================================================================================
export async function updateCashFlowDescription(req, rowId, description, sessionId) {
    try {
        const db = await connectDB(req, databaseName, signingCriteria, sessionId);
        if (db) {
            // Create the model with the specific connection
            const myCashflowModel = CashflowModel(db);
            cashFlows = await myCashflowModel.find()
            // Always Sort the array by 'income date' in ascending order, when the user want to change this it is up to her
            //and the settings are to be kept under local storage
            cashFlows.sort((a, b) => {
                const [dayA, monthA, yearA] = a.CashFlowDate.split('/');
                const [dayB, monthB, yearB] = b.CashFlowDate.split('/');
                return new Date(yearA, monthA - 1, dayA) - new Date(yearB, monthB - 1, dayB);
            });
            console.log('i am the  update cashflow description  procedure  ');
            const updatedDocument = await myCashflowModel.findOneAndUpdate({ _id: ObjectId(rowId) }, {
                $set: {
                    CashFlowDescription: description
                }
            },
                { new: true } // Return the updated document
            )
            if (updatedDocument) {
                console.log('Document updated successfully:', updatedDocument);
                amUpdated = true;
            } else {
                console.log('No document was updated.');
                amUpdated = false;
            }

            return { amUpdated, updatedDocument };
        }
    } catch (err) {
        console.error('Error updating description:', err);
        return { amUpdated: 'Failed to update,please try again' }

    }
}
//=====================================================================================================
export async function updateCashFlowCategory(req, rowId, newCategory, sessionId) {
    try {
        const db = await connectDB(req, databaseName, signingCriteria, sessionId);
        if (db) {
            // Create the model with the specific connection
            const myCashflowModel = CashflowModel(db);
            // Always Sort the array by 'income date' in ascending order, when the user want to change this it is up to her
            //and the settings are to be kept under local storage
            cashFlows.sort((a, b) => {
                const [dayA, monthA, yearA] = a.CashFlowDate.split('/');
                const [dayB, monthB, yearB] = b.CashFlowDate.split('/');
                return new Date(yearA, monthA - 1, dayA) - new Date(yearB, monthB - 1, dayB);
            });
            console.log('i am the  update cashflow category  procedure  ');
            const updatedDocument = await myCashflowModel.findOneAndUpdate({ _id: ObjectId(rowId) }, {
                $set: { CashFlowCategory: newCategory }
            },
                { new: true } // Return the updated document
            )
            if (updatedDocument) {
                console.log('Document updated successfully:', updatedDocument);
                amUpdated = true;
            } else {
                console.log('No document was updated.');
                amUpdated = false;
            }

            return { amUpdated, updatedDocument };
        }
    } catch (err) {
        console.error('Error updating:', err);
        return { amUpdated: 'Failed to update,please try again' }

    }
}
//====================================================================================================================
export async function updateCashFlowCurrency(req, rowId, newCurrency, cashEquivValue, newCashFlowRate1, sessionId) {
    try {

        const db = await connectDB(req, databaseName, signingCriteria, sessionId);
        if (db) {
            // Create the model with the specific connection
            const myCashflowModel = CashflowModel(db);
            // Always Sort the array by 'income date' in ascending order, when the user want to change this it is up to her
            //and the settings are to be kept under local storage
            cashFlows.sort((a, b) => {
                const [dayA, monthA, yearA] = a.CashFlowDate.split('/');
                const [dayB, monthB, yearB] = b.CashFlowDate.split('/');
                return new Date(yearA, monthA - 1, dayA) - new Date(yearB, monthB - 1, dayB);
            });
            console.log('i am the  update cashflow description  procedure  ');
            const updatedDocument = await myCashflowModel.findOneAndUpdate({ _id: ObjectId(rowId) }, {
                $set: {
                    CashFlowCurrency: newCurrency,
                    CashFlowRate: newCashFlowRate1, CashFlowCashEquiv: cashEquivValue
                }
            },
                { new: true } // Return the updated document
            )
            if (updatedDocument) {
                console.log('Document updated successfully:', updatedDocument);
                amUpdated = true;
            } else {
                console.log('No document was updated.');
                amUpdated = false;
            }

            return { amUpdated, updatedDocument };
        }
    } catch (err) {
        console.error('Error updating:', err);
        return { amUpdated: 'Failed to update,please try again' }

    }
}
//=====================================================================================================
export async function updateCashFlowAmount(req, rowId, newAmount, cashEquivValue, sessionId) {
    try {
        const db = await connectDB(req, databaseName, signingCriteria, sessionId);
        if (db) {
            // Create the model with the specific connection
            const myCashflowModel = CashflowModel(db);
            // Always Sort the array by 'income date' in ascending order, when the user want to change this it is up to her
            //and the settings are to be kept under local storage
            cashFlows.sort((a, b) => {
                const [dayA, monthA, yearA] = a.CashFlowDate.split('/');
                const [dayB, monthB, yearB] = b.CashFlowDate.split('/');
                return new Date(yearA, monthA - 1, dayA) - new Date(yearB, monthB - 1, dayB);
            });
            console.log('i am the  update cashflow amount  procedure  ');
            const updatedDocument = await myCashflowModel.findOneAndUpdate({ _id: ObjectId(rowId) }, {
                $set: {
                    CashFlowAmount: newAmount,
                    CashFlowCashEquiv: cashEquivValue
                }
            },
                { new: true } // Return the updated document
            )
            if (updatedDocument) {
                console.log('Document updated successfully:', updatedDocument);
                amUpdated = true;
            } else {
                console.log('No document was updated.');
                amUpdated = false;
            }

            return { amUpdated, updatedDocument };
        }
    } catch (err) {
        console.error('Error updating amount:', err);
        return { amUpdated: 'Failed to update,please try again' }

    }
}
//====================================================================================================================
export async function updateCashFlowRate(req, rowId, newRate, newCashFlowCashEquiv1, sessionId) {
    try {
        const db = await connectDB(req, databaseName, signingCriteria, sessionId);
        if (db) {
            // Create the model with the specific connection
            const myCashflowModel = CashflowModel(db);

            // Always Sort the array by 'income date' in ascending order, when the user want to change this it is up to her
            //and the settings are to be kept under local storage
            cashFlows.sort((a, b) => {
                const [dayA, monthA, yearA] = a.CashFlowDate.split('/');
                const [dayB, monthB, yearB] = b.CashFlowDate.split('/');
                return new Date(yearA, monthA - 1, dayA) - new Date(yearB, monthB - 1, dayB);
            });
            console.log('i am the  update cashflow rate  procedure  ');
            const updatedDocument = await myCashflowModel.findOneAndUpdate({ _id: ObjectId(rowId) }, {
                $set: {
                    CashFlowRate: newRate,
                    CashFlowCashEquiv: newCashFlowCashEquiv1
                }
            },
                { new: true } // Return the updated document
            )

            if (updatedDocument) {
                console.log('Document updated successfully:', updatedDocument);
                amUpdated = true;
            } else {
                console.log('No document was updated.');
                amUpdated = false;
            }
            console.log(updatedDocument)

            return { amUpdated, updatedDocument };
        }
    } catch (err) {
        console.error('Error updating rate:', err);
        return { amUpdated: 'Failed to update,please try again' }

    }
}
//====================================================================================================================
// export async function deleteCashFLow(req, startDate, endDate, pageSize, page, advancedSearchInput, checkedRowsId, sessionId) {
//     try {
//         const db = await connectDB(req, databaseName, signingCriteria, sessionId);
//         if (db) {
//             startDate = new Date(startDate)
//             endDate = new Date(endDate)
//             // Create the model with the specific connection
//             const myCashflowModel = CashflowModel(db);
//             const myCurrenciesModel = CurrenciesModel(db);
//             // Always Sort the array by 'income date' in ascending order, when the user want to change this it is up to her
//             //and the settings are to be kept under local storage
//             cashFlows = await myCashflowModel.find({})
//             cashFlows.sort((a, b) => {
//                 const [dayA, monthA, yearA] = a.CashFlowDate.split('/');
//                 const [dayB, monthB, yearB] = b.CashFlowDate.split('/');
//                 return new Date(yearA, monthA - 1, dayA) - new Date(yearB, monthB - 1, dayB);
//             });
//             console.log('i am the  delete cashflow row  procedure  ');
//             let deleteIds = [];
//             for (let i = 0; i < checkedRowsId.length; i++) {
//                 const cashFlowId = checkedRowsId[i];//get the array of ids to delete
//                 deleteIds.push(ObjectId(cashFlowId));//make each id an object of mongo db id
//             }
//             // Find and store deleted documents BEFORE deleting them
//             await myCashflowModel.deleteMany({ _id: { $in: deleteIds } })
//                 .then(result => {
//                     console.log(`${result.deletedCount} document(s) were deleted`);
//                     if (result.deletedCount > 0) {
//                         amDeleted = true;
//                         console.log(`${result.deletedCount} document(s) were deleted successfully.`);
//                         updatedData()
//                     }
//                     else if (result.deletedCount === 0) {
//                         amDeleted = false;
//                         const data = {}
//                         return { data }
//                     }

//                 })

//             async function updatedData() {
//                 const allDocuments = await myCashflowModel.find({});
//                 let allCashFlows = []
//                 let advsearchedInputArray = []
//                 let payOutSearchedInputTotal = 0
//                 let payInSearchedInputTotal = 0
//                 let totalExpensesPerRangeAdv = 0
//                 let totalIncomePerRangeAdv = 0
//                 let baseCurrency = await myCurrenciesModel.findOne({ BASE_CURRENCY: 'Y' });
//                 if (!baseCurrency) {
//                     return
//                 }
//                 for (let a = 0; a < allDocuments.length; a++) { //first loop for the purpose of PAYINs AND OUTs totals
//                     //DURING THIS LOOP, ONE CAN TAKE ADVANTAGE AND CALCULATE THE OPENING BAL FOR BOTH THE PAYINs AND OUTs
//                     const row = allDocuments[a];
//                     const date = row.CashFlowDate;
//                     //    console.log(row)
//                     const parts = date.split("/");
//                     const formattedDate = parts[1] + "/" + parts[0] + "/" + parts[2];
//                     const formattedDates2 = new Date(formattedDate);
//                     //RE CALCULATE THE CASH EQUIVE BASE ON THE CURRENCY SELECTED
//                     const relativeRate = row.CashFlowRate / baseCurrency.RATE;
//                     row.CashFlowCashEquiv = Number(parseFloat(row.CashFlowAmount) / parseFloat(relativeRate)).toFixed(2);
//                     startDate = moment.tz(startDate, "Africa/Harare").startOf('day'); // Midnight in Zimbabwe
//                     endDate = moment.tz(endDate, "Africa/Harare").startOf('day'); // Midnight in Zimbabwe
//                     // Convert to JavaScript Date objects (without shifting to UTC)
//                     startDate = startDate.toDate();
//                     endDate = endDate.toDate();
//                     // Ensure formattedDates2 is also in Zimbabwe timezone
//                     const formattedDates2Zim = moment.tz(formattedDates2, "Africa/Harare").startOf('day').toDate();
//                     if (startDate.getTime() <= formattedDates2Zim.getTime() && formattedDates2Zim.getTime() <= endDate.getTime()) {
//                         //FOR ADVANCE
//                         if (row.CashFlowType === 'Payout') {
//                             //ALSO IF THE SARCH INPUT HAS SOMETHING BUT THE CATEGORY FILTE DOESNT
//                             const match = (row.CashFlowDescription).toLowerCase().includes(advancedSearchInput)
//                             if (match) {
//                                 //collect the totals of the filterd stuff
//                                 payOutSearchedInputTotal += parseFloat(row.CashFlowCashEquiv);
//                                 //THEN CREATE THE ARRAY FOR all the searched stuff
//                                 advsearchedInputArray.push(cashFlows[a])
//                             }
//                             allCashFlows.push(cashFlows[a])

//                             //get totals for advanced sheet
//                             totalExpensesPerRangeAdv = parseFloat(totalExpensesPerRangeAdv) + parseFloat(row.CashFlowCashEquiv)
//                         }
//                         if (row.CashFlowType === 'Pay in') {
//                             //ALSO IF THE SARCH INPUT HAS SOMETHING BUT THE CATEGORY FILTE DOESNT
//                             const match = (row.CashFlowDescription).toLowerCase().includes(advancedSearchInput)
//                             if (match) {
//                                 //collect the totals of the filterd stuff
//                                 payInSearchedInputTotal += parseFloat(row.CashFlowCashEquiv);
//                                 //THEN CREATE THE ARRAY FOR all the searched stuff
//                                 advsearchedInputArray.push(cashFlows[a])
//                             }
//                             allCashFlows.push(cashFlows[a])

//                             //get totals for advanced sheet
//                             totalIncomePerRangeAdv = parseFloat(totalIncomePerRangeAdv) + (row.CashFlowCashEquiv)
//                             //get the payOuts
//                         }

//                     }
//                 }
//                 const startIndex = (parseInt(page) - 1) * parseInt(pageSize);
//                 const endIndex = startIndex + parseInt(pageSize);
//                 const itemsToProcess = allCashFlows.slice(startIndex, endIndex);
//                 const totalPages = Math.ceil(allCashFlows.length / pageSize);
//                 const searchedItemsToProcess = advsearchedInputArray.slice(startIndex, endIndex);
//                 const searchedTotalPages = Math.ceil(advsearchedInputArray.length / pageSize);
//                 const advIncomeTotal = totalIncomePerRangeAdv;
//                 const advExpenseTotal = totalExpensesPerRangeAdv;
//                 const advSearchedpayoutTotal = payOutSearchedInputTotal;
//                 const advSearchedpayinTotal = payInSearchedInputTotal;

//                 const data = {
//                     amDeleted: true,
//                     totalPages: totalPages,
//                     itemsToProcess: itemsToProcess, //THIS MUST ONLY CONTAINS THE INFORMATION OF WHATEVER THAT IS THE CURRENT PAGE BY THE USER
//                     totalPages: totalPages,
//                     searchedTotalPages: searchedTotalPages,
//                     searchedItemsToProcess: searchedItemsToProcess,
//                     allCashFlows: allCashFlows,
//                     advIncomeTotal: advIncomeTotal,
//                     advExpenseTotal: advExpenseTotal,
//                     advSearchedpayinTotal: advSearchedpayinTotal,
//                     advSearchedpayoutTotal: advSearchedpayoutTotal,

//                 };
//                 console.log('data')
//                 console.log(data + 'data')
//                 return { data };
//             }

//         }
//     } catch (error) {
//         console.error(error);
//         return { status: 401, amDeleted: false, deletedDocuments: [] };
//     }
// }
export async function deleteCashFLow(req, startDate, endDate, pageSize, page, advancedSearchInput, checkedRowsId, sessionId) {
    try {
        const db = await connectDB(req, databaseName, signingCriteria, sessionId);
        if (!db) {
            throw new Error('Failed to connect to the database');
        }

        // Create the model with the specific connection
        const myCashflowModel = CashflowModel(db);
        const myCurrenciesModel = CurrenciesModel(db);

        // Convert startDate and endDate to Date objects
        startDate = new Date(startDate);
        endDate = new Date(endDate);

        // Always Sort the array by 'income date' in ascending order
        let cashFlows = await myCashflowModel.find({});
        cashFlows.sort((a, b) => {
            const [dayA, monthA, yearA] = a.CashFlowDate.split('/');
            const [dayB, monthB, yearB] = b.CashFlowDate.split('/');
            return new Date(yearA, monthA - 1, dayA) - new Date(yearB, monthB - 1, dayB);
        });

        console.log('i am the delete cashflow row procedure');

        // Convert checkedRowsId to MongoDB ObjectIds
        const deleteIds = checkedRowsId.map(id => ObjectId(id));

        // Delete documents
        const deleteResult = await myCashflowModel.deleteMany({ _id: { $in: deleteIds } });
        console.log(`${deleteResult.deletedCount} document(s) were deleted`);

        if (deleteResult.deletedCount > 0) {
            // Fetch updated data after deletion
            const allDocuments = await myCashflowModel.find({});
            let allCashFlows = [];
            let advsearchedInputArray = [];
            let payOutSearchedInputTotal = 0;
            let payInSearchedInputTotal = 0;
            let totalExpensesPerRangeAdv = 0;
            let totalIncomePerRangeAdv = 0;

            // Get base currency
            const baseCurrency = await myCurrenciesModel.findOne({ BASE_CURRENCY: 'Y' });
            if (!baseCurrency) {
                throw new Error('Base currency not found');
            }

            // Process all documents
            for (let a = 0; a < allDocuments.length; a++) {
                const row = allDocuments[a];
                const date = row.CashFlowDate;
                const parts = date.split("/");
                const formattedDate = parts[1] + "/" + parts[0] + "/" + parts[2];
                const formattedDates2 = new Date(formattedDate);

                // Recalculate the cash equivalent based on the selected currency
                const relativeRate = row.CashFlowRate / baseCurrency.RATE;
                row.CashFlowCashEquiv = Number(parseFloat(row.CashFlowAmount) / parseFloat(relativeRate)).toFixed(2);

                // Convert dates to Africa/Harare timezone
                const startDateZim = moment.tz(startDate, "Africa/Harare").startOf('day').toDate();
                const endDateZim = moment.tz(endDate, "Africa/Harare").startOf('day').toDate();
                const formattedDates2Zim = moment.tz(formattedDates2, "Africa/Harare").startOf('day').toDate();

                // Check if the date is within the range
                if (startDateZim.getTime() <= formattedDates2Zim.getTime() && formattedDates2Zim.getTime() <= endDateZim.getTime()) {
                    if (row.CashFlowType === 'Payout') {
                        const match = (row.CashFlowDescription).toLowerCase().includes(advancedSearchInput);
                        if (match) {
                            payOutSearchedInputTotal += parseFloat(row.CashFlowCashEquiv);
                            advsearchedInputArray.push(row);
                        }
                        allCashFlows.push(row);
                        totalExpensesPerRangeAdv += parseFloat(row.CashFlowCashEquiv);
                    } else if (row.CashFlowType === 'Pay in') {
                        const match = (row.CashFlowDescription).toLowerCase().includes(advancedSearchInput);
                        if (match) {
                            payInSearchedInputTotal += parseFloat(row.CashFlowCashEquiv);
                            advsearchedInputArray.push(row);
                        }
                        allCashFlows.push(row);
                        totalIncomePerRangeAdv += parseFloat(row.CashFlowCashEquiv);
                    }
                }
            }

            // Paginate the results
            const startIndex = (parseInt(page) - 1) * parseInt(pageSize);
            const endIndex = startIndex + parseInt(pageSize);
            const itemsToProcess = allCashFlows.slice(startIndex, endIndex);
            const totalPages = Math.ceil(allCashFlows.length / pageSize);
            const searchedItemsToProcess = advsearchedInputArray.slice(startIndex, endIndex);
            const searchedTotalPages = Math.ceil(advsearchedInputArray.length / pageSize);

            // Prepare the response data
            const data = {
                amDeleted: true,
                totalPages: totalPages,
                itemsToProcess: itemsToProcess,
                searchedTotalPages: searchedTotalPages,
                searchedItemsToProcess: searchedItemsToProcess,
                allCashFlows: allCashFlows,
                advIncomeTotal: totalIncomePerRangeAdv,
                advExpenseTotal: totalExpensesPerRangeAdv,
                advSearchedpayinTotal: payInSearchedInputTotal,
                advSearchedpayoutTotal: payOutSearchedInputTotal,
            };

            return { data };
        } else {
            // No documents were deleted
            return { data: { amDeleted: false } };
        }
    } catch (error) {
        console.error('Error in deleteCashFLow:', error);
        return { status: 401, amDeleted: false, deletedDocuments: [] };
    }
}
//============================================================================================================

export async function insertCashFlowData(req, itemsToProcess, checkTemplateStatus, sessionId) {

    let insertedDocuments = [];
    let isSaving = false;
    function dateValidation(csvDate) {
        let formattedDate = "";
        if (csvDate.length > 10) {
            const formattedDate1 = (csvDate).split(' ')
            if (formattedDate1) {
                let currentDate = formattedDate1[0]
                //NOW SPLIT THE DATE TO BE IN THE FORM DD/MM/YYYY
                let parts1
                parts1 = (currentDate).split("/");
                if (parts1[0].length === 4) {
                    parts1[0] = parts1[0][2] + parts1[0][3]
                    csvDate = parts1[1] + "/" + parts1[0] + "/" + parts1[2];
                }
                else {
                    csvDate = parts1[1] + "/" + parts1[0] + "/" + parts1[2];
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
    try {
        const db = await connectDB(req, databaseName, signingCriteria, sessionId);
        if (!db) throw new Error("Database connection failed");

        // Initialize models
        const myCashflowModel = CashflowModel(db);
        const myCurrenciesModel = CurrenciesModel(db);
        const myCategoriesModel = CashflowCategoriesModel(db);

        // Get base currency
        const baseCurrency = await myCurrenciesModel.findOne({ BASE_CURRENCY: 'Y' });
        if (!baseCurrency) throw new Error("Base currency not found");

        // Arrays to store data for bulk insertion
        let payInRowDataArray = [];
        let payOutRowDataArray = [];
        let insertedDocuments = [];
        let insertedCategories = [];
        let isSaving = false;
        let theRate = 0
        let correctFormattedDate = ''
        //declare variables that will store the variables
        let date = '', shift = '', type = '', invoiceNo = '', description = '', currency = '', category = '', amount = 0, rate = 0, id = ''

        const findMatchingDocument = async (rowData) => {
            try {
                // Check if a document with the same CashFlowType and other fields exists
                const exists = await myCashflowModel.exists({
                    CashFlowType: rowData.CashFlowType,
                    CashFlowInvoiceRef: rowData.CashFlowInvoiceRef,
                    CashFlowDescription: rowData.CashFlowDescription,
                    CashFlowCategory: rowData.CashFlowCategory,
                    CashFlowCurrency: rowData.CashFlowCurrency,
                    CashFlowAmount: rowData.CashFlowAmount,
                    CashFlowRate: rowData.CashFlowRate,
                    CashFlowCashEquiv: rowData.CashFlowCashEquiv,
                    CashFlowDate: rowData.CashFlowDate,
                });

                if (exists) {
                    console.log("Data already exists in the database.");
                    return true;
                } else {
                    console.log("Data does not exist in the database.");
                    return false;
                }
            } catch (error) {
                console.error("Error checking if data exists:", error);
                return false;
            }
        };

        //cretae a function that will populate the arrays to send to db
        async function populateArrays(date, shift, invoiceNo, description, currency, category, amount, rate, type) {
            // const shiftNumber = "Shift" + data.Shiftnumber + " " + data.POS;
            //calculate the relative rate to be used using the rate of the base currency and the selected currency
            if (rate !== 0) {
                theRate = rate; // USE HIS RATE, WHEN HIS MATHEMATICS IS NOT BALANCING HE WILL COME BACK AT THIS
            }
            else if (rate === 0) {
                //WHEN THE USER HAS NOT SPECIFIED THE CURRENCY AND THE RATE USED
                theRate = baseCurrency.RATE;
            }
            //get the correct formatted date
            correctFormattedDate = dateValidation(date)

            // console.log(itemsToProcess)
            const relativeRate = theRate / baseCurrency.RATE;
            const cashEquivValue = Number(parseFloat(amount) / parseFloat(relativeRate)).toFixed(2);

            const rowData = {
                CashFlowDate: correctFormattedDate, //RE VALIDATE JUST TO BE SURE
                CashFlowType: type,
                CashFlowShift: shift,
                CashFlowInvoiceRef: invoiceNo,
                CashFlowDescription: description,
                CashFlowCategory: category,
                CashFlowCurrency: currency || baseCurrency.Currency_Name,
                CashFlowAmount: amount,
                CashFlowRate: theRate,
                CashFlowCashEquiv: cashEquivValue,
            }

            // Conditionally add the Tax field if checkTemplateStatus is 'loyverseHeaders'
            if (checkTemplateStatus === 'loyverseHeaders' || (checkTemplateStatus === 'slyRetailHeaders' && id === '')) {
                rowData.Tax = {
                    vat: { QRCode: "", DeviceId: 0, ZimraFsNo: '', VatNumber: 0, TinNumber: 0, VatAmount: 0, VatStatus: "N" }, ztf: { First: '', Second: '', LevyAmount: 0, ZtfStatus: "N" }
                }
            }

            // Check if the shift exists
            if (checkTemplateStatus === 'loyverseHeaders') {
                //check if the data already exist
                const matchingDoc = await findMatchingDocument(rowData);
                if (!matchingDoc) {
                    // Group items by shift and type
                    const groupedByShift = {};
                    // Initialize the group if it doesn't exist
                    if (!groupedByShift[shift]) {
                        groupedByShift[shift] = {
                            payIn: [],
                            payOut: []
                        };
                    }
                    const existingShift = await myCashflowModel.findOne({ CashFlowShift: shift, CashFlowType: type });
                    if (!existingShift) {

                        // Add the rowData to the appropriate group based on type
                        if (type === 'Pay in') {
                            groupedByShift[shift].payIn.push(rowData);
                        } else if (type === 'Payout') {
                            groupedByShift[shift].payOut.push(rowData);
                        }

                    }

                    // Flatten the grouped data into payInRowDataArray and payOutRowDataArray
                    for (const shift in groupedByShift) {
                        payInRowDataArray.push(...groupedByShift[shift].payIn);
                        payOutRowDataArray.push(...groupedByShift[shift].payOut);
                    }
                }

            }
            else {
                //TO STOP DUPLICATION OF DOCUMENTS IF THE SHIFT IS MISING,CHECK IF THE DOCUMENTS EXIST ALREADY BY CHECKING THE WHOLE DATE IF THERE IS ANY MATCH\
                //IF SO,DO NOTHING ELSE ADD THE DOCUMENT TO THE ARRAY
                const matchingDoc = await findMatchingDocument(rowData);
                if (matchingDoc) {

                } else {

                    if (type === 'Pay in') {
                        payInRowDataArray.push(rowData);
                    }
                    else if (type === 'Payout') {
                        payOutRowDataArray.push(rowData);
                    }
                }
            }
            // Check if the shift exists
            let myType = ''
            if (type === 'Pay in') {
                myType = 'PayIn'
            }
            else {
                myType = 'PayOut'
            }
            let allCategories = await myCategoriesModel.find({ Balance: myType }); // Get all categories from the database
            const match = allCategories.some(doc => {
                const categoryFromDb = doc.category.toLowerCase();  // Assuming 'category' is a field in your model
                const categoryEnteredByUser = category.toLowerCase();  // Normalize user input
                // Check if any letter from the user input exists in the category from the database
                return categoryFromDb.includes(categoryEnteredByUser);
            });
            if (!match) {
                let payInCat = {}; //THE NEW DOCUMEN
                payInCat["category"] = category;
                payInCat["CategoryLimit"] = 0;
                payInCat["CategoryLimitRange"] = "";
                payInCat["Balance"] = myType;
                // If the category doesn't exist, insert the new record
                await saveCategoryToDb(payInCat)
            }
        }

        for (let i = 0; i < itemsToProcess.length; i++) {
            const data = itemsToProcess[i];
            if (checkTemplateStatus === 'loyverseHeaders') {
                if (data.Comment === '') {
                    data.Comment = `Unknown ${data.Type}`
                }
                else {
                    data.Comment = data.Comment
                }
                date = data.Date; shift = "Shift" + data.Shiftnumber + " " + data.POS;
                type = data.Type; invoiceNo = ''; currency = ''; category = 'suspense';
                description = data.Comment;
                amount = data.Amount; rate = 0
                //call the function that populates the arrays
                await populateArrays(date, shift, invoiceNo, description, currency, category, amount, rate, type)
            }

            if (checkTemplateStatus === 'slyRetailHeaders') {
                if (data.Id === '') {
                    // id = data.Id
                    if (data.Category === '') {
                        data.Category = 'suspense'
                    }
                    else {
                        data.Category = data.Category
                    }
                    if (data.Description === '') {
                        data.Description = `Unknown ${data.Type}`
                    }
                    else {
                        data.Description = data.Description
                    }
                    date = data.Date; shift = data.ShiftNo; type = data.Type; invoiceNo = data.InvoiceRef;
                    description = data.Description; currency = data.Currency; category = data.Category;
                    amount = data.Amount; rate = data.Rate
                    await populateArrays(date, shift, invoiceNo, description, currency, category, amount, rate, type)

                }
                else if (data.Id !== '') {
                    console.log('ndamu id')
                    try {
                        let myType = ''
                        if (data.Type === 'Pay in') {
                            myType = 'PayIn'
                        }
                        else {
                            myType = 'PayOut'
                        }
                        // Check if the shift exists
                        let allCategories = await myCategoriesModel.find({ Balance: myType }); // Get all categories from the database
                        const match = allCategories.some(doc => {
                            const categoryFromDb = doc.category.toLowerCase();  // Assuming 'category' is a field in your model
                            const categoryEnteredByUser = data.Category.toLowerCase();  // Normalize user input
                            // Check if any letter from the user input exists in the category from the database
                            return categoryFromDb.includes(categoryEnteredByUser);
                        });

                        if (!match) {
                            let payOutCat = {}; //THE NEW DOCUMEN
                            payOutCat["category"] = data.Category;
                            payOutCat["CategoryLimit"] = 0;
                            payOutCat["CategoryLimitRange"] = "";
                            payOutCat["Balance"] = myType;
                            // If the category doesn't exist, insert the new record
                            await saveCategoryToDb(payOutCat)
                        }
                        const relativeRate = data.Rate / baseCurrency.RATE;
                        const cashEquivValue = Number(parseFloat(data.Amount) / parseFloat(relativeRate)).toFixed(2);
                        // Update the existing document
                        const result = await myCashflowModel.updateOne(
                            { _id: ObjectId(data.Id) }, // Filter by _id
                            {
                                $set: {
                                    CashFlowDate: data.Date,
                                    CashFlowShift: data.ShiftNo,
                                    CashFlowInvoiceRef: data.InvoiceRef,
                                    CashFlowDescription: data.Description,
                                    CashFlowCategory: data.Category,
                                    CashFlowCurrency: data.Currency,
                                    CashFlowAmount: data.Amount,
                                    CashFlowRate: data.Rate,
                                    CashFlowCashEquiv: cashEquivValue,
                                    CashFlowType: data.Type,
                                },
                            }
                        );

                        // Check if the update was successful
                        if (result.modifiedCount > 0) {
                            console.log('zvaita')
                            isSaving = 'Update successful';
                            insertedDocuments.push(result.modifiedCount); // Store the count of updated documents
                        } else {
                            isSaving = 'No documents were updated';
                        }
                    } catch (error) {
                        console.error('Error updating document:', error);
                        isSaving = 'Error updating document';
                    }
                }
            }
        }

        const operations = [];

        // Insert Pay In Data using bulkWrite
        payInRowDataArray.forEach(item => {
            operations.push({
                insertOne: {
                    document: item
                }
            });
        });

        // Insert Pay Out Data using bulkWrite
        payOutRowDataArray.forEach(item => {
            operations.push({
                insertOne: {
                    document: item
                }
            });
        });
        // Perform the bulk insert operation for both Pay In and Pay Out data
        if (operations.length > 0) {
            const result = await myCashflowModel.bulkWrite(operations);
            isSaving = true
            // If you need the actual inserted documents, you can retrieve them from the result by using their IDs
            // insertedDocuments = await myCashflowModel.find();
            // Extract the IDs of the inserted documents
            const insertedIds = Object.values(result.insertedIds);

            // Retrieve the inserted documents using their IDs
            insertedDocuments = await myCashflowModel.find({ _id: { $in: insertedIds } });

        } else {
            isSaving = false,
                insertedDocuments = [];
        }
        //then save any new categories

        async function saveCategoryToDb(categorToDb) {
            try {
                const categoryEntry = new myCategoriesModel(categorToDb);
                try {
                    const result = await categoryEntry.save();
                    if (result) {
                        isSaved = true;
                        insertedCategories.push(result); // Store the successfully inserted document
                    }
                } catch (saveError) {
                    console.error('Error saving category entry:', saveError);
                    isSaved = false;
                }
            } catch (error) {
                console.error('Error inserting documents:', error);
                return { isSaved: false };
            }
        }
        return { isSaving, insertedDocuments, insertedCategories }
    } catch (error) {
        console.error('Error inserting documents:', error);
        return { isSaving: 'Failed to upload.Try again', insertedDocuments: [] };
    }
}

//====================================================================================================================
export async function saveCashFlowData(req, itemsToProcess, sessionId) {
    try {
        const db = await connectDB(req, databaseName, signingCriteria, sessionId);
        if (db) {
            // Create the model with the specific connection
            const myCashflowModel = CashflowModel(db);
            let allDocuments = []
            insertedDocuments = []
            for (let a = 0; a < itemsToProcess.length; a++) {
                const item = itemsToProcess[a];
                const cashflowentry = new myCashflowModel(item);
                try {
                    const result = await cashflowentry.save();
                    if (result) {
                        isSaving = true;
                        allDocuments = await myCashflowModel.find();
                        insertedDocuments.push(result); // Directly push the saved document
                    }
                } catch (saveError) {
                    console.error('Error saving cash flow entry:', saveError);
                    isSaving = false;
                }
            }

            return { isSaving, insertedDocuments, allDocuments };
        }
    } catch (error) {
        console.error('Error inserting documents:', error);
        return { amUpdated: false, updatedDocuments: [] };
    }
}
//====================================================================================================================
export async function updateCashFlowData(req, itemsToProcess, sessionId) {
    try {
        const db = await connectDB(req, databaseName, signingCriteria, sessionId);
        if (db) {
            // Create the model with the specific connection
            const myCashflowModel = CashflowModel(db);

            for (let a = 0; a < itemsToProcess.length; a++) {
                const item = itemsToProcess[a];
                // Update the document in the database
                const result = await myCashflowModel.updateOne({ _id: ObjectId(item._id) }, {
                    $set: {
                        CashFlowDate: item.CashFlowDate, CashFlowShift: item.CashFlowShift, Vat: item.Vat,
                        CashFlowInvoiceRef: item.CashFlowInvoiceRef, CashFlowDescription: item.CashFlowDescription,
                        CashFlowCategory: item.CashFlowCategory, CashFlowCurrency: item.CashFlowCurrency, CashFlowAmount: item.CashFlowAmount,
                        CashFlowRate: item.CashFlowRate, CashFlowCashEquiv: item.CashFlowCashEquiv, CashFlowType: item.CashFlowType
                    }
                })
                if (result.modifiedCount > 0) {
                    amUpdated = true;
                    updatedDocuments.push(item); // Store the successfully updated document
                } else {
                    amUpdated = false;
                }
            }


            return { amUpdated, updatedDocuments };
        }
    } catch (error) {
        console.error('Error inserting documents:', error);
        return { amUpdated: false, updatedDocuments: [] };
    }
}

