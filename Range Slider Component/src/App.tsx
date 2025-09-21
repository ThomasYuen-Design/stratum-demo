import { useState } from 'react';
import InteractiveSliderCard from './components/InteractiveSliderCard';

export default function App() {
  const [rangeValues, setRangeValues] = useState({ min: 500, max: 1500 });

  const handleRangeChange = (minValue: number, maxValue: number) => {
    setRangeValues({ min: minValue, max: maxValue });
    console.log(`Range updated: ${minValue}m - ${maxValue}m`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-800 to-slate-900 flex items-center justify-center p-8">
      <div className="flex flex-col items-center gap-8">
        <div className="w-[120px] h-[320px]">
          <InteractiveSliderCard
            min={500}
            max={1500}
            initialMinValue={500}
            initialMaxValue={1500}
            step={10}
            unit="m"
            onRangeChange={handleRangeChange}
          />
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 text-white text-center">
          <p className="text-sm opacity-75 mb-1">Current Range</p>
          <p className="text-lg">
            {rangeValues.min}m - {rangeValues.max}m
          </p>
          <p className="text-xs opacity-60 mt-1">
            Difference: {rangeValues.max - rangeValues.min}m
          </p>
        </div>
      </div>
    </div>
  );
}