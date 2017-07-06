(function _doIt() {
    const server = 'http://localhost:3003/';
    document.getElementById('hello').style.color = 'blue';

    fetch(server + 'loaded').then((res) => res.json()).then((items) => console.log(items));
})();
