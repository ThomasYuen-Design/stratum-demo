import {
  useState,
  useRef,
  useEffect,
  useCallback,
} from "react";

interface VerticalRangeSliderProps {
  min?: number;
  max?: number;
  initialMinValue?: number;
  initialMaxValue?: number;
  step?: number;
  unit?: string;
  onChange?: (minValue: number, maxValue: number) => void;
}

export default function VerticalRangeSlider({
  min = 500,
  max = 1500,
  initialMinValue = 600,
  initialMaxValue = 1200,
  step = 10,
  unit = "m",
  onChange,
}: VerticalRangeSliderProps) {
  const [minValue, setMinValue] = useState(initialMinValue);
  const [maxValue, setMaxValue] = useState(initialMaxValue);
  const [isDragging, setIsDragging] = useState<
    "min" | "max" | "range" | null
  >(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [hoveredHandle, setHoveredHandle] = useState<
    "min" | "max" | null
  >(null);
  const [showTooltip, setShowTooltip] = useState<
    "min" | "max" | null
  >(null);

  const sliderRef = useRef<HTMLDivElement>(null);
  const trackHeight = 248; // Updated height to match container

  // Convert value to position (0-1)
  const valueToPosition = useCallback(
    (value: number) => {
      return (value - min) / (max - min);
    },
    [min, max],
  );

  // Convert position to value
  const positionToValue = useCallback(
    (position: number) => {
      const value = min + position * (max - min);
      return Math.round(value / step) * step;
    },
    [min, max, step],
  );

  // Get position from mouse/touch event
  const getPositionFromEvent = useCallback(
    (event: MouseEvent | TouchEvent) => {
      if (!sliderRef.current) return 0;

      const rect = sliderRef.current.getBoundingClientRect();
      const clientY =
        "touches" in event
          ? event.touches[0].clientY
          : event.clientY;
      const relativeY = clientY - rect.top;
      // Invert for vertical slider (top = max, bottom = min)
      return Math.max(
        0,
        Math.min(1, 1 - relativeY / trackHeight),
      );
    },
    [],
  );

  // Handle mouse/touch start
  const handleStart = useCallback(
    (
      event: React.MouseEvent | React.TouchEvent,
      type: "min" | "max",
    ) => {
      event.preventDefault();
      setIsDragging(type);
      setShowTooltip(type);

      const position = getPositionFromEvent(event.nativeEvent);
      const currentValue = type === "min" ? minValue : maxValue;
      const currentPosition = valueToPosition(currentValue);
      setDragOffset(position - currentPosition);
    },
    [minValue, maxValue, valueToPosition, getPositionFromEvent],
  );

  // Handle range drag start
  const handleRangeStart = useCallback(
    (event: React.MouseEvent | React.TouchEvent) => {
      event.preventDefault();
      setIsDragging("range");
      setShowTooltip("min");

      const position = getPositionFromEvent(event.nativeEvent);
      const minPosition = valueToPosition(minValue);
      setDragOffset(position - minPosition);
    },
    [minValue, valueToPosition, getPositionFromEvent],
  );

  // Handle mouse/touch move
  useEffect(() => {
    const handleMove = (event: MouseEvent | TouchEvent) => {
      if (!isDragging) return;

      const position = getPositionFromEvent(event);

      if (isDragging === "min") {
        const newValue = positionToValue(position - dragOffset);
        const clampedValue = Math.max(
          min,
          Math.min(newValue, maxValue - step),
        );
        setMinValue(clampedValue);
        onChange?.(clampedValue, maxValue);
      } else if (isDragging === "max") {
        const newValue = positionToValue(position - dragOffset);
        const clampedValue = Math.min(
          max,
          Math.max(newValue, minValue + step),
        );
        setMaxValue(clampedValue);
        onChange?.(minValue, clampedValue);
      } else if (isDragging === "range") {
        const rangeDiff = maxValue - minValue;
        const newMinValue = positionToValue(
          position - dragOffset,
        );
        const clampedMinValue = Math.max(
          min,
          Math.min(newMinValue, max - rangeDiff),
        );
        const newMaxValue = clampedMinValue + rangeDiff;

        setMinValue(clampedMinValue);
        setMaxValue(newMaxValue);
        onChange?.(clampedMinValue, newMaxValue);
      }
    };

    const handleEnd = () => {
      setIsDragging(null);
      setShowTooltip(null);
      setDragOffset(0);
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMove);
      document.addEventListener("mouseup", handleEnd);
      document.addEventListener("touchmove", handleMove);
      document.addEventListener("touchend", handleEnd);
    }

    return () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleEnd);
      document.removeEventListener("touchmove", handleMove);
      document.removeEventListener("touchend", handleEnd);
    };
  }, [
    isDragging,
    dragOffset,
    minValue,
    maxValue,
    getPositionFromEvent,
    positionToValue,
    min,
    max,
    step,
    onChange,
  ]);

  const minPosition = valueToPosition(minValue);
  const maxPosition = valueToPosition(maxValue);

  return (
    <div
      className="h-[248px] relative shrink-0 w-[24px]"
      data-name="Slider"
    >
      {/* Background track */}
      <div className="absolute flex h-[248px] items-center justify-center left-0 right-0 top-0">
        <div className="flex-none h-[24px] rotate-[90deg] w-[248px]">
          <div
            className="bg-black/20 rounded-[6px] size-full"
            data-name="Slider-background"
          />
        </div>
      </div>

      {/* Track progress container */}
      <div
        ref={sliderRef}
        className="absolute box-border content-stretch flex flex-col h-[248px] items-center justify-between left-px rounded-[4.5px] top-0 w-[22px] cursor-pointer"
        style={{
          background: "linear-gradient(to bottom, #9AC2FB 0%, #FEFEFF 30%, #EBDC5A 51%, #EACE55 60%, #DE2216 75%, #0F0201 100%)"
        }}
        data-name="track progress"
      >
        {/* Range highlight */}
        <div
          className="absolute bg-black/20 rounded-[4.5px] w-full transition-all duration-150"
          style={{
            bottom: `${minPosition * 100}%`,
            height: `${(maxPosition - minPosition) * 100}%`,
          }}
          onMouseDown={handleRangeStart}
          onTouchStart={handleRangeStart}
        />

        {/* Min handle (bottom) */}
        <div
          className={`absolute bg-white h-[9px] rounded-[4px] w-full cursor-grab transition-all duration-150 ${
            isDragging === "min"
              ? "cursor-grabbing scale-110"
              : ""
          } ${hoveredHandle === "min" ? "shadow-lg" : ""}`}
          style={{
            bottom: `calc(${minPosition * 100}% - 4.5px)`,
            transform:
              isDragging === "min" ? "scale(1.1)" : "scale(1)",
          }}
          onMouseDown={(e) => handleStart(e, "min")}
          onTouchStart={(e) => handleStart(e, "min")}
          onMouseEnter={() => setHoveredHandle("min")}
          onMouseLeave={() => setHoveredHandle(null)}
          data-name="Lower handle thumb"
        >
          <div
            aria-hidden="true"
            className={`absolute border-[#707070] border-[0.7px] border-solid inset-0 pointer-events-none rounded-[4px] transition-shadow duration-150 ${
              isDragging === "min" || hoveredHandle === "min"
                ? "shadow-[0px_6px_8px_-1px_rgba(10,13,18,0.15),0px_4px_6px_-2px_rgba(10,13,18,0.1)]"
                : "shadow-[0px_4px_6px_-1px_rgba(10,13,18,0.1),0px_2px_4px_-2px_rgba(10,13,18,0.06)]"
            }`}
          />

          {/* Tooltip for min handle */}
          {showTooltip === "min" && (
            <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-black text-white px-2 py-1 rounded text-xs whitespace-nowrap z-10">
              {minValue} {unit}
            </div>
          )}
        </div>

        {/* Max handle (top) */}
        <div
          className={`absolute bg-white h-[9px] rounded-[4px] w-full cursor-grab transition-all duration-150 ${
            isDragging === "max"
              ? "cursor-grabbing scale-110"
              : ""
          } ${hoveredHandle === "max" ? "shadow-lg" : ""}`}
          style={{
            bottom: `calc(${maxPosition * 100}% - 4.5px)`,
            transform:
              isDragging === "max" ? "scale(1.1)" : "scale(1)",
          }}
          onMouseDown={(e) => handleStart(e, "max")}
          onTouchStart={(e) => handleStart(e, "max")}
          onMouseEnter={() => setHoveredHandle("max")}
          onMouseLeave={() => setHoveredHandle(null)}
          data-name="Upper handle thumb"
        >
          <div
            aria-hidden="true"
            className={`absolute border-[#707070] border-[0.7px] border-solid inset-0 pointer-events-none rounded-[4px] transition-shadow duration-150 ${
              isDragging === "max" || hoveredHandle === "max"
                ? "shadow-[0px_6px_8px_-1px_rgba(10,13,18,0.15),0px_4px_6px_-2px_rgba(10,13,18,0.1)]"
                : "shadow-[0px_4px_6px_-1px_rgba(10,13,18,0.1),0px_2px_4px_-2px_rgba(10,13,18,0.06)]"
            }`}
          />

          {/* Tooltip for max handle */}
          {showTooltip === "max" && (
            <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-black text-white px-2 py-1 rounded text-xs whitespace-nowrap z-10">
              {maxValue} {unit}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}