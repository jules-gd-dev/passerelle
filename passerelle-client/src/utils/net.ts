import fs from 'node:fs';
import net from 'node:net';

export function findAvailablePort(startPort: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(startPort, '0.0.0.0', () => {
      const { port } = server.address() as net.AddressInfo;
      server.close(() => resolve(port));
    });
    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        resolve(findAvailablePort(startPort + 1));
      } else {
        reject(err);
      }
    });
  });
}

export function tryAttachToBackgroundDaemon(socketFile: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (!fs.existsSync(socketFile)) {
      return resolve(false);
    }
    const socket = net.connect(socketFile);
    socket.on('connect', () => {
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.setEncoding('utf8');
        process.stdin.on('data', (key: string) => {
          if (key.trim() === 'd') {
            socket.write('d');
            setTimeout(() => {
              console.clear();
              console.log('[OK] Passerelle Daemon detached successfully.');
              console.log('     The daemon is running in the background.');
              console.log('     Re-attach anytime by running: passerelle ui\n');
              socket.destroy();
              process.exit(0);
            }, 100);
          } else {
            socket.write(key);
          }
        });
      }
      socket.on('data', (data) => {
        process.stdout.write(data.toString());
      });
      socket.on('close', () => {
        process.exit(0);
      });
    });
    socket.on('error', () => {
      try {
        fs.unlinkSync(socketFile);
      } catch (_e) {}
      resolve(false);
    });
  });
}
