const favorites = document.querySelectorAll(".favorite-replace");
for(let favorite of favorites) {
    const gameID = favorite.textContent;
    fetch(`http://localhost:8080/favorite-text/${gameID}`).then(val => val.text()).then( data => {
        favorite.textContent = data;
    });
}