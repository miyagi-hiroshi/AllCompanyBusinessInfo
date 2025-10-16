import React from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ChartData {
  name: string;
  予算: number;
  実績: number;
}

interface DashboardChartProps {
  data: ChartData[];
  title: string;
  className?: string;
}

export function DashboardChart({ data, title, className = "" }: DashboardChartProps) {
  // 数値フォーマット関数
  const formatCurrency = (value: number) => {
    return `¥${value.toLocaleString()}`;
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis tickFormatter={formatCurrency} />
              <Tooltip 
                formatter={(value: number) => [formatCurrency(value), '']}
                labelFormatter={(label) => `${label}`}
              />
              <Legend />
              <Bar dataKey="予算" fill="#3b82f6" name="予算" />
              <Bar dataKey="実績" fill="#10b981" name="実績" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
