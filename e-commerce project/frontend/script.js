function handlelogin() {
    let username = document.getElementById('username').value;
    let password = document.getElementById('password').value;

    if (username === "" || password === "") {
        alert("Please enter both user and password!");
    }
    else {
        alert('Welcome back! ' + username);
    }
}