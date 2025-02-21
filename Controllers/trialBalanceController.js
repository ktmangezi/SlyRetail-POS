
import { ObjectId } from 'mongodb';
import { CashflowModel } from '../Schemas/slyretailCashflowSchemas.js';
import { CurrenciesModel } from '../Schemas/slyretailCurrenciesSchemas.js';
import { WorldCurrencies } from "../public/js/worldCurrency.js";
import { connectDB } from '../Schemas/slyretailDbConfig.js';

let isocode = ''
let databaseName = ""
let signingCriteria = ""

export async function getTrialBalanceData(req, sessionId) {
    try {
        const db = await connectDB(req, databaseName, signingCriteria, sessionId);
        if (db) {
            // Create the model with the specific connection
            const myCashflowModel = CashflowModel(db);
            const myCurrenciesModel = CurrenciesModel(db);
            const cashFlows = await myCashflowModel.find(); //
            //get the isocode of the base currency
            const baseCurrency = await myCurrenciesModel.findOne({ BASE_CURRENCY: 'Y' });
            const currName = WorldCurrencies.find(curr => curr.Currency_Name === baseCurrency.Currency_Name);//find matching currency name with the one in the cashFlow table
            if (currName) {
                isocode = currName.ISO_Code
            }
            //UPDATE THE VALUES BASED ON THE CHANGE OF BASE CURRENCY
            let totalCostExpense = 0;
            let totalIncome = 0;
            let symbols = {};//this variable object will contain all the currency symbols in the expense table
            for (let i = 0; i < cashFlows.length; i++) {
                const cashFlowData = cashFlows[i]
                if (cashFlowData.CashFlowType === 'Payout') {
                    const relativeRate = parseFloat(cashFlowData.CashFlowRate / baseCurrency.RATE);
                    const calculatedCashEquiv = Number(parseFloat(cashFlowData.CashFlowAmount / relativeRate)).toFixed(2);
                    // console.log(relativeRate)
                    await myCashflowModel.updateOne({ _id: ObjectId(cashFlowData._id) }, {
                        $set: {
                            CashFlowCashEquiv: calculatedCashEquiv
                        }
                    })
                    totalCostExpense += parseFloat(cashFlowData.CashFlowCashEquiv);
                    const currName = WorldCurrencies.find(curr => curr.Currency_Name === cashFlowData.Currency_Name);//find matching currency name with the one in the cashFlow table
                    if (currName) {
                        symbols[cashFlowData._id] = currName.symbols;//get currency symbols adding the expense ID to the variable
                    }
                }
                else if (cashFlowData.CashFlowType === 'Pay in') {
                    const relativeRate = parseFloat(cashFlowData.CashFlowRate / baseCurrency.RATE);
                    const calculatedCashEquiv = Number(parseFloat(cashFlowData.CashFlowAmount / relativeRate)).toFixed(2);
                    // console.log(relativeRate)
                    await myCashflowModel.updateOne({ _id: ObjectId(cashFlowData._id) }, {
                        $set: {
                            CashFlowCashEquiv: calculatedCashEquiv
                        }
                    })
                    totalIncome += parseFloat(cashFlowData.CashFlowCashEquiv);
                    const currName = WorldCurrencies.find(curr => curr.Currency_Name === cashFlowData.Currency_Name);//find matching currency name with the one in the cashFlow table
                    if (currName) {
                        symbols[cashFlowData._id] = currName.symbols;//get currency symbols adding the expense ID to the variable
                    }
                }
            }
            const totalCostExpenses = Number(parseFloat(totalCostExpense)).toFixed(2);
            const totalCostIncome = Number(parseFloat(totalIncome)).toFixed(2);

            return { totalCostExpenses: totalCostExpenses, totalCostIncome: totalCostIncome, isocode: isocode };
        }
    } catch (err) {
        console.error('Error fetching status:', err);
    }
}