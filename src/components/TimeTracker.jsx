import React, { useEffect, useState } from "react";
import play from "../assets/play.png";
import stop from "../assets/stop.png";

const TimeTracker = () => {
  const [timer, setTimer] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  const NoOfScreenShots = localStorage.getItem("sliderSetting");
  const TimeGapBtwSS = Math.floor(60 / NoOfScreenShots);

  useEffect(() => {
    let timerInterval;

    if (isRunning) {
      timerInterval = setInterval(() => {
        setTimer((prev) => prev + 1);
        if (timer % TimeGapBtwSS === 0) {
          takeScreenshot();
        }
      }, 1000);
    } else {
      clearInterval(timerInterval);
    }

    return () => {
      clearInterval(timerInterval);
    };
  }, [isRunning, timer]);

  const handleTimer = () => {
    setIsRunning(!isRunning);
  };

  const formatTime = (timeInSeconds) => {
    const hours = Math.floor(timeInSeconds / 3600);
    const minutes = Math.floor((timeInSeconds % 3600) / 60);
    const seconds = timeInSeconds % 60;

    const formattedHours = hours < 10 ? `0${hours}` : hours;
    const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
    const formattedSeconds = seconds < 10 ? `0${seconds}` : seconds;

    return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
  };

  async function takeScreenshot() {
    await window.screenshot.captureScreenShot();
    window.screenshot.screenShotCaptured((event, dataURL) => {
     console.log("SCREENSHOT CAPTURED ")
    });
  }

  return (
    <div className="timer-box">
      <div>Timer: {formatTime(timer)}</div>
      <button className="timer-btns" onClick={handleTimer}>
        {isRunning ? (
          <img src={stop} alt="Stop Timer" />
        ) : (
          <img src={play} alt="Start Timer" />
        )}
      </button>
    </div>
  );
};

export default TimeTracker;
