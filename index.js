const { app, BrowserWindow } = require('electron')
const path = require('path')
const fs = require('fs')
const Firebase = require('firebase')
const { ipcMain } = require('electron');

const firebaseConfig = {
  apiKey: "AIzaSyCw15IwRna_xtBQ1avnLhJ_8eJam2pCvII",
  databaseURL: "https://refinitiv-ffd63-default-rtdb.firebaseio.com",
  authDomain: "refinitiv-ffd63.firebaseapp.com",
  projectId: "refinitiv-ffd63",
  storageBucket: "refinitiv-ffd63.appspot.com",
  messagingSenderId: "1027118619131",
  appId: "1:1027118619131:web:21316940c38b31c6a1935e",
  measurementId: "G-RJ4KD3JYBC"
}

const localstorePath = `./db.json`
let db;
let state = {
  a: null,
  b: null,
  operator: null,
  result: 0,
  isCloud: false
}

function getState() {
  return {
    a: state.a,
    b: state.b,
    operator: state.operator,
    result: state.result,
    isCloud: state.isCloud
  }
}

function updateState(obj) {
  state = {
    a: obj.a,
    b: obj.b,
    operator: obj.operator,
    result: obj.result,
    isCloud: obj.isCloud
  }
}

function cal(obj) {
  let a = obj.a;
  let b = obj.b;
  let result = obj.result;
  const operator = obj.operator;
  const isCloud = obj.isCloud;

  if (isNaN(a) || isNaN(b) || operator == null) {
    return null;
  }

  a = Number(a)
  b = Number(b)
  result = 0;

  if (operator == '+') {
    result = (a) + (b);
  } else if (operator == '-') {
    result = a - b;
  } else if (operator == '*') {
    result = a * b;
  } else if (operator == '/') {
    result = a / b;
  } else {
    result = Math.pow(a, b);
  }

  const data = {
    a: a,
    b: b,
    operator: operator,
    result: result,
    isCloud: isCloud
  };
  updateState(data);
  return data;
}

function writeFirebaseData() {
  var ref = db.ref("users");
  ref.set(getState());
  console.log('Set firebase data');
}

function loadFirebaseData(event) {
  var ref = db.ref("users");
  return ref.on("value", function (snapshot) {
    event.sender.send('load', snapshot.val())
    return snapshot.val();
  }, function (errorObject) {
    console.log("The read failed: " + errorObject.code);
  });
}

function writeLocalDataFile() {
  fs.writeFileSync(localstorePath, JSON.stringify(getState(), { flag: 'w' }));
}

function loadLocalDataFile() {
  return JSON.parse(fs.readFileSync(localstorePath));
}

ipcMain.on("cal", function (event, args) {
  const result = cal(args);
  event.sender.send("result", result);
});

ipcMain.on("load", function (event, args) {
  const result = load(args.isCloud, event);
  event.sender.send("load", result);
});

ipcMain.on("save", function (event, args) {
  save(args.isCloud);
});

function load(isCloud, event) {
  if (isCloud) {
    loadFirebaseData(event);
    return {}
  } else {
    return loadLocalDataFile();
  }
}

function save(isCloud) {
  if (isCloud) {
    writeFirebaseData();
  } else {
    writeLocalDataFile();
  }
}

function initFirebase() {
  const app = Firebase.initializeApp(firebaseConfig);
  db = app.database();
  db.ref("users");
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 300,
    height: 320,
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true,
      preload: path.join(__dirname, 'preload.js')
    }
  })

  mainWindow.loadFile('index.html')
}

app.whenReady().then(() => {

  try {
    initFirebase();
  } catch (err) {
    console.error(err);
  }

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})
