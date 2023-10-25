const {
  app,
  BrowserWindow,
  Tray,
  Menu,
  desktopCapturer,
  screen,
  ipcMain,
  dialog,
} = require("electron");

const path = require("path");
const isDev = require("electron-is-dev");
const fs = require("fs");
const http = require("http");
//UUID
const { v4: uuidv4 } = require("uuid");

//SQLITE DB
const sqlite3 = require("sqlite3").verbose();
const userDataPath = app.getPath("userData");
const dbPath = path.join(userDataPath, "tracker.db");
const db = new sqlite3.Database(dbPath);

//firebase
const storage = require("./firebase");
const { ref, uploadBytes } = require("firebase/storage");
let processInterval;

//express
const ExpressServer = require("./express");

//0.0.1
const { autoUpdater } = require("electron-updater");
const commandConvert = require("cross-env/src/command");

//MAIN WINDOW
let mainWindow;
let tray;
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 680,
    icon: path.join(__dirname, "Clock-tracker.png"),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });
  mainWindow.loadURL(isDev ? "http://localhost:3000" : `http://localhost:5000`);
  //   mainWindow.webContents.openDevTools();

  ExpressServer(() => {
    console.log("Express server is running.");
  });

  autoUpdater.checkForUpdates();
}

//SECOND INSTANCE CHECK 

const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  }) 
}


app.whenReady().then(() => {
  createWindow();
  //TRAY
  tray = new Tray(path.join(__dirname, "Clock-tracker-tray.png"));
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: `App Version ${app.getVersion()}`,
      },
      {
        label: "Show App",
        click: () => {
          if (mainWindow) {
            mainWindow.show();
          }
        },
      },
      {
        label: "Quit",
        click: () => {
          app.isQuitting = true;
          app.quit();
        },
      },
    ])
  );
  tray.on("click", () => {
    if (mainWindow) {
      mainWindow.show();
    }
  });
  mainWindow.on("close", (event) => {
    if (!app.isQuiting) {
      event.preventDefault();
      mainWindow.hide();
      event.returnValue = false;
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});

app.on("before-quit", () => {
  app.isQuiting = true;
  clearInterval(processInterval);
});

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      filename TEXT
    )
  `);
});

// Function to insert the screenshot filename, id, and createdAt into the database
function insertScreenshotInfo(filename) {
  db.run(
    "INSERT INTO queue (filename) VALUES (?)",
    [filename],
    function (error) {
      if (error) {
        console.error("Error inserting record:", error);
      } else {
        console.log("Record inserted successfully.");
      }
    }
  );
}

//C:\Users\hp\AppData\Roaming\electron-time-tracker

ipcMain.on("capture-screenshot", async (event) => {
  const screenShotInfo = await captureScreen();
  event.sender.send("screenshot-captured");
});

//SCREENCAPTURE / SCREENSHOT LOGIC
async function captureScreen() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.size;

  const options = {
    types: ["screen"],
    thumbnailSize: { width, height },
  };
  const sources = await desktopCapturer.getSources(options);

  const primarySource = sources.find(
    ({ display_id }) => display_id == primaryDisplay.id
  );

  //   creating clockify folder in the directory
  const documentsPath = app.getPath("documents");
  const clockifyFolderPath = path.join(documentsPath, "clockify");

  // checking if it exists
  if (!fs.existsSync(clockifyFolderPath)) {
    fs.mkdirSync(clockifyFolderPath);
  }

  const screenshotUUID = uuidv4();
  const screenshotPath = path.join(clockifyFolderPath, `${screenshotUUID}.png`);

  const image = primarySource.thumbnail.toPNG();
  try {
    fs.writeFile(screenshotPath, image, (error) => {
      if (error) {
        console.error("Error saving screenshot:", error);
      } else {
        console.log("Screenshot saved:", screenshotPath);
        // Insert the filename, id, and createdAt into the database
        insertScreenshotInfo(`${screenshotUUID}.png`);
      }
    });
  } catch (error) {
    console.error("Error writing the file:", error);
  }
}

//ONLINE/OFFLINE
const processQueue = () => {
  return new Promise((resolve) => {
    const options = {
      hostname: "www.google.com",
      port: 80,
      path: "/",
      method: "GET",
    };

    const req = http.request(options, (res) => {
      resolve(true);
    });

    req.on("error", (err) => {
      resolve(false);
    });

    req.end();
  });
};

processInterval = setInterval(() => {
  processQueue()
    .then((isAvailable) => {
      if (isAvailable) {
        console.log("INTERNET IS AVAILABLE");
        //getting queue from databse
        db.get(
          "select * from queue order by createdAt ASC LIMIT 1",
          (err, row) => {
            if (err) {
              console.log("error querying the database", err);
            } else {
              if (row) {
                console.log("Record from queue", row);
                //record available now uplaoding it to firebase
                const documentsFolderPath = app.getPath("documents");
                const clockifyFolderPath = path.join(
                  documentsFolderPath,
                  "clockify"
                );

                // const filePath = 'C:/Users/hp/Documents/clockify/eda962cc-cd12-4d9e-b976-34f4b008df1d.png';
                const filePath = path.join(clockifyFolderPath, row.filename);

                const imageContent = fs.readFileSync(filePath);
                const storagePath = row.filename;
                const snapshot = ref(storage, storagePath);

                uploadBytes(snapshot, imageContent)
                  .then(() => {
                    console.log("Image uploaded successfully to Firebase");
                    //uploaded successfully now delete from queue
                    db.run(
                      "DELETE FROM queue WHERE id = ?",
                      [row.id],
                      (deleteErr) => {
                        if (deleteErr) {
                          console.error(
                            "Error deleting record from the queue:",
                            deleteErr
                          );
                        } else {
                          console.log("Record deleted from the queue");
                        }
                      }
                    );

                    fs.unlink(filePath, (err) => {
                      if (err) {
                        console.error("Error deleting local file:", err);
                      } else {
                        console.log("Local file deleted successfully");
                      }
                    });
                  })
                  .catch((error) => {
                    console.error("Error uploading image to Firebase:", error);
                  });
              } else {
                console.log("NO RECORDS IN THE QUEUE");
              }
            }
          }
        );
      } else {
        console.log("NO INTERNET AVAILABLE");
      }
    })
    .catch((error) => {
      console.log("error checking internet connection");
    });
}, 10000);

// auto updates

autoUpdater.on("checking-for-update", () => {
  console.log("Checking for updates...");
});

autoUpdater.on("update-available", (info) => {
  console.log("Update available:", info.version);
  autoUpdater.downloadUpdate();
});

autoUpdater.on("update-not-available", () => {
  console.log("No updates available");
});

autoUpdater.on("error", (err) => {
  console.error("Update error:", err);
});

autoUpdater.on("download-progress", (progressObj) => {
  console.log(`Downloaded ${progressObj.percent}%`);
});

autoUpdater.on("update-downloaded", () => {
  console.log("Update downloaded and ready to install");
  const dialogOptions = {
    type: "info",
    buttons: ["Install", "Later"],
    defaultId: 0,
    title: "Update Available",
    message: "A new version is available. Install it now?",
  };

  const response = dialog.showMessageBox(dialogOptions);

  if (response === 0) {
    autoUpdater.quitAndInstall();
  }
});

autoUpdater.on("error", (event, error) => {
  // An error occurred during the update process.
  console.error("Update error:", error);
});
