window.addEventListener('load', () => {
    const url = new URL(location.href);
    const err = url.searchParams.get('succ');
    const errorDoc = document.getElementById('succ');
    if (err == null) return;
    switch (err) {
        case '1':
            errorDoc.getElementsByTagName('span')[0].textContent = 'Sucessfully updated your user profile image!';
            errorDoc.style.display = 'block';
            break;
    }
});