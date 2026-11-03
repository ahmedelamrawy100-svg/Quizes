window.addEventListener('beforeunload', () => {
    const myRoom = localStorage.getItem('activeRoomCode');
    if (myRoom && window.db && window.ref && window.get && window.remove) {
        window.get(window.ref(window.db, 'rooms/' + myRoom)).then((snapshot) => {
            if (snapshot.exists()) {
                const roomData = snapshot.val();
                if (roomData.status === 'waiting') {
                    window.remove(window.ref(window.db, 'rooms/' + myRoom));
                }
            }
            localStorage.removeItem('activeRoomCode');
        }).catch(() => {
            localStorage.removeItem('activeRoomCode');
        });
    } else {
        localStorage.removeItem('activeRoomCode');
    }
});