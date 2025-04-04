
import { ObjectId } from 'mongodb';
import { CashflowModel } from '../Schemas/slyretailCashflowSchemas.js';
import { CurrenciesModel } from '../Schemas/slyretailCurrenciesSchemas.js';
import { WorldCurrencies } from "../public/js/worldCurrency.js";
import { connectDB } from '../Schemas/slyretailDbConfig.js';
import { FinancialPositionModel } from '../Schemas/slyretailFinancialPositionsSchemas.js';
import moment from 'moment-timezone';

let isocode = ''
let databaseName = ""
let signingCriteria = ""



export async function getTrialBalanceData(req, sessionId) {
    try {
        const db = await connectDB(req, databaseName, signingCriteria, sessionId);
        if (!db) {
            throw new Error('Failed to connect to the database');
        }
        // await calculateYearlyClosingBalances(db)
        // Create the model with the specific connection
        const myCashflowModel = CashflowModel(db);
        const myCurrenciesModel = CurrenciesModel(db);
        const cashFlows = await myCashflowModel.find();
        console.log(cashFlows.length)
        // Get the isocode of the base currency
        const baseCurrency = await myCurrenciesModel.findOne({ BASE_CURRENCY: 'Y' });
        const currName = WorldCurrencies.find(curr => curr.Currency_Name === baseCurrency.Currency_Name); // Find matching currency name with the one in the cashFlow table
        if (currName) {
            isocode = currName.ISO_Code;
        }

        // Update the values based on the change of base currency
        let symbols = {}; // This variable object will contain all the currency symbols in the expense table
        // for (let i = 0; i < cashFlows.length; i++) {
        //     const cashFlowData = cashFlows[i];
        //     const relativeRate = parseFloat(cashFlowData.CashFlowRate / baseCurrency.RATE);
        //     const calculatedCashEquiv = Number(parseFloat(cashFlowData.CashFlowAmount / relativeRate)).toFixed(2);

        //     await myCashflowModel.updateOne({ _id: ObjectId(cashFlowData._id) }, {
        //         $set: {
        //             CashFlowCashEquiv: calculatedCashEquiv
        //         }
        //     });

        //     const currName = WorldCurrencies.find(curr => curr.Currency_Name === cashFlowData.Currency_Name); // Find matching currency name with the one in the cashFlow table
        //     if (currName) {
        //         symbols[cashFlowData._id] = currName.symbols; // Get currency symbols adding the expense ID to the variable
        //     }
        // }

        return { isocode: isocode };

    } catch (err) {
        console.error('Error fetching status:', err);
    }
}

//========================================================================
// export async function arrayForImport(req, startDate, endDate, sessionId, selectedStoreName) {
//     try {

//         const db = await connectDB(req, databaseName, signingCriteria, sessionId);
//         if (!db) {
//             throw new Error('Failed to connect to the database');
//         }
//         // Create the model with the specific connection
//         const myCashflowModel = CashflowModel(db);
//         const myFinancialPositionModel = FinancialPositionModel(db);
//         let openingBalance = ''
//         let totalPayOuts = 0;
//         let totalPayIns = 0;
//         let cashFlows = null
//         // const cashFlows = await myCashflowModel.find();
//         const now = new Date();
//         const startOfCurrentYear = new Date(now.getFullYear(), 0, 1); // Jan 1, 00:00:00 of current year
//         const yearFromString = new Date(startDate).getFullYear();
//         const yearEndString = new Date(endDate).getFullYear();
//         console.log(startDate, endDate)
//         console.log(yearFromString, yearEndString)
//         if (yearFromString === yearEndString && new Date(startDate).getTime() === startOfCurrentYear.getTime()) {
//             console.log('startDate', 'endDate');
//             console.log(startDate, endDate);
//             console.log(yearFromString, yearEndString);

//             // Get the financial position for the year
//             const financialPositions = await myFinancialPositionModel.findOne({ DATE: yearFromString });
//             openingBalance = financialPositions?.CASH || 0;

