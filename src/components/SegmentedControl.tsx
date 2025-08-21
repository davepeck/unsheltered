import clsx from "clsx";

export interface SegmentedControlProps {
  segments: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  className?: string;
}

const SegmentedControl: React.FC<SegmentedControlProps> = ({
  segments,
  selectedIndex,
  onSelect,
  className,
}) => {
  return (
    <div className={clsx("not-pros flex rounded-md shadow-sm", className)}>
      {segments.map((segment, index) => (
        <button
          type="button"
          key={segment}
          className={clsx(
            index === 0 && "rounded-l-md",
            index === segments.length - 1 && "rounded-r-md",
            index > 0 && "-ml-px",
            "flex-1",
            "px-3 py-2",
            "text-sm font-semibold",
            "ring-1 ring-inset ring-gray-300",
            "focus:z0-10",
            "transition-colors duration-300",
            "cursor-pointer",
            index === selectedIndex
              ? "bg-blue-500 hover:bg-blue-400 text-white"
              : "bg-white hover:bg-gray-200  text-gray-900"
          )}
          onClick={() => onSelect(index)}
        >
          {segment}
        </button>
      ))}
    </div>
  );
};

export default SegmentedControl;
