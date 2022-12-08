const posts = document.querySelectorAll(".game-id-to-title");
for(let post of posts) {
    const postId = post.textContent;
    console.log("test");
    fetch(`http://localhost:8080/gamez/content/${postId}`).then(val => val.json()).then( data => {
        post.textContent = data.title;
    });
}