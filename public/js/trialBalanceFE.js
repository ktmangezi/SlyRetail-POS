
import { WorldCurrencies } from "./worldCurrency.js";

let newCurrencies = []
let cashFlowArray = []
let newIncomeCategories = []
let newExpenseCategories = []
let categoryArray = []
let accountingPeriodDetails = []

//load the loaser
// document.querySelector('.toolbar').classList.add('toolbarPosition')
fetch('/currencies')
    .then(response => response.json())
    .then(currencies => {
        currencies.forEach((currency) => {
            newCurrencies.push(currency);
        });
        fetch('/getCategories')
            .then(response => response.json())
            .then(allCashFlowCategories => {
                for (let k = 0; k < allCashFlowCategories.length; k++) {
                    const element = allCashFlowCategories[k];
                    if (element.Balance === 'PayIn') {
                        newIncomeCategories.push(element)
                    }
                    else if (element.Balance === 'PayOut') {
                        newExpenseCategories.push(element)
                    }
                }
                fetch('/details')
                    .then(response => response.json())
                    .then(details => {
                        document.querySelector('.toolbar').style.display = 'block'
                        document.querySelector('.icon-nav').style.display = 'block'

                        document.querySelector('.toolbar').classList.remove('toolbarPosition')
                        details.forEach((detail) => {
                            accountingPeriodDetails.push(detail);
                        });
                        //CREATE THE CATEGORIES ARRAY THAT HAS BOTH PAYINS AND PAYOUTS CATEGORIES
                        newIncomeCategories.forEach(payIn => {
                            categoryArray.push(payIn)
                        });
                        newExpenseCategories.forEach(payOut => {
                            categoryArray.push(payOut)
                        });
                        console.log(categoryArray)
                        const submitCategory = document.querySelector('.submitCategory')
                        //GET THE SESSION ID FROM THE LOCALSTORAGE
                        const sessionId = localStorage.getItem('sessionId')
                        let selectedStoreName = localStorage.getItem('storeName');
                        //=======================================================================================
                        //GET THE ISOCODE OF THE BASE CURRENCY
                        const baseCurrName = Array.from(newCurrencies).find(curr => curr.BASE_CURRENCY === "Y");//find matching currency name with the one in the incomes table

                        //find the base currency code 
                        const baseCurrencyCode = Array.from(WorldCurrencies).find(curr => curr.Currency_Name === baseCurrName.Currency_Name);//find matching currency name with the one in the incomes table
                        let isoCode = ''
                        if (baseCurrencyCode) {
                            isoCode = baseCurrencyCode.ISO_Code;
                        }
                        //=======================================================================================
                        function dateValidation(datepIckerDate) {
                            let formattedDate = ''
                            datepIckerDate = datepIckerDate.replace(/[.,-]/g, '/');
                            const parts = datepIckerDate.split("/");
                            if (parts.length === 3) {
                                const day = parseInt(parts[0]);
                                const month = parseInt(parts[1]);
                                //  const year = parseInt(parts[2]);
                                let year = 0
                                //check if the length of the part year is ===4 
                                //if ===2 add the 20 pekutanga
                                if (parts[2].length === 4) {
                                    year = parseInt(parts[2]);
                                }
                                else if (parts[2].length === 2) {
                                    year = '20' + parseInt(parts[2])
                                }
                                if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1900 && year <= 2099) {
                                    // Date is valid, construct the formatted date string in "dd/mm/yyyy" format
                                    //.padStart(2, "0") ensures that the resulting string has a minimum length of 2 characters by padding the left side with zeros ("0") if necessary.
                                    formattedDate = `${day.toString().padStart(2, "0")}/${month.toString().padStart(2, "0")}/${year.toString()}`;

                                } else {
                                    console.log("Invalid date.");
                                }
                            } else {
                                console.log("Invalid date format.");
                            }
                            return formattedDate
                        }
                        //==========================================================================================
                        //OPENING BALANCE CALCULATIONS FUNCTION
                        let startDate = ''
                        let endDate = ''
                        //check if the accounting period has been set
                        const myAccStartDate = localStorage.getItem('firstDateOfAccountingPeriod');//DATE STORED IN LOCAL STORAGE FROM OTHER JS FILES
                        const myStartDate = localStorage.getItem('firstDate');//DATE STORED IN LOCAL STORAGE FROM OTHER JS FILES
                        const myEndDate = localStorage.getItem('lastDate');
                        // alert(myStartDate)
                        // alert(myEndDate)

                        if ((myAccStartDate === null && myEndDate !== null)) {
                            // alert('yeet2')
                            // Accessing startdate from db
                            accountingPeriodDetails.forEach(detail => {
                                startDate = detail.startDate
                            });
                            const parts = startDate.split("-");
                            const formattedDate = parts[2] + "/" + parts[1] + "/" + new Date(myStartDate).getFullYear();
                            const formattedStartDates = new Date(formattedDate);
                            startDate = moment.tz(formattedStartDates, "Africa/Harare").startOf('day').toDate(); // Use moment timezone
                            endDate = moment.tz(new Date(myEndDate), "Africa/Harare").endOf('day').toDate(); // Use moment timezone
                            getCashflows(startDate, endDate, sessionId, selectedStoreName)
                            // trialBalance(startDate, endDate)
                        }
                        else if ((myAccStartDate !== null && myEndDate !== null)) {
                            // alert('yeet1')
                            const parts = myAccStartDate.split("-");
                            const formattedDate = parts[2] + "/" + parts[1] + "/" + new Date(myStartDate).getFullYear();
                            const formattedStartDates = new Date(formattedDate);
                            startDate = moment.tz(formattedStartDates, "Africa/Harare").startOf('day').toDate(); // Use moment timezone
                            endDate = moment.tz(new Date(myEndDate), "Africa/Harare").endOf('day').toDate(); // Use moment timezone
                            getCashflows(startDate, endDate, sessionId, selectedStoreName)
                        }
                        // alert(startDate)
                        // alert(endDate)

                        //========================================================================================================
                        async function getCashflows(startDate, endDate, sessionId, selectedStoreName) {
                            try {
                                document.querySelector('.loader-container').style.display = 'flex'
                                document.querySelector('.BigContainer').style.display = 'none'
                                const response = await fetch('/cashFlowArray', {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json'
                                    },
                                    body: JSON.stringify({
                                        startDate: startDate,
                                        endDate: endDate,
                                        sessionId: sessionId,
                                        selectedStoreName: selectedStoreName,
                                    })
                                });

                                const data = await response.json();
                                console.log(data)
                                const openingBalance = data.openingBalance
                                cashFlowArray = data.cashFlows
                                trialBalance(startDate, endDate, openingBalance)
                                document.querySelector('.loader-container').style.display = 'none'
                                document.querySelector('.BigContainer').style.display = 'block'

                            } catch (error) {
                                console.error('Error fetching data:', error);
                            }
                        }
                        // getCashflows(startDate, endDate, sessionId, selectedStoreName)
                        //======================================================================================================
                        //GENERATE THE TRIAL BALANCE ONCE THE BUTTON IS CLICKED
                        // Update the date range display
                        const trialBalanceSpan = document.querySelector('.dateRange');
                        trialBalanceSpan.innerText = moment(endDate).format('DD/MM/YYYY');

                        trialBalanceSpan.addEventListener('keydown', (event) => {
                            // Add click and keydown event listeners in one line
                            if (event.key === "Enter" || event.key === 'Tab') {//WHEN ENTER IS CLICKED
                                event.preventDefault();
                                //VALIDATE THE DATES ENTERED
                                let newEndDate = dateValidation(trialBalanceSpan.innerText);
                                if (newEndDate !== '') {
                                    //then correct the text  clicked with the one inputted
                                    trialBalanceSpan.innerText = newEndDate
                                    //CHANGE THE STRUCTURE TO MM/DD/YYYY
                                    const parts = newEndDate.split("/");
                                    const formattedDate =
                                        parts[1] + "/" + parts[0] + "/" + parts[2];
                                    newEndDate = new Date(formattedDate);
                                    //now store the correct date in local storage so that it can be used in other js
                                    localStorage.setItem('lastDate', newEndDate)
                                    //first clear the tbody ,loop in the table and remove rows
                                    const trialBalnceRows = document.querySelectorAll('.tBalanceTableRows');
                                    for (let i = 0; i < trialBalnceRows.length; i++) {
                                        const tb = trialBalnceRows[i];
                                        tb.style.display = 'none'
                                    }
                                    const myEndDate = localStorage.getItem('lastDate');
                                    //i want the start date to be the start of the accounting period
                                    endDate = new Date(myEndDate);
                                    const startOfYear = new Date(endDate.getFullYear(), 0, 1); // January 1st of the year of endDate
                                    localStorage.setItem('firstDate', startOfYear)
                                    console.log(startOfYear)
                                    startDate = moment.tz(startOfYear, "Africa/Harare").startOf('day'); // Midnight in Zimbabwe
                                    endDate = moment.tz(endDate, "Africa/Harare").endOf('day'); // end of day  in Zimbabwe
                                    const formattedDates3 = moment.tz(trialBalanceSpan.innerText, "DD/MM/YYYY", "Africa/Harare").toDate();
                                    // Update the Date Range Picker with the date entered in table
                                    // $('#dateRange').data('daterangepicker').setStartDate(formattedDates3);
                                    if ($('.dateRange').data('daterangepicker')) {
                                        $('.dateRange').data('daterangepicker').setStartDate(startOfYear);
                                        $('.dateRange').data('daterangepicker').setEndDate(formattedDates3);
                                    } else {
                                        console.error("Date Range Picker is not initialized on #dateRange.");
                                    }
                                    //remove focus on the text
                                    trialBalanceSpan.blur()
                                    document.querySelector('.daterangepicker').style.display = 'none';
                                    // Ensure the date range picker is hidden after the date is updated
                                    console.log("Date range picker hidden successfully.");
                                    getCashflows(startDate, endDate, sessionId, selectedStoreName)

                                }
                            }
                        })

                        // TRIAL BALANCE OPERATIONS
                        // function trialBalance(startDate, endDate, openingBalance) {
                        //     console.log(startDate, endDate, openingBalance)

                        //     const momntStartDate1 = moment.tz(startDate, "Africa/Harare").startOf('day'); // Midnight in Zimbabwe
                        //     const momntEndDate1 = moment.tz(endDate, "Africa/Harare").endOf('day'); // end of day  in Zimbabwe

                        //     // Convert back to JavaScript Date objects (optional, only if needed)
                        //     startDate = momntStartDate1.toDate();
                        //     endDate = momntEndDate1.toDate();

                        //     //loop in the array of categories
                        //     let totalPayInCatAmnt = 0
                        //     let totalPayOutCatAmnt = 0
                        //     // Create a new row in the table
                        //     const tbody = document.querySelector('.trialBalanceTableBody');
                        //     let myRow = ''
                        //     myRow = document.createElement('tr');
                        //     myRow.classList.add('tBalanceTableRows')
                        //     const hiddenCel = document.createElement('td');
                        //     hiddenCel.hidden = true;
                        //     // hiddenCel.innerHTML = myId
                        //     hiddenCel.classList.add('categoryId');
                        //     myRow.appendChild(hiddenCel);
                        //     //add other rows ..the payins category and payouts under their respective headings
                        //     const nameCel = document.createElement('td');
                        //     nameCel.classList.add('categoryName')
                        //     nameCel.textContent = 'OPENING CASH BALANCE'; // Replace with desired content
                        //     myRow.appendChild(nameCel);
                        //     const payOutAmountCel = document.createElement('td');
                        //     payOutAmountCel.classList.add('payOutAmount')
                        //     payOutAmountCel.style.textAlign = 'center'

                        //     const payInAmountCel = document.createElement('td');
                        //     payInAmountCel.classList.add('payInAmount')
                        //     payInAmountCel.style.textAlign = 'center'
                        //     payInAmountCel.textContent = Number(openingBalance).toFixed(2);
                        //     myRow.appendChild(payOutAmountCel);
                        //     myRow.appendChild(payInAmountCel);
                        //     tbody.appendChild(myRow);
                        //     //now loop in the array displaying the categories
                        //     for (let i = 0; i < categoryArray.length; i++) {
                        //         const each = categoryArray[i];
                        //         // Create a new row
                        //         myRow = document.createElement('tr');
                        //         myRow.classList.add('tBalanceTableRows')
                        //         // Create cells and set their content
                        //         //ID TD
                        //         const hiddenCell = document.createElement('td');
                        //         hiddenCell.hidden = true;
                        //         // hiddenCell.innerHTML = myId
                        //         hiddenCell.classList.add('categoryId');
                        //         myRow.appendChild(hiddenCell);
                        //         //add other rows ..the payins category and payouts under their respective headings
                        //         const nameCell = document.createElement('td');
                        //         nameCell.classList.add('categoryName')
                        //         let newCategory = (each.category).replace(/_/g, " ");
                        //         newCategory = (newCategory).split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
                        //         nameCell.textContent = newCategory; // Replace with desired content
                        //         nameCell.style.cursor = 'pointer'

                        //         const payOutAmountCell = document.createElement('td');
                        //         payOutAmountCell.classList.add('payOutAmount')
                        //         payOutAmountCell.style.textAlign = 'center'

                        //         const payInAmountCell = document.createElement('td');
                        //         payInAmountCell.classList.add('payInAmount')
                        //         payInAmountCell.style.textAlign = 'center'


                        //         if (each.Balance === 'PayIn') {
                        //             let totalPayInCatAmnt1 = 0
                        //             for (let b = 0; b < cashFlowArray.length; b++) {
                        //                 const row = cashFlowArray[b];
                        //                 if (row.CashFlowType === 'Pay in') {
                        //                     const date = row.CashFlowDate
                        //                     const parts = date.split("/");
                        //                     const formattedDate = parts[1] + "/" + parts[0] + "/" + parts[2];
                        //                     const formattedDates2 = new Date(formattedDate);
                        //                     const formattedDates2Zim = moment.tz(formattedDates2, "Africa/Harare").startOf('day').toDate();
                        //                     console.log("payin" + formattedDates2Zim)
                        //                     if ((each.category).toLowerCase() === row.CashFlowCategory) {
                        //                         if (startDate.getTime() <= formattedDates2Zim.getTime() && formattedDates2Zim.getTime() <= endDate.getTime()) {//CODE FOR 
                        //                             //TIRIMO CHECK THE TOTALS OF THE AVAILABLE CATEGORIES
                        //                             totalPayInCatAmnt1 = parseFloat(totalPayInCatAmnt1) + parseFloat(row.CashFlowCashEquiv);
                        //                             totalPayInCatAmnt = parseFloat(totalPayInCatAmnt) + parseFloat(row.CashFlowCashEquiv);
                        //                             payInAmountCell.textContent = Number(totalPayInCatAmnt1).toFixed(2)
                        //                             isMatched = true
                        //                             myRow.appendChild(nameCell);
                        //                             myRow.appendChild(payOutAmountCell);
                        //                             myRow.appendChild(payInAmountCell);
                        //                         }
                        //                     }
                        //                 }
                        //             }
                        //         }
                        //         else if (each.Balance === 'PayOut') {
                        //             let totalPayOutCatAmnt1 = 0
                        //             for (let b = 0; b < cashFlowArray.length; b++) {
                        //                 const row = cashFlowArray[b];
                        //                 if (row.CashFlowType === 'Payout') {
                        //                     const date = row.CashFlowDate
                        //                     const parts = date.split("/");
                        //                     const formattedDate = parts[1] + "/" + parts[0] + "/" + parts[2];
                        //                     const formattedDates2 = new Date(formattedDate);
                        //                     const formattedDates2Zim = moment.tz(formattedDates2, "Africa/Harare").startOf('day').toDate();
                        //                     console.log("payout" + formattedDates2Zim)
                        //                     console.log("payout" + each.category)
                        //                     if ((each.category).toLowerCase() === row.CashFlowCategory) {
                        //                         if (startDate.getTime() <= formattedDates2Zim.getTime() && formattedDates2Zim.getTime() <= endDate.getTime()) {//CODE FOR 
                        //                             //TIRIMO CHECK THE TOTALS OF THE AVAILABLE CATEGORIES
                        //                             totalPayOutCatAmnt = parseFloat(totalPayOutCatAmnt) + parseFloat(row.CashFlowCashEquiv);
                        //                             totalPayOutCatAmnt1 = parseFloat(totalPayOutCatAmnt1) + parseFloat(row.CashFlowCashEquiv);
                        //                             payOutAmountCell.textContent = Number(totalPayOutCatAmnt1).toFixed(2)
                        //                             isMatched = true
                        //                             myRow.appendChild(nameCell);
                        //                             myRow.appendChild(payOutAmountCell);
                        //                             myRow.appendChild(payInAmountCell);
                        //                         }
                        //                     }
                        //                 }
                        //             }
                        //         }
                        //         // Append the row to the table body
                        //         tbody.appendChild(myRow);

                        //     }

                        //     //append the last row with totals outside the loop of cash balance and total
                        //     const cashBalance = (parseFloat(openingBalance)) + (parseFloat(totalPayInCatAmnt)) - parseFloat(totalPayOutCatAmnt)
                        //     // Create a new row
                        //     const row1 = document.createElement('tr');
                        //     row1.classList.add('tBalanceTableRows')
                        //     const hiddenCell1 = document.createElement('td');
                        //     hiddenCell1.hidden = true;
                        //     // hiddenCell.innerHTML = myId
                        //     hiddenCell1.classList.add('categoryId');
                        //     row1.appendChild(hiddenCell1);
                        //     //add other rows ..the payins category and payouts under their respective headings
                        //     const nameCell1 = document.createElement('td');
                        //     nameCell1.classList.add('categoryName')
                        //     nameCell1.textContent = 'CLOSING CASH BALANCE'; // Replace with desired content
                        //     row1.appendChild(nameCell1);
                        //     const payOutAmountCell1 = document.createElement('td');
                        //     payOutAmountCell1.style.textAlign = 'center'
                        //     if (cashBalance >= 0) {
                        //         payOutAmountCell1.textContent = Number(cashBalance).toFixed(2);
                        //         totalPayOutCatAmnt = parseFloat(totalPayOutCatAmnt) + parseFloat(cashBalance)
                        //     }

                        //     else if (cashBalance < 0) {
                        //         payOutAmountCell1.textContent = Number(cashBalance).toFixed(2);
                        //         totalPayOutCatAmnt = parseFloat(totalPayOutCatAmnt) + parseFloat(cashBalance)
                        //     }
                        //     const payInAmountCell1 = document.createElement('td');
                        //     payInAmountCell1.style.textAlign = 'center'

                        //     row1.appendChild(payOutAmountCell1);
                        //     row1.appendChild(payInAmountCell1);
                        //     tbody.appendChild(row1);

                        //     // Create a new row
                        //     const roww = document.createElement('tr');
                        //     roww.classList.add('tBalanceTableRows')
                        //     const hiddenCell = document.createElement('td');
                        //     hiddenCell.hidden = true;
                        //     // hiddenCell.innerHTML = myId
                        //     hiddenCell.classList.add('categoryId');
                        //     roww.appendChild(hiddenCell);
                        //     //add other rows ..the payins category and payouts under their respective headings
                        //     const nameCell = document.createElement('td');
                        //     nameCell.classList.add('categoryName')
                        //     nameCell.textContent = 'TOTAL'; // Replace with desired content
                        //     nameCell.style.fontWeight = 'bold'
                        //     roww.appendChild(nameCell);
                        //     const payOutAmountCell = document.createElement('td');
                        //     payOutAmountCell.classList.add('payOutAmount')
                        //     payOutAmountCell.style.textAlign = 'center'
                        //     payOutAmountCell.style.fontWeight = 'bold'
                        //     payOutAmountCell.style.borderTop = '1px solid black'
                        //     payOutAmountCell.style.borderBottom = 'double black'
                        //     // payOutAmountCell.style.borderBottomColor = 'black'
                        //     payOutAmountCell.textContent = Number(totalPayOutCatAmnt).toFixed(2);

                        //     const payInAmountCell = document.createElement('td');
                        //     payInAmountCell.classList.add('payInAmount')
                        //     payInAmountCell.style.textAlign = 'center'
                        //     payInAmountCell.style.fontWeight = 'bold'
                        //     payInAmountCell.style.borderTop = '1px solid black'
                        //     // payInAmountCell.style.borderBottomStyle = ' double'
                        //     payInAmountCell.style.borderBottom = 'double black'
                        //     totalPayInCatAmnt = parseFloat(totalPayInCatAmnt) + parseFloat(openingBalance)
                        //     payInAmountCell.textContent = Number(totalPayInCatAmnt).toFixed(2);
                        //     roww.appendChild(payOutAmountCell);
                        //     roww.appendChild(payInAmountCell);
                        //     tbody.appendChild(roww);

                        // }
                        async function trialBalance(startDate, endDate, openingBalance) {
                            // 1. Date Handling - More robust parsing and validation
                            const parseAndValidateDate = (dateString) => {
                                if (!dateString) throw new Error('Invalid date input');

                                const momntDate = moment.tz(dateString, "Africa/Harare");
                                if (!momntDate.isValid()) throw new Error('Invalid date format');

                                return momntDate;
                            };

                            try {
                                // Process dates
                                const momntStartDate = parseAndValidateDate(startDate).startOf('day');
                                const momntEndDate = parseAndValidateDate(endDate).endOf('day');

                                // Convert to Date objects if needed
                                const startDateObj = momntStartDate.toDate();
                                const endDateObj = momntEndDate.toDate();

                                // 2. Initialize totals
                                let totalPayIn = 0;
                                let totalPayOut = 0;
                                const tbody = document.querySelector('.trialBalanceTableBody');

                                // Clear existing rows
                                tbody.innerHTML = '';

                                // 3. Helper function to create table cells
                                const createCell = (content, className = '', styles = {}) => {
                                    const cell = document.createElement('td');
                                    if (className) cell.classList.add(className);
                                    cell.textContent = content;
                                    Object.assign(cell.style, styles);
                                    return cell;
                                };

                                // 4. Add opening balance row
                                const addRow = (cells) => {
                                    const row = document.createElement('tr');
                                    row.classList.add('tBalanceTableRows');
                                    cells.forEach(cell => row.appendChild(cell));
                                    tbody.appendChild(row);
                                    return row;
                                };

                                // Opening balance row
                                addRow([
                                    createCell('', 'categoryId', { display: 'none' }),
                                    createCell('OPENING CASH BALANCE', 'categoryName'),
                                    createCell('', 'payOutAmount', { textAlign: 'center' }),
                                    createCell(parseFloat(Number(openingBalance)).toFixed(2), 'payInAmount', { textAlign: 'center' })
                                ]);

                                // 5. Process categories
                                const processCategory = (category) => {
                                    const isPayIn = category.Balance === 'PayIn';
                                    let categoryTotal = 0;

                                    const matchingTransactions = cashFlowArray.filter(transaction => {
                                        // Date handling
                                        const [day, month, year] = transaction.CashFlowDate.split('/');
                                        const transactionDate = moment.tz(`${year}-${month}-${day}`, "Africa/Harare");

                                        // Check if transaction matches category and date range
                                        return transaction.CashFlowType === (isPayIn ? 'Pay in' : 'Payout') &&
                                            transaction.CashFlowCategory.toLowerCase() === category.category.toLowerCase() &&
                                            transactionDate.isBetween(momntStartDate, momntEndDate, null, '[]');
                                    });

                                    // Calculate category total
                                    categoryTotal = matchingTransactions.reduce(
                                        (sum, transaction) => sum + parseFloat(transaction.CashFlowCashEquiv), 0
                                    );
                                    // SKIP CATEGORIES WITH ZERO BALANCE
                                    if (categoryTotal === 0) return;
                                    // Update grand totals
                                    if (isPayIn) {
                                        totalPayIn += categoryTotal;
                                    } else {
                                        totalPayOut += categoryTotal;
                                    }

                                    // Create category row
                                    const formattedCategory = category.category.replace(/_/g, " ").split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

                                    addRow([
                                        createCell('', 'categoryId', { display: 'none' }),
                                        createCell(formattedCategory, 'categoryName', { cursor: 'pointer' }),
                                        createCell(
                                            isPayIn ? '' : Number(categoryTotal).toFixed(2),
                                            'payOutAmount',
                                            { textAlign: 'center' }
                                        ),
                                        createCell(
                                            isPayIn ? Number(categoryTotal).toFixed(2) : '',
                                            'payInAmount',
                                            { textAlign: 'center' }
                                        )
                                    ]);
                                };

                                // Process all categories
                                categoryArray.forEach(processCategory);

                                // 6. Add closing balance and totals
                                const cashBalance = parseFloat(openingBalance) + totalPayIn - totalPayOut;
                                console.log(cashBalance);

                                // Closing balance row
                                addRow([
                                    createCell('', 'categoryId', { display: 'none' }),
                                    createCell('CLOSING CASH BALANCE', 'categoryName'),
                                    createCell(
                                        parseFloat(Number(cashBalance)).toFixed(2), // Always display the cash balance in the payOutAmount column
                                        'payOutAmount',
                                        { textAlign: 'center' }
                                    ),
                                    createCell('', 'payInAmount', { textAlign: 'center' }) // Leave the payInAmount column empty
                                ]);

                                // Totals row
                                const totalStyles = {
                                    fontWeight: 'bold',
                                    borderTop: '1px solid black',
                                    borderBottom: '3px double black',
                                    textAlign: 'center'
                                };

                                addRow([
                                    createCell('', 'categoryId', { display: 'none' }),
                                    createCell('TOTAL', 'categoryName', { fontWeight: 'bold' }),
                                    createCell(
                                        Number(totalPayOut + cashBalance).toFixed(2),
                                        'payOutAmount',
                                        totalStyles
                                    ),
                                    createCell(
                                        Number(totalPayIn + parseFloat(openingBalance)).toFixed(2),
                                        'payInAmount',
                                        totalStyles
                                    )
                                ]);

                            } catch (error) {
                                console.error('Error in trial balance calculation:', error);
                                // Add error handling UI feedback if needed
                                throw error;
                            }
                        }
                        //==============================================================================================
                        //DATE RANGE PICKER FUNCTION

                        $(function () {
                            //TAP INTO THE DATERANGE

                            $(".dateRange").daterangepicker(
                                //THIS IS APPLYING RANGES SELECTED BY THE USER PICKING UP STARTDATES AND ENDDATES
                                {
                                    opens: "right",
                                    showDropdowns: true,
                                    linkedCalendars: false,
                                    alwaysShowCalendars: true,
                                    startDate: startDate,
                                    endDate: endDate,
                                    locale: {
                                        format: "DD/MM/YYYY",
                                    },
                                    minYear: "2000",
                                    maxYear: new Date().getFullYear(),
                                },
                                //THIS IS A FUNCTION TO APPLY THE RANGES SELECTED BY THE USER, CHANGING THE DEFAULT START DATES AND END DATES SETTING THEM TO THE L/S
                                function (startDate, endDate) {
                                    // remove the stored date range from local storage
                                    localStorage.removeItem("firstDate");
                                    localStorage.removeItem("lastDate");
                                    startDate = new Date(startDate)
                                    endDate = new Date(endDate)
                                    // Store the start and end date values in localStorage
                                    localStorage.setItem("firstDate", startDate);
                                    localStorage.setItem("lastDate", endDate);
                                    let theEndDate = moment(endDate);//convert to the format dd/mm/yy using moment
                                    theEndDate = theEndDate.format('DD/MM/YYYY');
                                    //update the innertext of the period ending
                                    const trialbalanceSpan2 = document.querySelector('.dateRange')
                                    trialbalanceSpan2.innerText = theEndDate
                                    //first clear the tbody ,loop in the table and remove rows
                                    const trialBalnceRows = document.querySelectorAll('.tBalanceTableRows');
                                    for (let i = 0; i < trialBalnceRows.length; i++) {
                                        const tb = trialBalnceRows[i];
                                        tb.style.display = 'none'
                                    }
                                    //call the function that displays the trial balance
                                    startDate = moment.tz(startDate, "Africa/Harare").startOf('day').toDate(); // Use moment timezone
                                    endDate = moment.tz(endDate, "Africa/Harare").endOf('day').toDate(); // Use moment timezone
                                    getCashflows(startDate, endDate, sessionId, selectedStoreName)
                                }
                            );

                            $(".drp-calendar.right").hide();
                            $(".drp-calendar.left").addClass("single");

                            $(".calendar-table").on(
                                "DOMSubtreeModified",
                                function () {
                                    var el = $(".prev.available")
                                        .parent()
                                        .children()
                                        .last();
                                    if (el.hasClass("next available")) {
                                        return;
                                    }
                                    el.addClass("next available");
                                    el.append("<span></span>");
                                }
                            );
                        });
                        //===============================================================================================

                        //=======================================================================================
                        //EXPORT OPERATIONS
                        const expBtn = document.querySelector('.export');
                        expBtn.addEventListener('click', function (event) {
                            exporting(startDate, endDate)
                        })
                        function downloadCSV(csvContent, filename, shopName) {
                            let csvFile;
                            let downloadLink;

                            //define the file type to text/csv  
                            csvFile = new Blob([csvContent], { type: 'text/csv' });
                            downloadLink = document.createElement("a");
                            downloadLink.download = filename;
                            downloadLink.href = window.URL.createObjectURL(csvFile);
                            downloadLink.style.display = "none";

                            document.body.appendChild(downloadLink);
                            downloadLink.click();
                        }

                        function exporting(startDate, endDate) {
                            //check if there are dates set pakuchinja range
                            const firstNewDate = localStorage.getItem('firstDate');//DATE STORED IN LOCAL STORAGE FROM OTHER JS FILES
                            const lastNewDate = localStorage.getItem('lastDate');
                            if (firstNewDate !== null && lastNewDate !== null) {
                                endDate = new Date(lastNewDate);
                                startDate = new Date(firstNewDate);//ELSE CONVERT THE DATES IN LOCAL STORAGE TO DATE FORMAT
                            }
                            const momntStartDate1 = moment.tz(startDate, "Africa/Harare").startOf('day'); // Midnight in Zimbabwe
                            const momntEndDate1 = moment.tz(endDate, "Africa/Harare").endOf('day'); // end of day  in Zimbabwe

                            // Convert back to JavaScript Date objects (optional, only if needed)
                            startDate = momntStartDate1.toDate();
                            endDate = momntEndDate1.toDate();


                            const theStartDate = moment(startDate).format('DD/MM/YYYY');
                            const theEndDate = moment(endDate).format('DD/MM/YYYY');
                            const currencies = Array.from(newCurrencies).find(newCurrency => newCurrency.BASE_CURRENCY === 'Y');//find the base currency
                            let baseCurrName
                            if (currencies) {
                                baseCurrName = currencies.Currency_Name
                            }

                            let headerRow = ['Category', 'PayOut' + ` (${baseCurrName})`, 'PayIn' + ` (${baseCurrName})`];
                            let csvContent = [];
                            let filename = "trial_balance.csv";
                            csvContent.push(('Trial Balance for the period ending:' + theEndDate) + "\r\n");

                            let totalPayIn = 0
                            let totalPayOut = 0
                            for (let i = 0; i < categoryArray.length; i++) {
                                const each = categoryArray[i];
                                let row = [];

                                if (i === 0) {
                                    // Generate the header row
                                    csvContent.push(headerRow.join(","));
                                }
                                // Add other columns (payOutAmountCell and payInAmountCell) to the row
                                let totalPayInCatAmnt1 = 0
                                let totalPayOutCatAmnt1 = 0

                                if (each.Balance === 'PayIn') {
                                    for (let a = 0; a < cashFlowArray.length; a++) {
                                        const data = cashFlowArray[a];
                                        const date = data.CashFlowDate
                                        const parts = date.split("/");
                                        const formattedDate = parts[1] + "/" + parts[0] + "/" + parts[2];
                                        const formattedDates2 = new Date(formattedDate);
                                        const formattedDates2Zim = moment.tz(formattedDates2, "Africa/Harare").startOf('day').toDate();
                                        if (formattedDates2Zim.getTime() <= endDate.getTime()) {//CODE FOR 
                                            //TIRIMO CHECK THE TOTALS OF THE AVAILABLE CATEGORIES
                                            if ((each.category).toLowerCase() === data.CashFlowCategory && data.CashFlowType === 'Pay in') {
                                                totalPayInCatAmnt1 = parseFloat(totalPayInCatAmnt1) + parseFloat(data.CashFlowCashEquiv);
                                                totalPayIn = parseFloat(totalPayIn) + parseFloat(data.CashFlowCashEquiv)
                                            }
                                            else {
                                                totalPayInCatAmnt1 = totalPayInCatAmnt1

                                            }
                                        }
                                    }
                                    if (each.category.includes("_")) {
                                        each.category = each.category.replace(/_/g, " ")
                                        each.category = (each.category).split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
                                    }
                                    else {
                                        each.category = (each.category).split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
                                    }
                                    row.push(each.category + ',' + "" + ',' + Number(totalPayInCatAmnt1).toFixed(2));
                                }

                                else if (each.Balance === 'PayOut') {
                                    for (let a = 0; a < cashFlowArray.length; a++) {
                                        const data = cashFlowArray[a];
                                        const date = data.CashFlowDate
                                        const parts = date.split("/");
                                        const formattedDate = parts[1] + "/" + parts[0] + "/" + parts[2];
                                        const formattedDates2 = new Date(formattedDate);
                                        const formattedDates2Zim = moment.tz(formattedDates2, "Africa/Harare").startOf('day').toDate();

                                        if (formattedDates2Zim.getTime() <= endDate.getTime()) {//CODE FOR 
                                            //TIRIMO CHECK THE TOTALS OF THE AVAILABLE CATEGORIES
                                            if ((each.category).toLowerCase() === data.CashFlowCategory && data.CashFlowType === 'Payout') {
                                                totalPayOutCatAmnt1 = parseFloat(totalPayOutCatAmnt1) + parseFloat(data.CashFlowCashEquiv);
                                                totalPayOut = parseFloat(totalPayOut) + parseFloat(data.CashFlowCashEquiv)
                                            }
                                            else {
                                                totalPayOutCatAmnt1 = totalPayOutCatAmnt1

                                            }
                                        }
                                    }
                                    if (each.category.includes("_")) {
                                        each.category = each.category.replace(/_/g, " ")
                                        each.category = (each.category).split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
                                    }
                                    else {
                                        each.category = (each.category).split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
                                        console.log(each.category)
                                    }
                                    row.push(each.category + ',' + Number(totalPayOutCatAmnt1).toFixed(2) + ',' + "");
                                }

                                csvContent.push(row);
                            }

                            if (totalPayIn > totalPayOut) {
                                const profit = ['CASH BALANCE', Number(totalPayIn.toFixed(2) - totalPayOut.toFixed(2)).toFixed(2), ""].join(',');
                                totalPayOut = totalPayOut + (totalPayIn.toFixed(2) - totalPayOut.toFixed(2))
                                csvContent.push(profit);
                            }
                            else if (totalPayIn < totalPayOut) {
                                const loss = ['CASH BALANCE', " ", Number(totalPayOut.toFixed(2) - totalPayIn.toFixed(2)).toFixed(2)].join(',');
                                totalPayIn = totalPayIn + (totalPayOut.toFixed(2) - totalPayIn.toFixed(2))
                                csvContent.push(loss);
                            }
                            const totalsRow = ['TOTAL', totalPayOut.toFixed(2), totalPayIn.toFixed(2)].join(',');
                            csvContent.push(totalsRow);
                            downloadCSV(csvContent.join("\n"), filename);
                        }

                    })
                    .catch(error => console.error('Error fetching incomes:', error));
                console.log(cashFlowArray); // do something with the currencies array
            })
            .catch(error => console.error('Error fetching categories:', error));
    })
    .catch(error => console.error('Error fetching currencies:', error));
//=============================================================