//             // Use MongoDB aggregation to filter cash flows within the date range
//             cashFlows = await myCashflowModel.aggregate([
//                 {
//                     $addFields: {
//                         formattedDate: {
//                             $dateFromString: {
//                                 dateString: {
//                                     $concat: [
//                                         { $arrayElemAt: [{ $split: ["$CashFlowDate", "/"] }, 1] },
//                                         "/",
//                                         { $arrayElemAt: [{ $split: ["$CashFlowDate", "/"] }, 0] },
//                                         "/",
//                                         { $arrayElemAt: [{ $split: ["$CashFlowDate", "/"] }, 2] }
//                                     ]
//                                 },
//                                 timezone: "Africa/Harare"
//                             }
//                         }
//                     }
//                 },
//                 {
//                     $match: {
//                         formattedDate: {
//                             $gte: new Date(startDate),
//                             $lte: new Date(endDate)
//                         }
//                     }
//                 }
//             ]);
//         } else {
//             // Get the financial position for the year
//             const financialPositions = await myFinancialPositionModel.findOne({ DATE: yearFromString });
//             openingBalance = financialPositions?.CASH || 0;

//             console.log('startDate' + startDate, 'endDate' + endDate);
//             console.log(yearFromString, yearEndString);

//             // Use MongoDB aggregation to calculate total pay-ins and pay-outs up to the start date
//             const aggregationResult = await myCashflowModel.aggregate([
//                 {
//                     $addFields: {
//                         formattedDate: {
//                             $dateFromString: {
//                                 dateString: {
//                                     $concat: [
//                                         { $arrayElemAt: [{ $split: ["$CashFlowDate", "/"] }, 1] },
//                                         "/",
//                                         { $arrayElemAt: [{ $split: ["$CashFlowDate", "/"] }, 0] },
//                                         "/",
//                                         { $arrayElemAt: [{ $split: ["$CashFlowDate", "/"] }, 2] }
//                                     ]
//                                 },
//                                 timezone: "Africa/Harare"
//                             }
//                         }
//                     }
//                 },
//                 {
//                     $match: {
//                         formattedDate: { $lte: new Date(startDate) }
//                     }
//                 },
//                 {
//                     $group: {
//                         _id: null,
//                         totalPayIns: {
//                             $sum: {
//                                 $cond: [{ $eq: ["$CashFlowType", "Pay in"] }, { $toDouble: "$CashFlowAmount" }, 0]
//                             }
//                         },
//                         totalPayOuts: {
//                             $sum: {
//                                 $cond: [{ $eq: ["$CashFlowType", "Payout"] }, { $toDouble: "$CashFlowAmount" }, 0]
//                             }
//                         }
//                     }
//                 }
//             ]);

//             if (aggregationResult.length > 0) {
//                 const { totalPayIns: payIns, totalPayOuts: payOuts } = aggregationResult[0];
//                 totalPayIns = payIns;
//                 totalPayOuts = payOuts;
//                 openingBalance += totalPayIns - totalPayOuts;
//             }

//             // Use MongoDB aggregation to filter cash flows within the date range
//             cashFlows = await myCashflowModel.aggregate([
//                 {
//                     $addFields: {
//                         formattedDate: {
//                             $dateFromString: {
//                                 dateString: {
//                                     $concat: [
//                                         { $arrayElemAt: [{ $split: ["$CashFlowDate", "/"] }, 1] },
//                                         "/",
//                                         { $arrayElemAt: [{ $split: ["$CashFlowDate", "/"] }, 0] },
//                                         "/",
//                                         { $arrayElemAt: [{ $split: ["$CashFlowDate", "/"] }, 2] }
//                                     ]
//                                 },
//                                 timezone: "Africa/Harare"
//                             }
//                         }
//                     }
//                 },
//                 {
//                     $match: {
//                         formattedDate: {
//                             $gte: new Date(startDate),
//                             $lte: new Date(endDate)
//                         }
//                     }
//                 },
//                 {
//                     $group: {
//                         _id: null,
//                         cashFlows: { $push: "$$ROOT" },
//                         totalPayIns: {
//                             $sum: {
//                                 $cond: [{ $eq: ["$CashFlowType", "Pay in"] }, { $toDouble: "$CashFlowAmount" }, 0]
//                             }
//                         },
//                         totalPayOuts: {
//                             $sum: {
//                                 $cond: [{ $eq: ["$CashFlowType", "Payout"] }, { $toDouble: "$CashFlowAmount" }, 0]
//                             }
//                         }
//                     }
//                 }
//             ]);

