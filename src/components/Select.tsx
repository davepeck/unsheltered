import { ChevronDownIcon } from "@heroicons/react/16/solid";
import clsx from "clsx";

export interface SelectProps {
  title: string;
  options: (string | number)[];
  onSelect: (index: number) => void;
  selectedIndex?: number;
  className?: string;
}

const Select: React.FC<SelectProps> = ({
  title,
  options,
  onSelect,
  selectedIndex,
  className,
}) => {
  return (
    <div className={clsx("not-prose", className)}>
      <label
        htmlFor={title}
        className="block text-sm/6 font-bold text-gray-900"
      >
        {title}
      </label>
      <div className="mt-2 grid grid-cols-1">
        <select
          id={title}
          name={title}
          defaultValue={options[selectedIndex ?? 0]}
          className={clsx(
            "col-start-1 row-start-1",
            "w-full appearance-none rounded-md",
            "bg-white py-1.5 pl-3 pr-8",
            "text-base text-gray-900",
            "outline-1 -outline-offset-1 outline-gray-300",
            "focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600",
            "sm:text-sm/6"
          )}
          onChange={(e) => onSelect(e.target.selectedIndex)}
        >
          {options.map((option, index) => (
            <option key={index} value={option}>
              {option}
            </option>
          ))}
        </select>
        <ChevronDownIcon
          aria-hidden="true"
          className="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end text-gray-500 sm:size-4"
        />
      </div>
    </div>
  );
};

export default Select;
