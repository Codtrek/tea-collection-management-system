import { useState } from "react";
import type { LayoutChangeEvent } from "react-native";
import { View } from "react-native";
import { BarChart } from "react-native-chart-kit";

import AppText from "@/components/ui/AppText";
import { colors, spacing } from "@/theme";

interface WeeklyPluckedWeightChartProps {
  weightsKg: number[];
}

function getLastSevenDays() {
  const today = new Date();

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - index));

    return date.toLocaleDateString("en", { weekday: "short" });
  });
}

export default function WeeklyPluckedWeightChart({
  weightsKg,
}: WeeklyPluckedWeightChartProps) {
  const [chartWidth, setChartWidth] = useState(0);
  const dailyWeights = weightsKg.slice(-7);
  const days = getLastSevenDays().slice(-dailyWeights.length);
  const totalWeight = dailyWeights.reduce((total, weight) => total + weight, 0);

  const measureChart = (event: LayoutChangeEvent) => {
    setChartWidth(Math.floor(event.nativeEvent.layout.width));
  };

  return (
    <View onLayout={measureChart} style={{ width: "100%" }}>
      <AppText variant="bodySmall" style={{ color: colors.text.secondary }}>
        {totalWeight.toLocaleString()} kg collected
      </AppText>
      {chartWidth > 0 && dailyWeights.length > 0 ? (
        <BarChart
          data={{
            labels: days,
            datasets: [{ data: dailyWeights }],
          }}
          width={chartWidth}
          height={210}
          fromZero
          withInnerLines
          withVerticalLabels
          withHorizontalLabels
          showBarTops={false}
          yAxisLabel=""
          yAxisSuffix=" kg"
          segments={4}
          chartConfig={{
            backgroundColor: colors.white,
            backgroundGradientFrom: colors.white,
            backgroundGradientTo: colors.white,
            fillShadowGradient: colors.primary,
            fillShadowGradientOpacity: 0.82,
            color: (opacity = 1) => `rgba(27, 139, 78, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
            propsForBackgroundLines: {
              stroke: colors.border.light,
              strokeDasharray: "4 6",
            },
            propsForLabels: {
              fontSize: 10,
            },
            barPercentage: 0.48,
            barRadius: 5,
            decimalPlaces: 0,
          }}
          style={{ marginTop: spacing.xs, alignSelf: "center" }}
        />
      ) : null}
    </View>
  );
}
