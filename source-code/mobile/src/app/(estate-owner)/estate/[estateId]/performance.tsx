import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { differenceInCalendarDays, format, subDays, subMonths } from "date-fns";
import Svg, { Circle, Line, Polygon, Polyline, Text as SvgText } from "react-native-svg";

import { EstateIcon, EstatePage, estateStyles as ui } from "@/components/estate-owner/EstatePage";
import { AppText } from "@/components/ui";
import { colors } from "@/theme";
import { useSavedEstateWorkers } from "@/data/estateWorkers";
import { useEstateStore } from "@/store/estateStore";

export default function EstatePerformance() {
  const { estateId } = useLocalSearchParams<{ estateId: string }>();
  const estate = useEstateStore((state) => state.estates.find((profile) => profile.id === estateId));
  const records = useEstateStore((state) => state.pluckingByEstate[estateId]);
  const workers = useSavedEstateWorkers(estate?.id);
  const [period, setPeriod] = useState<"week" | "month">("month");
  const [allWorkers, setAllWorkers] = useState(false);
  const [allActivities, setAllActivities] = useState(false);

  if (!estate) {
    return <EstatePage title="Estate performance"><AppText>Estate not found.</AppText></EstatePage>;
  }

  const today = new Date();
  const from = period === "week" ? subDays(today, 6) : subMonths(today, 1);
  const days = differenceInCalendarDays(today, from) + 1;
  const fromFormat = from.getFullYear() === today.getFullYear() ? "d MMM" : "d MMM yyyy";
  const dateRange = `${format(from, fromFormat)} – ${format(today, "d MMM yyyy")}`;
  const rangeRecords = (records ?? []).filter((record) => {
    const age = differenceInCalendarDays(today, record.recordedAt);
    return age >= 0 && age < days;
  });
  const weights = Array<number | null>(days).fill(null);
  const weekly = estate.weeklyPluckedWeightsKg.slice(-7);
  weekly.forEach((weight, index) => {
    if (weight > 0) weights[days - weekly.length + index] = weight;
  });
  const stats = new Map<string, { weight: number; days: Set<string> }>();
  for (const record of rangeRecords) {
    const index = differenceInCalendarDays(record.recordedAt, from);
    weights[index] = (weights[index] ?? 0) + record.weightKg;
    if (record.workerId) {
      const stat = stats.get(record.workerId) ?? { weight: 0, days: new Set<string>() };
      stat.weight += record.weightKg;
      stat.days.add(format(record.recordedAt, "yyyy-MM-dd"));
      stats.set(record.workerId, stat);
    }
  }
  const totalWeight = weights.reduce<number>((total, weight) => total + (weight ?? 0), 0);
  const ranking = (workers ?? []).flatMap((worker) => {
    const stat = stats.get(worker.id);
    return stat ? [{ ...worker, weight: stat.weight, days: stat.days.size, average: stat.weight / stat.days.size }] : [];
  }).sort((a, b) => b.average - a.average);
  const activities = [
    ...rangeRecords.map((record) => ({
      title: "Plucking recorded",
      detail: `${record.weightKg.toLocaleString()} kg`,
      date: format(record.recordedAt, "d MMM"),
      icon: "leaf-outline" as const,
    })),
    ...estate.recentActivities.map((activity) => ({
      title: activity.description,
      detail: activity.factory,
      date: activity.timeAgo,
      icon: "car-outline" as const,
    })),
  ];

  return (
    <EstatePage title="Estate performance">
      <AppText variant="heading" style={ui.bold}>{estate.name}</AppText>
      <View style={styles.period}>
        {(["week", "month"] as const).map((option) => (
          <Pressable key={option} accessibilityRole="button" accessibilityState={{ selected: period === option }}
            style={[ui.action, ui.grow, period !== option && ui.outline]} onPress={() => {
              setPeriod(option);
              setAllWorkers(false);
              setAllActivities(false);
            }}>
            <AppText variant="bodySmall" style={period === option ? ui.white : ui.bold}>{option === "week" ? "7 days" : "1 month"}</AppText>
          </Pressable>
        ))}
      </View>
      <AppText variant="caption" style={[ui.muted, styles.center]}>{dateRange}</AppText>

      <View style={styles.metrics}>
        <View style={[ui.card, styles.metric]}>
          <EstateIcon name="leaf-outline" />
          <View style={ui.grow}>
            <AppText variant="caption">Tea plucked</AppText>
            <AppText variant="sectionHeading" style={ui.bold}>{totalWeight.toLocaleString()} kg</AppText>
          </View>
        </View>
        <View style={[ui.card, styles.metric]}>
          <EstateIcon name="server-outline" />
          <View style={ui.grow}>
            <AppText variant="caption">Revenue earned</AppText>
            <AppText variant="sectionHeading" style={ui.bold}>—</AppText>
            <AppText variant="caption" style={ui.muted}>No revenue data</AppText>
          </View>
        </View>
      </View>

      <View style={[ui.card, styles.chart]}>
        <AppText variant="subHeading" style={ui.bold}>Tea plucking history</AppText>
        <AppText variant="caption" style={ui.muted}>Daily harvest · kg</AppText>
        {totalWeight > 0 ? <HarvestChart weights={weights} from={from} /> : (
          <AppText variant="bodySmall" style={[ui.muted, styles.empty]}>No plucking records in this period.</AppText>
        )}
      </View>

      <View style={ui.section}>
        <View style={ui.row}>
          <View style={ui.grow}>
            <AppText variant="subHeading" style={ui.bold}>Worker performance</AppText>
            <AppText variant="caption" style={ui.muted}>Average kg per recorded working day</AppText>
          </View>
          {ranking.length > 3 && <Pressable accessibilityRole="button" accessibilityState={{ expanded: allWorkers }} onPress={() => setAllWorkers(!allWorkers)} style={styles.link}>
            <AppText variant="bodySmall" style={styles.linkText}>{allWorkers ? "View less" : "View all"}</AppText>
          </Pressable>}
        </View>
        {ranking.length === 0 && <AppText variant="bodySmall" style={ui.muted}>No worker weights recorded in this period.</AppText>}
        {(allWorkers ? ranking : ranking.slice(0, 3)).map((worker) => (
          <View key={worker.id} style={[ui.row, styles.listRow]}>
            <View style={ui.grow}>
              <AppText variant="bodySmall" style={ui.bold}>{worker.name}</AppText>
              <AppText variant="caption" style={ui.muted}>{worker.weight.toLocaleString()} kg · {worker.days} {worker.days === 1 ? "day" : "days"}</AppText>
            </View>
            <View style={styles.track}><View style={[styles.bar, { width: `${worker.average / ranking[0].average * 100}%` }]} /></View>
            <AppText variant="caption">{worker.average.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg/day</AppText>
          </View>
        ))}
      </View>

      <View style={ui.section}>
        <View>
          <AppText variant="subHeading" style={ui.bold}>Recent activities</AppText>
          <AppText variant="caption" style={ui.muted}>{dateRange}</AppText>
        </View>
        {activities.length === 0 && <AppText variant="bodySmall" style={ui.muted}>No recent activities.</AppText>}
        {(allActivities ? activities : activities.slice(0, 3)).map((activity, index) => (
          <View key={index} style={[ui.row, styles.listRow]}>
            <View style={[styles.activityIcon, activity.icon === "car-outline" && styles.collectionIcon]}>
              <EstateIcon name={activity.icon} size={18} />
            </View>
            <View style={ui.grow}>
              <AppText variant="bodySmall" style={ui.bold}>{activity.title}</AppText>
              <AppText variant="caption" style={ui.muted}>{activity.detail}</AppText>
            </View>
            <AppText variant="caption" style={ui.muted}>{activity.date}</AppText>
          </View>
        ))}
        {activities.length > 3 && <Pressable accessibilityRole="button" accessibilityState={{ expanded: allActivities }} onPress={() => setAllActivities(!allActivities)} style={styles.link}>
          <AppText variant="bodySmall" style={[styles.linkText, styles.center]}>{allActivities ? "View fewer activities" : "View all activities"}</AppText>
        </Pressable>}
      </View>
    </EstatePage>
  );
}

function HarvestChart({ weights, from }: { weights: (number | null)[]; from: Date }) {
  const [width, setWidth] = useState(0);
  const top = 14;
  const bottom = 117;
  const left = 35;
  const right = width - 21;
  const max = Math.max(...weights.map((weight) => weight ?? 0));
  const step = Math.ceil(max / 3 / 10) * 10;
  const x = (index: number) => left + (right - left) * index / (weights.length - 1);
  const y = (weight: number) => bottom - (bottom - top) * weight / (step * 3);
  const points = weights.flatMap((weight, index) => weight === null ? [] : [{ x: x(index), y: y(weight), index }]);
  const segments: (typeof points)[] = [];
  for (const point of points) {
    const last = segments.at(-1);
    if (last && last[last.length - 1].index === point.index - 1) last.push(point);
    else segments.push([point]);
  }
  const labelIndices = Array.from({ length: 4 }, (_, index) => Math.round(index * (weights.length - 1) / 3));

  return (
    <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)} style={styles.chartPlot}
      accessible accessibilityLabel="Line chart of daily plucked tea weight in kilograms">
      {width > 70 && <Svg width={width} height={143}>
        {[0, 1, 2, 3].map((tick) => (
          <SvgText key={tick} x={left - 6} y={y(tick * step) + 3} fontSize={10} textAnchor="end" fill={colors.text.secondary}>{tick * step}</SvgText>
        ))}
        {[0, 1, 2, 3].map((tick) => (
          <Line key={tick} x1={left} x2={right} y1={y(tick * step)} y2={y(tick * step)} stroke={colors.border.light} />
        ))}
        {segments.map((segment) => {
          const line = segment.map((point) => `${point.x},${point.y}`).join(" ");
          return <Polygon key={segment[0].index} points={`${segment[0].x},${bottom} ${line} ${segment[segment.length - 1].x},${bottom}`} fill={colors.successBackground} />;
        })}
        <Line x1={left} x2={left} y1={top} y2={bottom} stroke={colors.border.default} />
        {segments.map((segment) => <Polyline key={segment[0].index} points={segment.map((point) => `${point.x},${point.y}`).join(" ")} stroke={colors.brandDark} strokeWidth={2} fill="none" />)}
        {points.map((point) => <Circle key={point.index} cx={point.x} cy={point.y} r={3} fill={colors.brandDark} />)}
        {labelIndices.map((index) => <SvgText key={index} x={x(index)} y={135} fontSize={10} textAnchor="middle" fill={colors.text.secondary}>
          {format(subDays(from, -index), "d MMM")}
        </SvgText>)}
      </Svg>}
    </View>
  );
}

const styles = StyleSheet.create({
  period: { flexDirection: "row", gap: 5 },
  center: { textAlign: "center" },
  metrics: { flexDirection: "row", gap: 8, marginTop: 8 },
  metric: { flex: 1, flexDirection: "row", alignItems: "flex-start", gap: 7 },
  chart: { marginTop: 5 },
  chartPlot: { minHeight: 143, marginTop: 8 },
  empty: { paddingVertical: 20 },
  listRow: { paddingVertical: 7, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border.light },
  link: { minHeight: 44, justifyContent: "center", paddingHorizontal: 5 },
  linkText: { color: colors.brandDark, fontWeight: "600" },
  track: { width: "29%", height: 8, borderRadius: 4, backgroundColor: colors.border.light, overflow: "hidden" },
  bar: { height: "100%", backgroundColor: colors.brandDark, borderRadius: 4 },
  activityIcon: { width: 35, height: 35, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: colors.brandSurface },
  collectionIcon: { backgroundColor: colors.backgroundGray },
});
