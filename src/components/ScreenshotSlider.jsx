import React, { useEffect, useState } from "react";

const ScreenshotSlider = ({ isSliderVisible }) => {
  const initialSliderValue = localStorage.getItem("sliderSetting") || 5;
  const [sliderValue, setSliderValue] = useState(
    parseInt(initialSliderValue, 10)
  );

  const handleSliderChange = (event) => {
    const newValue = parseInt(event.target.value, 10);
    setSliderValue(newValue);
    //setting value in storage
    localStorage.setItem("sliderSetting", newValue);
  };

  return (
    <div className={`slider-box ${isSliderVisible ? "visible" : ""}`}>
      <p>Set how many Screenshots should the tracker take</p>
      <div>
        <input
          type="range"
          min="1"
          max="10"
          step="1"
          value={sliderValue}
          onChange={handleSliderChange}
        />
        <div>{sliderValue}</div>
      </div>
    </div>
  );
};

export default ScreenshotSlider;
