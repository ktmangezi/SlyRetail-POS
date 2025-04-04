
//GET THE SESSION ID FROM THE LOCALSTORAGE
const sessionId = localStorage.getItem('sessionId')

const spinner = document.querySelector('#spinner')

function displayContainerBlocks() {
    document.querySelector(".loader-container").style.display = "none";
    document.querySelector(".theLoader").style.display = "none";
    document.querySelector(".icon-nav").style.display = "block";
    document.querySelector(".toolbar").style.display = "block";
    document.querySelector(".bigContainer").style.display = "block";

}
const fetchStatus = localStorage.getItem('fetchStatus')
// if (fetchStatus === 'true') {
// Show the spinner and loader container
displayContainerBlocks()
// }

// This is looping through dropdown options adding event listeners then fetch dat from the selected third part 
let allTokenOptions = document.querySelectorAll(".thirdPartytokenOptions")
allTokenOptions.forEach(option => {
    option.addEventListener("click", function (event) {
        event.preventDefault();
        const selectedOption = option.innerText;
        const modal = document.querySelector(".tokenContainer");
        if (selectedOption === "Loyverse") {
            document.querySelector(".tokenSpan").innerText = selectedOption;
            modal.style.display = 'block'     //display the modal to enter the token upon selecting loyverse 
        }
    });
});

//====================================================================================================

// let loyverseToken=localStorage.getItem('token')
const tokenInput = document.querySelector('#token')
tokenInput.addEventListener('keydown', function (event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        console.log(tokenInput.value)
        //save the token in local storage
        localStorage.setItem('token', tokenInput.value)
        // save to database
        const token = tokenInput.value
        saveTokenToDB(token)
    }
})
//add an event listener on the submit button to call the savetokentodb functin
document.querySelector('#submittoken').addEventListener('click', function (event) {
    event.preventDefault()
    const token = tokenInput.value
    //save the token in local storage
    localStorage.setItem('token', tokenInput.value)
    saveTokenToDB(token, sessionId)
})

function saveTokenToDB(token) {
    notification('Processing.....')
    // ?rmve the modal 
    document.querySelector(".tokenContainer").style.display = "none";
    //fetch the token to the server
    fetch('/saveToken', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            token,
            sessionId
        })
    }).then(response => response.json())
        .then(data => {
            console.log(data)
            if (data.isSaved === true) {
                notification('Token saved successfully..Directing to page');
                //redirect to the advance cash management page
                window.location.href = '/advanceCashMngmnt';  // This runs in the browser
            }
            else {
                notification('Token not saved. Please try again.');
                window.location.href = '/thirdPartToken';  // This runs in the browser
            }
        })

}
// Eventlistener to skip the token process
document.querySelector(".skipProcessBtn").addEventListener("click", function () {
    notification('Skipping token process..Directing to page');
    //set a delay and redirect to the advance cash management page
    setTimeout(() => {
        window.location.href = '/advanceCashMngmnt';  // This runs in the browser
    }, 2000)
});
//==========================================================================================
// Eventlistener to cancel the token modal
document.querySelector("#canceltoken").addEventListener("click", function () {
    document.querySelector(".tokenContainer").style.display = "none";
});

function notification(message) {
    const notificationBlock = document.getElementById('notificationBlock');
    const notification = document.createElement('div');
    notification.classList.add('notification');
    notification.textContent = message;
    notificationBlock.appendChild(notification);

    // Show notification with a delay
    setTimeout(function () {
        notification.classList.add('show');
    }, 500);
    // Remove notification after 4 seconds (1 second fade-in + 3 seconds visible)
    setTimeout(function () {
        notification.classList.remove('show'); // Trigger fade-out + slide-out
        setTimeout(function () {
            notification.remove(); // Remove the notification element after the animation
        }, 700); // Wait for the fade-out transition to finish before removing
    }, 2000); // 4 seconds total visible time
}
