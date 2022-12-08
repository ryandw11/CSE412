window.addEventListener('load', () => {
    const url = new URL(location.href);
    const err = url.searchParams.get('err');
    const errorDoc = document.getElementById('signup-error');
    if (err == null) return;
    switch (err) {
        case '1':
            errorDoc.getElementsByTagName('span')[0].textContent = 'Invalid username!';
            errorDoc.style.display = 'block';
            break;
        case '2':
            errorDoc.getElementsByTagName('span')[0].textContent = 'Invalid password!';
            errorDoc.style.display = 'block';
            break;
        case '3':
            errorDoc.getElementsByTagName('span')[0].textContent = 'Username taken!';
            errorDoc.style.display = 'block';
            break;
    }
});