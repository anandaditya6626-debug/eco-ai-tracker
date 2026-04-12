import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000', {
  autoConnect: false,
});

export const useSocket = () => {
  const [lastData, setLastData] = useState(null);

  useEffect(() => {
    const isEnabled = localStorage.getItem('trackerEnabled') === 'true';
    if (isEnabled) {
      socket.connect();
    }

    socket.on('entry-broadcast', (data) => {
      setLastData(data);
    });

    return () => {
      socket.off('entry-broadcast');
      socket.disconnect();
    };
  }, []);

  const emitEntry = (data) => {
    if (socket.connected) {
      socket.emit('new-entry', data);
    }
  };

  return { lastData, emitEntry };
};
