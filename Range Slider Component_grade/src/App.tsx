import { useState } from 'react';
import InteractiveSliderCard from './components/InteractiveSliderCard';

export default function App() {
  const [rangeValues, setRangeValues] = useState({ min: 10, max: 30 });

  const handleRangeChange = (minValue: number, maxValue: number) => {
    setRangeValues({ min: minValue, max: maxValue });
    console.log(`Range updated: ${minValue}g/T - ${maxValue}g/T`);
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-8">
      <div className="flex flex-col items-center gap-8">
        <div className="w-[120px] h-[320px]">
          <InteractiveSliderCard
            min={0}
            max={40}
            initialMinValue={10}
            initialMaxValue={30}
            step={1}
            unit="g/T"
            onRangeChange={handleRangeChange}
          />
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 text-white text-center">
          <p className="text-sm opacity-75 mb-1">Current Range</p>
          <p className="text-lg">
            {rangeValues.min}g/T - {rangeValues.max}g/T
          </p>
          <p className="text-xs opacity-60 mt-1">
            Difference: {rangeValues.max - rangeValues.min}g/T
          </p>
        </div>
      </div>
    </div>
  );
}