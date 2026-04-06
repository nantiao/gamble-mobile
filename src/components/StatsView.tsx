import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { BalanceEntry, GamblingType } from '../types';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth } from 'date-fns';
import { JapaneseYen, TrendingUp, TrendingDown, Target, Calendar, X } from 'lucide-react-native';
import { colors } from '../theme';

const TYPE_LABELS: Record<GamblingType, string> = {
  pachinko: 'パチンコ',
  pachislot: 'パチスロ',
  'horse-racing': '競馬',
  'boat-racing': '競艇',
  'bicycle-racing': '競輪',
  casino: 'カジノ',
  other: 'その他',
};

interface StatsViewProps {
  entries: BalanceEntry[];
}

const screenW = Dimensions.get('window').width;
const chartInnerW = Math.min(screenW - 64, 400);

const StatsView: React.FC<StatsViewProps> = ({ entries }) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const totalInvestment = entries.reduce((sum, e) => sum + e.investment, 0);
  const totalReturn = entries.reduce((sum, e) => sum + e.return, 0);
  const totalBalance = totalReturn - totalInvestment;
  const winRate =
    entries.length > 0 ? ((entries.filter((e) => e.balance > 0).length / entries.length) * 100).toFixed(1) : '0';

  const availableMonths = useMemo(() => {
    const months = entries.reduce((acc: string[], entry) => {
      const month = format(parseISO(entry.date), 'yyyy-MM');
      if (!acc.includes(month)) acc.push(month);
      return acc;
    }, []);
    const currentMonth = format(new Date(), 'yyyy-MM');
    if (!months.includes(currentMonth)) months.push(currentMonth);
    return months.sort((a, b) => b.localeCompare(a));
  }, [entries]);

  const dailyData = useMemo(() => {
    const start = startOfMonth(selectedMonth);
    const end = endOfMonth(selectedMonth);
    const days = eachDayOfInterval({ start, end });
    let cumulativeBalance = 0;
    return days.map((day) => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const dayEntries = entries.filter((e) => e.date === dateStr);
      const dayBalance = dayEntries.reduce((sum, e) => sum + e.balance, 0);
      cumulativeBalance += dayBalance;
      return {
        date: format(day, 'd'),
        fullDate: dateStr,
        balance: dayBalance,
        cumulative: cumulativeBalance,
      };
    });
  }, [entries, selectedMonth]);

  const typeData = useMemo(() => {
    const filteredEntries = entries.filter((e) => isSameMonth(parseISO(e.date), selectedMonth));
    const stats: Record<string, { balance: number; count: number }> = filteredEntries.reduce(
      (acc, entry) => {
        if (!acc[entry.type]) acc[entry.type] = { balance: 0, count: 0 };
        acc[entry.type].balance += entry.balance;
        acc[entry.type].count += 1;
        return acc;
      },
      {} as Record<string, { balance: number; count: number }>,
    );
    return Object.entries(stats)
      .map(([type, data]) => ({ name: type, value: data.balance, count: data.count }))
      .sort((a, b) => b.count - a.count);
  }, [entries, selectedMonth]);

  const maxAbs = Math.max(1, ...dailyData.map((d) => Math.abs(d.balance)));
  const barSlotW = chartInnerW / Math.max(dailyData.length, 1);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.summaryGrid}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryLabelRow}>
            <JapaneseYen color={colors.gray500} size={14} />
            <Text style={styles.summaryLabel}>総収支</Text>
          </View>
          <Text style={[styles.summaryValue, totalBalance >= 0 ? styles.pos : styles.neg]}>
            {totalBalance > 0 ? '+' : ''}
            {totalBalance.toLocaleString()}円
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <View style={styles.summaryLabelRow}>
            <TrendingUp color={colors.gray500} size={14} />
            <Text style={styles.summaryLabel}>勝率</Text>
          </View>
          <Text style={[styles.summaryValue, { color: colors.indigo600 }]}>{winRate}%</Text>
        </View>
        <View style={styles.summaryCard}>
          <View style={styles.summaryLabelRow}>
            <TrendingDown color={colors.gray500} size={14} />
            <Text style={styles.summaryLabel}>総投資</Text>
          </View>
          <Text style={styles.summaryValue}>{totalInvestment.toLocaleString()}円</Text>
        </View>
        <View style={styles.summaryCard}>
          <View style={styles.summaryLabelRow}>
            <Target color={colors.gray500} size={14} />
            <Text style={styles.summaryLabel}>総回収</Text>
          </View>
          <Text style={styles.summaryValue}>{totalReturn.toLocaleString()}円</Text>
        </View>
      </View>

      <View style={styles.panel}>
        <View style={styles.panelHeader}>
          <Text style={styles.panelTitle}>日別収支推移</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.monthPicker}>
            {availableMonths.map((m) => (
              <TouchableOpacity
                key={m}
                style={[
                  styles.monthChip,
                  format(selectedMonth, 'yyyy-MM') === m && styles.monthChipOn,
                ]}
                onPress={() => {
                  setSelectedMonth(parseISO(`${m}-01`));
                  setActiveIndex(null);
                }}
              >
                <Calendar color={colors.gray500} size={12} />
                <Text style={[styles.monthChipText, format(selectedMonth, 'yyyy-MM') === m && styles.monthChipTextOn]}>
                  {m.replace('-', '年')}月
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <TouchableOpacity activeOpacity={1} onPress={() => setActiveIndex(null)} style={styles.chartArea}>
          <View style={styles.barsRow}>
            {dailyData.map((d, index) => {
              const h = (Math.abs(d.balance) / maxAbs) * 120;
              const isSelected = activeIndex === index;
              const fill =
                d.balance >= 0
                  ? isSelected
                    ? '#064e3b'
                    : colors.green600
                  : isSelected
                    ? '#7f1d1d'
                    : colors.red600;
              return (
                <TouchableOpacity
                  key={d.fullDate}
                  style={[styles.barCol, { width: barSlotW }]}
                  onPress={() => setActiveIndex(index)}
                  activeOpacity={0.85}
                >
                  <View style={styles.barTrack}>
                    <View style={[styles.bar, { height: Math.max(h, 2), backgroundColor: fill }]} />
                  </View>
                  {Number(d.date) % 3 === 1 && <Text style={styles.barTick}>{d.date}</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>

        {activeIndex !== null && dailyData[activeIndex] && (
          <View style={styles.selectionBanner}>
            <View>
              <Text style={styles.selectionHint}>選択中のデータ</Text>
              <Text style={styles.selectionDate}>
                {format(selectedMonth, 'yyyy年MM月')}
                {dailyData[activeIndex].date}日
              </Text>
            </View>
            <Text
              style={[
                styles.selectionAmount,
                dailyData[activeIndex].balance >= 0 ? styles.pos : styles.neg,
              ]}
            >
              {dailyData[activeIndex].balance > 0 ? '+' : ''}
              {dailyData[activeIndex].balance.toLocaleString()}円
            </Text>
            <TouchableOpacity onPress={() => setActiveIndex(null)} hitSlop={10}>
              <X color={colors.indigo600} size={20} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>種別ごとの収支</Text>
        <View style={styles.typeList}>
          {typeData.map((item) => (
            <View key={item.name} style={styles.typeRow}>
              <Text style={styles.typeName}>{TYPE_LABELS[item.name as GamblingType]}</Text>
              <Text style={[styles.typeVal, item.value >= 0 ? styles.pos : styles.neg]}>
                {item.value > 0 ? '+' : ''}
                {item.value.toLocaleString()}円
              </Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 32, gap: 20 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  summaryCard: {
    flexGrow: 1,
    minWidth: '45%',
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.gray200,
    padding: 16,
  },
  summaryLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  summaryLabel: { fontSize: 12, color: colors.gray500, fontWeight: '600' },
  summaryValue: { fontSize: 20, fontWeight: '900', color: colors.gray900 },
  pos: { color: colors.green600 },
  neg: { color: colors.red600 },
  panel: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.gray200,
    padding: 20,
    gap: 12,
  },
  panelHeader: { gap: 12 },
  panelTitle: { fontSize: 17, fontWeight: '800', color: colors.gray900 },
  monthPicker: { flexGrow: 0 },
  monthChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gray200,
    marginRight: 8,
    backgroundColor: colors.gray50,
  },
  monthChipOn: { borderColor: colors.indigo600, backgroundColor: colors.indigo50 },
  monthChipText: { fontSize: 12, fontWeight: '700', color: colors.gray700 },
  monthChipTextOn: { color: colors.indigo600 },
  chartArea: { marginTop: 8 },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 150,
    width: chartInnerW,
    alignSelf: 'center',
  },
  barCol: { alignItems: 'center' },
  barTrack: {
    height: 120,
    width: '70%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: { width: '100%', borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  barTick: { fontSize: 9, color: colors.gray400, marginTop: 4 },
  selectionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.indigo50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.indigo100,
    padding: 14,
    marginTop: 8,
    gap: 8,
  },
  selectionHint: { fontSize: 10, fontWeight: '800', color: colors.indigo600, textTransform: 'uppercase' },
  selectionDate: { fontSize: 14, fontWeight: '700', color: colors.gray700, marginTop: 2 },
  selectionAmount: { fontSize: 18, fontWeight: '900', flex: 1, textAlign: 'right', marginRight: 8 },
  typeList: { gap: 10, marginTop: 8 },
  typeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.gray50,
    borderRadius: 12,
  },
  typeName: { fontSize: 14, fontWeight: '600', color: colors.gray600 },
  typeVal: { fontSize: 14, fontWeight: '800' },
});

export default StatsView;
