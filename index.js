const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } = require('electron');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const https = require('https');
const WebSocket = require('ws');
const { setSquircleDockIcon } = require('./dock-icon');

let autoAcceptEnabled = true;
let mainWindow;
let tray = null;
let leaguePath;
let lockfilePath;
let currentWs = null;
let connecting = false;

function findLeaguePath() {
    try {
        const result = execSync(
            'mdfind "kMDItemFSName == \'League of Legends.app\'" | head -1',
            { encoding: 'utf8', timeout: 5000 }
        ).trim();
        if (result) return path.join(result, 'Contents', 'LoL');
    } catch (err) {}
    return '/Applications/League of Legends.app/Contents/LoL';
}

ipcMain.on('toggle-auto-accept', (_,enabled) => {
    autoAcceptEnabled = enabled;
    console.log('Auto-accept: ', enabled ? 'enabled' : 'disabled')
})

function sendStatus(status) {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('status-update', status);
    }
}

function readLockFile() {
    try {
        const content = fs.readFileSync(lockfilePath, 'utf8');
        const parts = content.split(':');
        const port = parseInt(parts[2], 10);
        if (parts.length < 5 || !port || isNaN(port) || !parts[3]) return null;
        return {
            processName: parts[0],
            pid: parts[1],
            port,
            password: parts[3],
            protocol: parts[4],
        };
    } catch (err) {
        return null;
    }
}

function readyCheckAccept(lockfile) {
    const options = {
        hostname: '127.0.0.1',
        port: lockfile.port,
        path: '/lol-matchmaking/v1/ready-check/accept',
        method: 'POST',
        headers: {
            authorization: 'Basic ' + Buffer.from(`riot:${lockfile.password}`).toString('base64'),
        },
        rejectUnauthorized: false,
    };

    const req = https.request(options, (res) => {
        console.log('Accept response status:', res.statusCode);
    });

    req.on('error', (err) => {
        console.log('Accept request error:', err.message);
    });

    req.end();
}

function watchForLeague() {
    if (readLockFile()) {
        connectToLcu();
        return;
    }
    sendStatus('Disconnected');
    console.log('Watching for League lockfile at:', leaguePath);

    let watcher;
    try {
        watcher = fs.watch(leaguePath, (eventType, filename) => {
            if (filename === 'lockfile' && !connecting && readLockFile()) {
                watcher.close();
                connectToLcu();
            }
        });
    } catch (err) {
        console.log('Watch failed, retrying in 5s:', err.message);
        setTimeout(watchForLeague, 5000);
        return;
    }

    watcher.on('error', () => {
        watcher.close();
        setTimeout(watchForLeague, 5000);
    });
}

function connectToLcu() {
    connecting = true;
    const lockfile = readLockFile();

    if (!lockfile) {
        connecting = false;
        watchForLeague();
        return;
    }

    if (currentWs) {
        currentWs.removeAllListeners();
        currentWs.close();
        currentWs = null;
    }

    console.log('League found on port:', lockfile.port);

    const ws = new WebSocket(`wss://127.0.0.1:${lockfile.port}/`, {
        headers: {
            authorization: 'Basic ' + Buffer.from(`riot:${lockfile.password}`).toString('base64'),
        },
        rejectUnauthorized: false,
    });

    currentWs = ws;

    ws.on('open', () => {
        connecting = false;
        console.log('Connected to league client');
        ws.send(JSON.stringify([5, 'OnJsonApiEvent']));
        sendStatus('Connected');
    });

    ws.on('message', (data) => {
        const message = data.toString();

        try {
            const parsed = JSON.parse(message);
            if (Array.isArray(parsed) && parsed[2]) {
                const eventData = parsed[2];
                const uri = eventData.uri || '';

                if (uri.includes('ready-check') || uri.includes('ReadyCheck')) {
                    console.log('READY CHECK EVENT:', JSON.stringify(eventData, null, 2));

                    if (eventData.data && eventData.data.state === 'InProgress' && eventData.data.playerResponse === 'None' && eventData.data.timer === 10) {
                        console.log('Match found! Auto-accepting...');
                        if (autoAcceptEnabled) {
                            readyCheckAccept(lockfile);
                        }
                    }
                }
            }
        } catch (err) {
            if (!(err instanceof SyntaxError)) console.log('Message handling error:', err.message);
        }
    });

    ws.on('close', () => {
        connecting = false;
        currentWs = null;
        console.log('Disconnected from League client');
        sendStatus('Disconnected');
        if (readLockFile()) {
            setTimeout(connectToLcu, 2000);
        } else {
            watchForLeague();
        }
    });

    ws.on('error', (err) => {
        connecting = false;
        console.log('Connection error:', err.message);
    });
}

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 360,
    height: 320,
    title: 'LoL Auto Accept',
    resizable: false,
    useContentSize: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  mainWindow.on('close', (event) => {
      if (!app.isQuitting) {
          event.preventDefault();
          mainWindow.hide();
      }
  });

  mainWindow.on('closed', () => {
      mainWindow = null;
  });
};

app.whenReady().then(() => {
    try {
        setSquircleDockIcon(app, __dirname);
    } catch (err) {
        console.error('Dock icon setup failed:', err.message);
    }
    leaguePath = findLeaguePath();
    lockfilePath = path.join(leaguePath, 'lockfile');
    console.log('League path:', leaguePath);
    createWindow();
    mainWindow.webContents.on('did-finish-load', () => {
        watchForLeague();
    });

    const trayIcon = nativeImage.createFromPath(path.join(__dirname, 'assets', 'logo.png')).resize({ width: 16, height: 16 });
    trayIcon.setTemplateImage(true);
    tray = new Tray(trayIcon);
    tray.setToolTip('LoL Auto Accept');
    const contextMenu = Menu.buildFromTemplate([
        { label: 'Show', click: () => { mainWindow.show(); } },
        { label: 'Quit', click: () => { app.isQuitting = true; app.quit(); } },
    ]);
    tray.setContextMenu(contextMenu);
});

app.on('activate', () => {
    if (mainWindow) {
        mainWindow.show();
    }
});

app.on('before-quit', () => {
    app.isQuitting = true;
});


app.on('window-all-closed', () => {
  // On macOS, keep the app running in the background
});
