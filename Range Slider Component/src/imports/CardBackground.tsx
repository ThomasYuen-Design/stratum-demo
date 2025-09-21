function TrackProgress() {
  return (
    <div className="absolute bg-gradient-to-r box-border content-stretch flex flex-col from-[rgba(255,255,255,0.83)] h-[151px] items-center justify-between left-px p-px rounded-[4.5px] to-[rgba(229,229,229,0.83)] top-[95px] w-[22px]" data-name="track progress">
      <div className="bg-white h-[9px] relative rounded-[4px] shrink-0 w-full" data-name="Upper handle thumb">
        <div aria-hidden="true" className="absolute border-[#707070] border-[0.7px] border-solid inset-0 pointer-events-none rounded-[4px] shadow-[0px_4px_6px_-1px_rgba(10,13,18,0.1),0px_2px_4px_-2px_rgba(10,13,18,0.06)]" />
      </div>
      <div className="bg-white h-[9px] relative rounded-[4px] shrink-0 w-full" data-name="Lower handle thumb">
        <div aria-hidden="true" className="absolute border-[#707070] border-[0.7px] border-solid inset-0 pointer-events-none rounded-[4px] shadow-[0px_4px_6px_-1px_rgba(10,13,18,0.1),0px_2px_4px_-2px_rgba(10,13,18,0.06)]" />
      </div>
    </div>
  );
}

function Slider() {
  return (
    <div className="h-[248px] relative shrink-0 w-[24px]" data-name="Slider">
      <div className="absolute flex h-[248px] items-center justify-center left-0 right-0 top-0">
        <div className="flex-none h-[24px] rotate-[90deg] w-[248px]">
          <div className="bg-gradient-to-l from-[#545454] rounded-[6px] size-full to-[#767676]" data-name="Slider-background" />
        </div>
      </div>
      <TrackProgress />
    </div>
  );
}

function SlideNumbers() {
  return (
    <div className="content-stretch flex flex-col gap-[4px] items-center relative shrink-0" data-name="Slide + numbers">
      <div className="font-['Inter:Light',_sans-serif] font-light leading-[0] not-italic opacity-[0.56] relative shrink-0 text-[10px] text-center text-nowrap text-white tracking-[-0.5px]">
        <p className="leading-[normal] whitespace-pre">500 m</p>
      </div>
      <Slider />
      <div className="font-['Inter:Light',_sans-serif] font-light leading-[0] not-italic opacity-[0.56] relative shrink-0 text-[10px] text-center text-nowrap text-white tracking-[-0.5px]">
        <p className="leading-[normal] whitespace-pre">1500 m</p>
      </div>
    </div>
  );
}

export default function CardBackground() {
  return (
    <div className="backdrop-blur-sm backdrop-filter bg-[rgba(75,75,75,0.7)] relative rounded-[12px] size-full" data-name="Card-background">
      <div className="flex flex-col items-center justify-center relative size-full">
        <div className="box-border content-stretch flex flex-col gap-[10px] items-center justify-center overflow-clip px-[12px] py-[8px] relative size-full">
          <SlideNumbers />
        </div>
      </div>
      <div aria-hidden="true" className="absolute border border-[#646464] border-solid inset-0 pointer-events-none rounded-[12px]" />
    </div>
  );
}