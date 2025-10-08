import { Calendar } from "lucide-react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PeriodSelectorProps {
  value: string;
  onChange: (value: string) => void;
  periods?: string[];
}

// Generate last 12 months in YYYY-MM format
function generatePeriods(): string[] {
  const periods: string[] = [];
  const now = new Date();
  
  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    periods.push(period);
  }
  
  return periods;
}

function formatPeriod(period: string): string {
  const [year, month] = period.split("-");
  return `${year}年${month}月`;
}

export function PeriodSelector({ value, onChange, periods = generatePeriods() }: PeriodSelectorProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[200px]" data-testid="select-period">
        <Calendar className="mr-2 h-4 w-4" />
        <SelectValue placeholder="期間を選択" />
      </SelectTrigger>
      <SelectContent>
        {periods.map((period) => (
          <SelectItem key={period} value={period} data-testid={`option-period-${period}`}>
            {formatPeriod(period)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
