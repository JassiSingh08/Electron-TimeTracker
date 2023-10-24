import React, { useState } from "react";
import gear from "../assets/gear.png";
import ScreenshotSlider from "./ScreenshotSlider";

const Settings = () => {
  const [isSliderVisible, setSliderVisible] = useState(false);

  const handleSliderVisibility = () => {
    setSliderVisible(!isSliderVisible);
  };

  return (
    <div>
      <button className="gear-btn" onClick={handleSliderVisibility}>
        <img src={gear} width="25" height="25" />
      </button>
      {isSliderVisible && (
        <ScreenshotSlider isSliderVisible={isSliderVisible} />
      )}
    </div>
  );
};

export default Settings;
