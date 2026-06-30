"use client";

import * as React from "react";
import { format, parse, isValid } from "date-fns";
import { CalendarIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";

interface DatePickerProps {
  value?: string;           // "yyyy-MM-dd" or ""
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  clearable?: boolean;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Pick date",
  className,
  clearable = true,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  const date = value
    ? parse(value, "yyyy-MM-dd", new Date())
    : undefined;

  const valid = date && isValid(date);

  function handleSelect(d: Date | undefined) {
    onChange(d ? format(d, "yyyy-MM-dd") : "");
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-9 justify-start gap-2 px-3 font-normal text-sm",
            !valid && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1 text-left">
            {valid ? format(date!, "dd MMM yyyy") : placeholder}
          </span>
          {clearable && valid && (
            <X
              className="h-3 w-3 shrink-0 opacity-50 hover:opacity-100"
              onClick={(e) => { e.stopPropagation(); onChange(""); }}
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={valid ? date : undefined}
          onSelect={handleSelect}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
