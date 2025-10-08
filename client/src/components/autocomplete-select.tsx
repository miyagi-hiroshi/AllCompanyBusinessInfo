import { Check, ChevronsUpDown } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface AutocompleteOption {
  value: string;
  label: string;
  code?: string;
}

interface AutocompleteSelectProps {
  value?: string;
  onChange: (value: string, option: AutocompleteOption) => void;
  options: AutocompleteOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
  testId?: string;
}

export function AutocompleteSelect({
  value,
  onChange,
  options,
  placeholder = "選択してください",
  searchPlaceholder = "検索...",
  emptyText = "見つかりません",
  disabled = false,
  className,
  testId,
}: AutocompleteSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const selectedOption = options.find((option) => option.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("w-full justify-between", className)}
          data-testid={testId}
        >
          <span className="truncate">
            {selectedOption ? (
              <span>
                {selectedOption.code && (
                  <span className="text-muted-foreground mr-2">{selectedOption.code}</span>
                )}
                {selectedOption.label}
              </span>
            ) : (
              placeholder
            )}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0">
        <Command>
          <CommandInput
            placeholder={searchPlaceholder}
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label + " " + (option.code || "")}
                  onSelect={() => {
                    onChange(option.value, option);
                    setOpen(false);
                    setSearchValue("");
                  }}
                  data-testid={`option-${option.value}`}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex items-center gap-2 flex-1">
                    {option.code && (
                      <span className="text-muted-foreground font-mono text-xs">{option.code}</span>
                    )}
                    <span className="truncate">{option.label}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
