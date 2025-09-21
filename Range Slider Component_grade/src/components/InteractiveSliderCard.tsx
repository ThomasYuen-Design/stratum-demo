import { useState } from 'react';
import VerticalRangeSlider from './VerticalRangeSlider';

interface InteractiveSliderCardProps {
  min?: number;
  max?: number;
  initialMinValue?: number;
  initialMaxValue?: number;
  step?: number;
  unit?: string;
  onRangeChange?: (minValue: number, maxValue: number) => void;
}

export default function InteractiveSliderCard({
  min = 500,
  max = 1500,
  initialMinValue = 500,
  initialMaxValue = 1500,
  step = 10,
  unit = 'm',
  onRangeChange
}: InteractiveSliderCardProps) {
  const [currentMinValue, setCurrentMinValue] = useState(initialMinValue);
  const [currentMaxValue, setCurrentMaxValue] = useState(initialMaxValue);

  const handleRangeChange = (minValue: number, maxValue: number) => {
    setCurrentMinValue(minValue);
    setCurrentMaxValue(maxValue);
    onRangeChange?.(minValue, maxValue);
  };

  return (
    <div className="backdrop-blur-sm backdrop-filter bg-[rgba(75,75,75,0.7)] relative rounded-[12px] size-full" data-name="Card-background">
      <div className="flex flex-col items-center justify-center relative size-full">
        <div className="box-border content-stretch flex flex-col gap-[10px] items-center justify-center overflow-clip px-[12px] py-[8px] relative size-full">
          <div className="content-stretch flex flex-col gap-[4px] items-center relative shrink-0" data-name="Slide + numbers">
            {/* Top label - shows current max value */}
            <div className="font-['Inter:Light',_sans-serif] font-light leading-[0] not-italic opacity-[0.56] relative shrink-0 text-[10px] text-center text-nowrap text-white tracking-[-0.5px]">
              <p className="leading-[normal] whitespace-pre">{currentMaxValue} {unit}</p>
            </div>
            
            {/* Interactive Range Slider */}
            <VerticalRangeSlider
              min={min}
              max={max}
              initialMinValue={initialMinValue}
              initialMaxValue={initialMaxValue}
              step={step}
              unit={unit}
              onChange={handleRangeChange}
            />
            
            {/* Bottom label - shows current min value */}
            <div className="font-['Inter:Light',_sans-serif] font-light leading-[0] not-italic opacity-[0.56] relative shrink-0 text-[10px] text-center text-nowrap text-white tracking-[-0.5px]">
              <p className="leading-[normal] whitespace-pre">{currentMinValue} {unit}</p>
            </div>
          </div>
        </div>
      </div>
      <div aria-hidden="true" className="absolute border border-[#646464] border-solid inset-0 pointer-events-none rounded-[12px]" />
    </div>
  );
}