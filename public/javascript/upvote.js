const upvotes = document.querySelectorAll(".upvote-replace");
for(let upvote of upvotes) {
    const commentID = upvote.textContent;
    fetch(`http://localhost:8080/upvote/${commentID}`).then(val => val.text()).then( data => {
        upvote.textContent = data;
    });
}