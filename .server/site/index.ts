(function _doIt(io) {
    const server = 'http://localhost:3003/';
    document.getElementById('hello').style.color = 'blue';

    fetch(server + 'loaded').then((res) => res.json()).then((items) => console.log(items));

    const socket = io.connect('http://localhost:3003');
    socket.on('news', (data) => {
        console.log(data);
        socket.emit('my other event', { my: 'data' });
    });
})((window as any).io);
