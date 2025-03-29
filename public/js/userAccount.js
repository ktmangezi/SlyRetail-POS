// let userCredentials = []; //array to store the user credentials
let newCurrencies = []//array to store currencies
let baseCurrency = ''//to store base currency selected
let clickedId = ""
fetch('/getUserCredentials')
    .then(response => response.json())
    .then(data => {
        userCredentials = data.credentials;
        fetch('/currencies')
            .then(response => response.json())
            .then(currencies => {
                currencies.forEach((currency) => {
                    newCurrencies.push(currency);
                });
                const sessionId = localStorage.getItem('sessionId')

                //UPDATE THE DATABASENAME ON THE FORM
                const editField = document.getElementById('editData');
                const emailInput = document.getElementById('email');
                const passwordInput = document.getElementById('password');
                const currentPasswordInput = document.getElementById('currentPassword');

                const userEmail = document.querySelector('.myEmail').innerText;
                const emailPattern = /^[^ ]+@[gmail]+\.[a-z]{2,3}$/;
                const togglePassword = document.getElementById("togglePassword");
                const togglePassword1 = document.getElementById("togglePassword1");

                const saveChanges = document.getElementById('saveChanges');
                const btnSignOut = document.querySelector('.btnSignOut');

                // const tokenInput = document.getElementById("newtokeninput");
                const saveValueBtn = document.querySelector(".save-Current-btn");
                //now after fetching data display the blocks,remove the loader

                document.querySelector(".loader-container").style.display = "none";
                document.querySelector(".icon-nav").style.display = "block";
                document.querySelector(".toolbar").style.display = "block";
                document.querySelector(".content").style.display = "block";
                function maskToken(token, visibleChars = 2) {
                    if (!token || token.length <= visibleChars * 2) return token;

                    const first = token.substring(0, visibleChars);
                    const last = token.substring(token.length - visibleChars);
                    const middle = '*'.repeat(token.length - (visibleChars * 2));

                    return `${first}${middle}${last}`;
                }

                function toggleTokenVisibility(elementId, fullToken) {
                    const element = document.getElementById(elementId);
                    const current = element.textContent;

                    if (current.includes('*')) {
                        element.textContent = fullToken;
                        element.classList.add('visible-token');
                    } else {
                        element.textContent = maskToken(fullToken);
                        element.classList.remove('visible-token');
                    }
                }

                if (userEmail !== '') {
                    emailInput.value = userEmail.trim() + '@gmail.com' //fill the email input text with the account name = tha gmail.com tag
                }
                console.log(userCredentials)
                document.querySelector('.myEmail').innerText = userCredentials.User_Account
                //display the details of the currently logged in account
                emailInput.value = userCredentials.Email
                //store the value in the password field
                passwordInput.value = userCredentials.DbPassword
                // tokenInput.value = maskToken(userCredentials.thirdPartyToken);
                if (userCredentials.thirdPartyToken) {
                    document.querySelector('.tokenType').innerText = 'Loyverse';
                }
                //set token in local storage
                localStorage.setItem('tokenValue', userCredentials.thirdPartyToken);
                //DISABLE THE EMAIL AND PASSWORD INPUT FIELD SO THAT ONE CANNOT EDIT IN IT
                emailInput.disabled = true;
                passwordInput.disabled = true;
                // tokenInput.disabled = true;
                document.querySelectorAll('.fa-pen').forEach(editIcon => {
                    editIcon.addEventListener('click', (e) => {
                        const modal = document.getElementById('editData');
                        // Get the parent span's ID (edit-icon element)
                        const parentSpan = e.target.closest('.edit-icon');
                        clickedId = parentSpan.id; // Now gets 'editIcon', 'eIcon', or 'editTokenIcon'
                        // Position the modal below the clicked icon
                        const iconRect = e.target.getBoundingClientRect();
                        modal.style.top = `${iconRect.bottom + window.scrollY}px`;
                        modal.style.left = `${iconRect.left + window.scrollX}px`;

                        // Show the modal
                        modal.style.display = 'block';
                    });
                });

                // Close modal when cancel button is clicked
                document.getElementById('modallCancell').addEventListener('click', () => {
                    document.getElementById('editData').style.display = 'none';
                    reset()
                });

                // Toggle password visibility
                document.getElementById('togglePassword1').addEventListener('click', function () {
                    const passwordInput = document.getElementById('currentPassword');
                    passwordInput.disabled = false;
                    const type = passwordInput.type === 'password' ? 'text' : 'password';
                    passwordInput.type = type;
                    this.classList.toggle('fa-eye-slash');
                    this.classList.toggle('fa-eye');
                });
                // Close modal when clicking outside (fixed)
                document.addEventListener('mousedown', (e) => {
                    const modal = document.getElementById('editData');
                    const isClickInsideModal = modal.contains(e.target);
                    const isEditIcon = e.target.closest('.edit-icon');

                    if (!isClickInsideModal && !isEditIcon && modal.style.display === 'block') {
                        modal.style.display = 'none';
                        reset()
                    }
                });

                // onclick of eyelash
                togglePassword.addEventListener("click", function (e) {
                    // Toggle the type attribute
                    const type = passwordInput.getAttribute("type") === "password" ? "text" : "password";
                    passwordInput.setAttribute("type", type);

                    // Toggle the icon
                    this.classList.toggle("fa-eye-slash");
                    this.classList.toggle("fa-eye");
                });



                const emailName = emailInput.value; //GET THE VALUE OF THE EMAIL
                const email = emailName.split("@")[0]; //SPLIT TO GET THE NAME BEFORE THE @ TAG

                //check if the email is in expected format
                function checkEmail(newEmail) {
                    if (!newEmail.match(emailPattern)) {
                        return editField.classList.add("invalid");
                    } else {
                        editField.classList.remove("invalid");
                        emailInput.value = newEmail;
                    }
                }
                //fucntion to validate the passwords entered by the user on the modal
                function validatePassword() {
                    const currentPassword = currentPasswordInput.value; // get the value of the current password
                    if (userCredentials.DbPassword === currentPassword) {
                        saveValueBtn.innerText = "Done"
                        editField.style.display = "block";
                        //change inner text to enteremail if passwpord matches
                        if (clickedId === "editIcon") {
                            document.querySelector(".newValue").innerHTML = "Enter New Email";
                            currentPasswordInput.value = "";
                            currentPasswordInput.type = "email";
                        }
                        if (clickedId === "eIcon") {
                            //change inner text to enter new password if password matches
                            document.querySelector(".newValue").innerHTML = "Enter New Password";
                            currentPasswordInput.value = "";
                            currentPasswordInput.type = "password";
                            togglePassword.classList.remove("hidden");
                        }
                    } else {
                        currentPasswordInput.style.color = "red";
                        notification("Password Do Not Match...");
                        editField.style.display = "block";
                        return;
                    }


                }


                // Get all dropdown items
                const dropdownItems = document.querySelectorAll('.thirdPartytokenOptions .dropdown-item');
                const tokenModal = document.querySelector('.token-modal');
                const tokenType = document.querySelector('.tokenType');
                const tokenSpan = document.querySelector('.tokenSpan');
                const cancelTokenBtn = document.getElementById('canceltoken');

                // Handle click on dropdown items
                dropdownItems.forEach(item => {
                    item.addEventListener('click', function (e) {
                        e.preventDefault();

                        // Get the token name from data attribute
                        const tokenName = this.getAttribute('data-token-name');

                        // Update the modal title with the selected token name
                        tokenSpan.textContent = tokenName;

                        // Update the dropdown span with the selected token name
                        tokenType.textContent = tokenName;

                        // Show the modal
                        tokenModal.style.display = 'block';

                        // Position the modal next to the dropdown
                        const dropdown = document.getElementById('dropdownToken');
                        const dropdownRect = dropdown.getBoundingClientRect();

                        // Position modal to the right of the dropdown
                        tokenModal.style.left = `${dropdownRect.width}px`;
                        tokenModal.style.top = '0';
                    });
                });

                // Handle cancel button click
                cancelTokenBtn.addEventListener('click', function (e) {
                    e.preventDefault();
                    tokenModal.style.display = 'none';
                });

                // Close modal when clicking outside
                document.addEventListener('mousedown', function (e) {
                    if (!e.target.closest('.dropdown') && !e.target.closest('.token-modal')) {
                        tokenModal.style.display = 'none';
                    }
                });

                // Close modal when cancel is clicked
                document.getElementById('canceltoken').addEventListener('click', function () {
                    const tokenModal = document.querySelector('.token-modal');
                    tokenModal.style.display = 'none';
                });

                // Handle form submission
                document.getElementById('submittoken').addEventListener('click', function () {
                    const tokenValue = document.getElementById('newtokeninput').value;
                    // Handle token submission here
                    const tokenModal = document.querySelector('.token-modal');
                    console.log('Token submitted:', tokenValue);
                    // ?set the token value in local storage
                    localStorage.setItem('tokenValue', tokenValue);

                    tokenModal.style.display = 'none';
                });

                // Close modal when clicking outside
                document.addEventListener('mousedown', function (e) {
                    const tokenModal = document.querySelector('.token-modal');
                    if (!tokenModal.contains(e.target) &&
                        !document.querySelector('.dropdown-toggle').contains(e.target) &&
                        tokenModal.style.display === 'block') {
                        tokenModal.style.display = 'none';
                    }
                });


                //function to update the field's data
                function updatefields() {
                    //check if the input type is email
                    if (currentPasswordInput.type === "email" && currentPasswordInput.value !== "") {
                        newEmail = currentPasswordInput.value;
                        checkEmail(newEmail);
                        //NOW BACK TO DEFAULT STTINGS
                        reset();
                    }
                    if (currentPasswordInput.type === "password" && currentPasswordInput.value !== "") {
                        passwordInput.value = currentPasswordInput.value;
                        editField.style.display = "none";
                        //NOW BACK TO DEFAULT STTINGS
                        reset();
                    }

                }
                editField.addEventListener("keydown", (event) => {
                    //WHEN THE DONE BUTTON IS CLICKED,CLOSE THE MODAL SAVING THE VALUES INPUTTED
                    if (event.key === "Enter") {
                        event.preventDefault();
                        if (saveValueBtn.innerText === "Next") {
                            validatePassword();
                        } else if (saveValueBtn.innerText === "Done") {
                            updatefields();
                        }
                    }
                });

                function reset() {
                    currentPasswordInput.type = "password";
                    currentPasswordInput.value = "";
                    document.querySelector(".newValue").innerHTML = "Enter Password";
                    saveValueBtn.innerText = "Next"
                    editField.style.display = "none";
                }

                saveValueBtn.addEventListener("click", (event) => {
                    //WHEN THE DONE BUTTON IS CLICKED,CLOSE THE MODAL SAVING THE VALUES INPUTTED
                    event.preventDefault();
                    if (saveValueBtn.innerText === "Next") {
                        validatePassword();
                    } else if (saveValueBtn.innerText === "Done") {
                        updatefields();
                    }
                });
                //LOOP N THE CURRENCIES ARRAY AND CHECK THE CURRENCY WITH Y
                const checkBaseCurrency = Array.from(newCurrencies).find(curr => curr.BASE_CURRENCY === 'Y')
                if (checkBaseCurrency) {
                    document.querySelector('.baseCurr').innerHTML = checkBaseCurrency.Currency_Name
                    baseCurrency = checkBaseCurrency._id
                }
                //WHEN BASE CURRENCY IS SELECTED
                const baseCurrencyDrop = document.querySelectorAll('.curr-option');

                //EVENT LISTENER FOR BASE CURRENCY DROPDOWN
                baseCurrencyDrop.forEach((option, i) => {
                    option.addEventListener("click", function (event) {
                        event.preventDefault();
                        //GET THE SELECTED CURRENCY AND UPDATE THE TEXT WITH ITS VALUE
                        const baseCurrText = document.querySelector('.baseCurr');
                        baseCurrText.innerText = option.innerText;
                        baseCurrency = option.querySelector(`.currencyId${i}`).textContent.trim();

                    })
                })
                //SAVE CHANGES TO DATABASE
                saveChanges.addEventListener('click', (event) => {
                    event.preventDefault()
                    notification('Updating Data...')
                    const userAccount = (emailInput.value).split("@")[0];//SPLIT TO GET THE NAME BEFORE THE @ TAG/
                    const email = emailInput.value;//SPLIT TO GET THE NAME BEFORE THE @ TAG/
                    const myPassword = passwordInput.value;
                    //GET WHATS IN LOCAL STORAGE
                    const tokenValue = localStorage.getItem('tokenValue');
                    // Handle token submission
                    const tokenContainer = document.querySelector('.center-form');
                    tokenContainer.style.display = 'none';

                    //  alert(myPassword)
                    fetch('/updateUserAccount', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            userAccount,
                            email,
                            myPassword,
                            tokenValue,
                            baseCurrency,
                            sessionId
                        })
                    })
                        .then(response => {
                            if (!response.ok) {
                                throw new Error(`HTTP error! status: ${response.status}`);
                            }
                            return response.json();
                        })
                        .then(data => {
                            console.log('Update result:', data);
                            if (data.success) {
                                // Successful update (full or partial)
                                const message = data.message || 'Update successful';
                                notification(message);

                                if (data.updates.credentials || data.updates.currency) {
                                    // Notify user and sign out after a delay
                                    setTimeout(() => {
                                        notification('Signing out...');
                                        location.href = '/';
                                    }, 3000); // 3-second delay before signing out
                                }
                            } else {
                                // Failed update
                                const errorMsg = data.error || 'Failed to update';
                                const partialMsg = data.partialSuccess ?
                                    ' (partial updates were applied)' : '';

                                notification(`${errorMsg}${partialMsg}. Please try again.`);
                                return;
                            }
                        })
                        .catch(error => {
                            console.error('Fetch error:', error);
                            notification('Network error. Please check your connection and try again.');
                        });

                })
                //SAVE CHANGES TO DATABASE
                btnSignOut.addEventListener('click', (event) => {
                    event.preventDefault()
                    notification('Signing out...')
                    fetch('/logout', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            sessionId
                        })
                    })
                        .then(response => response.json())
                        .then(data => {
                            if (data.loggedOut === true) {
                                notification('Logged out successfully! Redirecting...');
                                setTimeout(() => {
                                    window.location.href = "/"; // Redirect to the login page after delay
                                    localStorage.clear(); // Clear all local storage items
                                }, 3000); // 3-second delay before redirecting
                            } else {
                                console.log('Logout failed. Please try again.');
                            }
                        })
                        .catch(error => console.error("Logout error:", error));
                })

                //WHEN THE DELETE BUTTON IS CLICKED
                const deleteTrigger = document.querySelector('.deleteAccount');
                const deleteModal = document.getElementById('deleteAccountModal');
                const noDeleteBtn = document.getElementById('noDelete');

                // Show modal when delete is clicked
                deleteTrigger.addEventListener('click', function (e) {
                    e.preventDefault(); // Prevent immediate close
                    e.stopPropagation(); // Stop the click event from propagating
                    deleteModal.style.display = 'block';
                });

                // Close modal when clicking No or outside
                noDeleteBtn.addEventListener('click', closeModal);
                document.addEventListener('click', function (e) {
                    if (!deleteModal.contains(e.target) && e.target !== deleteTrigger) {
                        closeModal();
                    }
                });

                function closeModal() {
                    deleteModal.style.display = 'none';
                }

                //when the yes button is clicked
                document.getElementById('yesDelete').addEventListener('click', (event) => {
                    event.preventDefault();
                    const emailName = emailInput.value;
                    fetch('/deleteUserAccount', {
                        method: 'DELETE',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            emailName,
                        })
                    })
                        .then(response => {
                            console.log(response)
                            spinner.style.display = 'none';
                            if (response.ok) {
                                //REMOVE ZVESE ZVIRI MUMA LOCAL HOST
                                localStorage.clear(); // Clear all local storage items
                                notification('Directing To Page');
                                location.href = '/register'
                                return response.json();
                            }
                            else {
                                notification('Failure to delete..Try Again')
                                passwordInput.style.color = 'red';
                                location.href = '/userAccount'
                            }

                        })
                        .then(data => {
                            // Handle the response data if needed
                            console.log(data);
                        })
                        .catch(error => {
                            console.error(error);
                            notification('An error occurred while updating. Please try again...');
                            location.reload()
                        })
                })

            })
            .catch(error => console.error('Error fetching user credentials:', error));
        console.log(newCurrencies); // do something with the currencies array
    })
    .catch(error => console.error('Error fetching user credentials:', error));
function notification(message) {
    const notificationBlock = document.getElementById('notificationBlock');
    const notification = document.createElement('div');
    notification.classList.add('notification');
    notification.textContent = message;
    notificationBlock.appendChild(notification);

    // Show notification with a delay
    setTimeout(function () {
        notification.classList.add('show'); // Trigger fade-in + slide-in
    }); // 1 second delay before showing

    // Remove notification after 4 seconds (1 second fade-in + 3 seconds visible)
    setTimeout(function () {
        notification.classList.remove('show'); // Trigger fade-out + slide-out
        setTimeout(function () {
            notification.remove(); // Remove the notification element after the animation
        }, 700); // Wait for the fade-out transition to finish before removing
    }, 4000); // 4 seconds total visible time
}
