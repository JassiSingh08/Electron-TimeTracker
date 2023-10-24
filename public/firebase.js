// Import the functions you need from the SDKs you need
const { initializeApp } = require("firebase/app");
const { getStorage } = require("firebase/storage");

// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAWWB1FocOVQDYRdEwzHs_c0yiZr5CN_UM",
  authDomain: "timetracker-34249.firebaseapp.com",
  projectId: "timetracker-34249",
  storageBucket: "timetracker-34249.appspot.com",
  messagingSenderId: "969694526828",
  appId: "1:969694526828:web:ac3f93ee4e975c1c8f4749",
  measurementId: "G-7683SQP9W5",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

module.exports = storage;
