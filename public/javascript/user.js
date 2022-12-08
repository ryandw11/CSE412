const usernames = document.querySelectorAll(".user-name-replace");
for(let username of usernames) {
    const userID = username.textContent;
    fetch(`http://localhost:8080/user/${userID}`).then(val => val.json()).then( data => {
        username.textContent = data.username;
    });
}

const usernameImage = document.querySelectorAll(".user-image-replace");
for(let username of usernameImage) {
    const userID = username.getAttribute('src');
    fetch(`http://localhost:8080/user/${userID}`).then(val => val.json()).then( data => {
        username.src = data.profilepicture;
    });
}