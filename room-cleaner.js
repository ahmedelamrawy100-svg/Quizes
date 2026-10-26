window.addEventListener('beforeunload', () => {
    const myRoom = localStorage.getItem('activeRoomCode');
    if (myRoom && window.db && window.ref && window.remove) {
        window.remove(window.ref(window.db, 'rooms/' + myRoom));
        localStorage.removeItem('activeRoomCode');
    }
});