//             if (cashFlows.length > 0) {
//                 const { cashFlows: filteredCashFlows, totalPayIns: payIns, totalPayOuts: payOuts } = cashFlows[0];
//                 cashFlows = filteredCashFlows;
//                 totalPayIns += payIns;
//                 totalPayOuts += payOuts;
//             }
//         }
//         const data = {
//             openingBalance: openingBalance,
//             cashFlows: cashFlows,
//             totalPayIns: totalPayIns,
//             totalPayOuts: totalPayOuts
//         }
//         // console.log(data)

//         return { data };

//     }
//     catch (err) {
//         console.error('Error connecting to MongoDB:', err);
//     }
// }

export async function arrayForImport(req, startDate, endDate, sessionId) {
    try {
        const db = await connectDB(req, databaseName, signingCriteria, sessionId);
        if (!db) throw new Error('Failed to connect to the database');

        const myCashflowModel = CashflowModel(db);
        const myFinancialPositionModel = FinancialPositionModel(db);

        const yearFrom = new Date(startDate).getFullYear();
        const isFullYear = new Date(startDate).getTime() === new Date(yearFrom, 0, 1).getTime() &&
            new Date(endDate).getTime() === new Date(yearFrom, 11, 31).getTime();

        // Get opening balance from financial position
        const financialPositions = await myFinancialPositionModel.findOne({ DATE: yearFrom });
        let openingBalance = financialPositions?.CASH || 0;

        let totalPayIns = 0;
        let totalPayOuts = 0;
        let cashFlows = [];

        if (!isFullYear) {
            // Common aggregation pipeline for date conversion
            const dateConversionPipeline = [
                {
                    $addFields: {
                        formattedDate: {
                            $dateFromString: {
                                dateString: {
                                    $concat: [
                                        { $arrayElemAt: [{ $split: ["$CashFlowDate", "/"] }, 1] },
                                        "/",
                                        { $arrayElemAt: [{ $split: ["$CashFlowDate", "/"] }, 0] },
                                        "/",
                                        { $arrayElemAt: [{ $split: ["$CashFlowDate", "/"] }, 2] }
                                    ]
                                },
                                timezone: "Africa/Harare"
                            }
                        }
                    }
                }
            ];

            // Calculate totals from 1 Jan to the day before the start date
            const prePeriodResult = await myCashflowModel.aggregate([
                ...dateConversionPipeline,
                { $match: { formattedDate: { $gte: new Date(yearFrom, 0, 1), $lt: new Date(startDate) } } },
                {
                    $group: {
                        _id: null,
                        totalPayIns: { $sum: { $cond: [{ $eq: ["$CashFlowType", "Pay in"] }, { $toDouble: "$CashFlowAmount" }, 0] } },
                        totalPayOuts: { $sum: { $cond: [{ $eq: ["$CashFlowType", "Payout"] }, { $toDouble: "$CashFlowAmount" }, 0] } }
                    }
                }
            ]);

            if (prePeriodResult.length > 0) {
                totalPayIns = prePeriodResult[0].totalPayIns;
                totalPayOuts = prePeriodResult[0].totalPayOuts;
                openingBalance += totalPayIns - totalPayOuts;
            }

            // Get cash flows and totals for the selected date range
            const periodResult = await myCashflowModel.aggregate([
                ...dateConversionPipeline,
                { $match: { formattedDate: { $gte: new Date(startDate), $lte: new Date(endDate) } } },
                {
                    $group: {
                        _id: null,
                        cashFlows: { $push: "$$ROOT" },
                        totalPayIns: { $sum: { $cond: [{ $eq: ["$CashFlowType", "Pay in"] }, { $toDouble: "$CashFlowAmount" }, 0] } },
                        totalPayOuts: { $sum: { $cond: [{ $eq: ["$CashFlowType", "Payout"] }, { $toDouble: "$CashFlowAmount" }, 0] } }
                    }
                }
            ]);

            if (periodResult.length > 0) {
                cashFlows = periodResult[0].cashFlows;
                totalPayIns += periodResult[0].totalPayIns;
                totalPayOuts += periodResult[0].totalPayOuts;
            }
        }

        return {
            data: {
                openingBalance,
                cashFlows,
                totalPayIns,
                totalPayOuts
            }
        };
    } catch (err) {
        console.error('Error connecting to MongoDB:', err);
    }
}
