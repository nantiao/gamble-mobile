import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { format, addMonths, subMonths } from 'date-fns';
import { BalanceEntry, GamblingType } from '../types';
import { colors } from '../theme';

LocaleConfig.locales.ja = {
  monthNames: [
    '1月',
    '2月',
    '3月',
    '4月',
    '5月',
    '6月',
    '7月',
    '8月',
    '9月',
    '10月',
    '11月',
    '12月',
  ],
  monthNamesShort: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
  dayNames: ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'],
  dayNamesShort: ['日', '月', '火', '水', '木', '金', '土'],
  today: '今日',
};
LocaleConfig.defaultLocale = 'ja';

const GAMBLING_TYPE_LABELS: Record<GamblingType, string> = {
  pachinko: 'パチンコ',
  pachislot: 'パチスロ',
  'horse-racing': '競馬',
  'boat-racing': '競艇',
  'bicycle-racing': '競輪',
  casino: 'カジノ',
  other: 'その他',
};

interface CalendarViewProps {
  entries: BalanceEntry[];
  onDateClick: (date: Date) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ entries, onDateClick }) => {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [currentMonth, setCurrentMonth] = useState(format(new Date(), 'yyyy-MM'));

  const getEntryForDate = (dateStr: string) => entries.filter((e) => e.date === dateStr);

  const markedDates = useMemo(() => {
    const marks: Record<string, object> = {};
    const byDay = new Map<string, number>();
    entries.forEach((e) => {
      byDay.set(e.date, (byDay.get(e.date) || 0) + e.balance);
    });
    byDay.forEach((total, day) => {
      marks[day] = {
        marked: true,
        dotColor: total >= 0 ? colors.green600 : colors.red600,
      };
    });
    marks[selectedDate] = {
      ...(marks[selectedDate] || {}),
      selected: true,
      selectedColor: colors.indigo600,
    };
    return marks;
  }, [entries, selectedDate]);

  const selectedEntries = getEntryForDate(selectedDate);
  const selectedTotal = selectedEntries.reduce((sum, e) => sum + e.balance, 0);

  const monthDate = new Date(`${currentMonth}-01T12:00:00`);

  return (
    <View style={styles.wrap}>
      <View style={styles.monthNav}>
        <TouchableOpacity
          style={styles.monthBtn}
          onPress={() => setCurrentMonth(format(subMonths(monthDate, 1), 'yyyy-MM'))}
        >
          <Text style={styles.monthBtnText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{format(monthDate, 'yyyy年MM月')}</Text>
        <TouchableOpacity
          style={styles.monthBtn}
          onPress={() => setCurrentMonth(format(addMonths(monthDate, 1), 'yyyy-MM'))}
        >
          <Text style={styles.monthBtnText}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.calCard}>
        <Calendar
          key={currentMonth}
          current={`${currentMonth}-01`}
          markedDates={markedDates}
          onDayPress={(d) => {
            const ds = d.dateString;
            setSelectedDate(ds);
            const [y, m, day] = ds.split('-').map(Number);
            onDateClick(new Date(y, m - 1, day));
          }}
          theme={{
            todayTextColor: colors.indigo600,
            selectedDayBackgroundColor: colors.indigo600,
            arrowColor: colors.indigo600,
            monthTextColor: colors.gray900,
            textMonthFontWeight: '800',
            textDayFontSize: 15,
            textMonthFontSize: 18,
          }}
          hideExtraDays
          enableSwipeMonths={false}
          renderHeader={() => null}
        />
      </View>

      <View style={styles.detailCard}>
        <View style={styles.detailHeader}>
          <Text style={styles.detailTitle}>{selectedDate.replace(/-/g, '/')}</Text>
          <Text
            style={[
              styles.detailTotal,
              selectedTotal > 0 ? styles.pos : selectedTotal < 0 ? styles.neg : { color: colors.gray900 },
            ]}
          >
            {selectedTotal > 0 ? '+' : ''}
            {selectedTotal.toLocaleString()}円
          </Text>
        </View>
        {selectedEntries.length > 0 ? (
          selectedEntries.map((entry, index) => (
            <View key={`${entry.id}-${index}`} style={styles.row}>
              <Text style={styles.rowLabel}>{GAMBLING_TYPE_LABELS[entry.type] || entry.type}</Text>
              <Text style={[styles.rowValue, entry.balance >= 0 ? styles.pos : styles.neg]}>
                {entry.balance > 0 ? '+' : ''}
                {entry.balance.toLocaleString()}円
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.empty}>記録はありません</Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { gap: 16 },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  monthBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthBtnText: { fontSize: 22, color: colors.indigo600, fontWeight: '700' },
  monthLabel: { fontSize: 17, fontWeight: '800', color: colors.gray900 },
  calCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.gray200,
    overflow: 'hidden',
    paddingBottom: 8,
  },
  detailCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.gray200,
    padding: 20,
    gap: 12,
  },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  detailTitle: { fontSize: 17, fontWeight: '800', color: colors.gray900 },
  detailTotal: { fontSize: 20, fontWeight: '900' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    backgroundColor: colors.gray50,
    borderRadius: 12,
  },
  rowLabel: { fontWeight: '600', color: colors.gray700 },
  rowValue: { fontWeight: '800' },
  pos: { color: colors.green600 },
  neg: { color: colors.red600 },
  empty: { textAlign: 'center', color: colors.gray500, paddingVertical: 16 },
});

export default CalendarView;
