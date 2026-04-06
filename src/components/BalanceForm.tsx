import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { X, Upload, Calendar as CalendarIcon, JapaneseYen, Tag, FileText } from 'lucide-react-native';
import { GamblingType } from '../types';
import { colors } from '../theme';
import type { RootStackParamList } from '../navigation/types';

export interface BalanceFormSavePayload {
  date: string;
  type: GamblingType;
  investment: number;
  return: number;
  balance: number;
  memo: string;
  photoUri?: string | null;
}

interface BalanceFormProps {
  onSave: (data: BalanceFormSavePayload) => void | Promise<void>;
  onCancel: () => void;
  initialData?: Partial<BalanceFormSavePayload & { photoURL?: string }>;
}

const BalanceForm: React.FC<BalanceFormProps> = ({ onSave, onCancel, initialData }) => {
  const route = useRoute<RouteProp<RootStackParamList, 'Add'>>();
  const stateDate = route.params?.date;

  const [date, setDate] = useState(() => {
    if (initialData?.date) return initialData.date;
    if (stateDate) return stateDate;
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });
  const [type, setType] = useState<GamblingType>(initialData?.type || 'pachinko');
  const [investment, setInvestment] = useState<string>(initialData?.investment?.toString() || '');
  const [returnAmount, setReturnAmount] = useState<string>(
    initialData?.return != null ? String(initialData.return) : '',
  );
  const [memo, setMemo] = useState(initialData?.memo || '');
  const [photoUri, setPhotoUri] = useState<string | null>(initialData?.photoURL || null);

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleSubmit = () => {
    const inv = investment === '' ? 0 : Number(investment);
    const ret = returnAmount === '' ? 0 : Number(returnAmount);
    void onSave({
      date,
      type,
      investment: inv,
      return: ret,
      balance: ret - inv,
      memo,
      photoUri,
    });
  };

  const gamblingTypes: { value: GamblingType; label: string }[] = [
    { value: 'pachinko', label: 'パチンコ' },
    { value: 'pachislot', label: 'パチスロ' },
    { value: 'horse-racing', label: '競馬' },
    { value: 'boat-racing', label: '競艇' },
    { value: 'bicycle-racing', label: '競輪' },
    { value: 'casino', label: 'カジノ' },
    { value: 'other', label: 'その他' },
  ];

  const balancePreview = (returnAmount === '' ? 0 : Number(returnAmount)) - (investment === '' ? 0 : Number(investment));

  return (
    <View style={[styles.card, { marginTop: -16 }]}>
      <View style={styles.toolbar}>
        <TouchableOpacity onPress={onCancel} hitSlop={12} accessibilityLabel="キャンセル">
          <X color={colors.gray400} size={24} />
        </TouchableOpacity>
        <Text style={styles.toolbarTitle}>{initialData ? '収支を編集' : '収支を記録'}</Text>
        <TouchableOpacity style={styles.saveChip} onPress={handleSubmit}>
          <Text style={styles.saveChipText}>保存</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.form} contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
        <View style={styles.field}>
          <View style={styles.labelRow}>
            <CalendarIcon color={colors.indigo600} size={16} />
            <Text style={styles.label}>日付 (YYYY-MM-DD)</Text>
          </View>
          <TextInput
            style={styles.input}
            value={date}
            onChangeText={setDate}
            placeholder="2026-04-05"
            placeholderTextColor={colors.gray400}
          />
        </View>

        <View style={styles.field}>
          <View style={styles.labelRow}>
            <Tag color={colors.indigo600} size={16} />
            <Text style={styles.label}>種別</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScroll}>
            <View style={styles.typeRow}>
              {gamblingTypes.map((t) => (
                <TouchableOpacity
                  key={t.value}
                  style={[styles.typeChip, type === t.value && styles.typeChipOn]}
                  onPress={() => setType(t.value)}
                >
                  <Text style={[styles.typeChipText, type === t.value && styles.typeChipTextOn]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        <View style={styles.field}>
          <View style={styles.labelRow}>
            <JapaneseYen color={colors.indigo600} size={16} />
            <Text style={styles.label}>投資額 (¥)</Text>
          </View>
          <TextInput
            style={styles.input}
            value={investment}
            onChangeText={setInvestment}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={colors.gray400}
          />
        </View>

        <View style={styles.field}>
          <View style={styles.labelRow}>
            <JapaneseYen color={colors.indigo600} size={16} />
            <Text style={styles.label}>回収額 (¥)</Text>
          </View>
          <TextInput
            style={styles.input}
            value={returnAmount}
            onChangeText={setReturnAmount}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={colors.gray400}
          />
        </View>

        <View style={styles.field}>
          <View style={styles.labelRow}>
            <FileText color={colors.indigo600} size={16} />
            <Text style={styles.label}>メモ</Text>
          </View>
          <TextInput
            style={[styles.input, styles.memo]}
            value={memo}
            onChangeText={setMemo}
            placeholder="台番号、回転数、感想など..."
            placeholderTextColor={colors.gray400}
            multiline
            textAlignVertical="top"
          />
        </View>

        <View style={styles.field}>
          <View style={styles.labelRow}>
            <Upload color={colors.indigo600} size={16} />
            <Text style={styles.label}>写真</Text>
          </View>
          <TouchableOpacity style={styles.uploadZone} onPress={pickImage} activeOpacity={0.85}>
            {photoUri ? (
              <View style={styles.previewWrap}>
                <Image source={{ uri: photoUri }} style={styles.preview} />
                <TouchableOpacity style={styles.removePhoto} onPress={() => setPhotoUri(null)}>
                  <X color={colors.white} size={16} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.uploadPlaceholder}>
                <Upload color={colors.gray400} size={32} />
                <Text style={styles.uploadHint}>タップして画像を選択</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={[styles.previewBalance, balancePreview >= 0 ? styles.previewPos : styles.previewNeg]}>
          <Text style={styles.previewLabel}>収支合計</Text>
          <Text style={[styles.previewAmount, balancePreview >= 0 ? styles.textPos : styles.textNeg]}>
            {balancePreview.toLocaleString()} 円
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.gray200,
    overflow: 'hidden',
    maxHeight: Platform.OS === 'web' ? undefined : '100%',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
    backgroundColor: colors.white,
  },
  toolbarTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.gray900,
    letterSpacing: 2,
  },
  saveChip: {
    backgroundColor: colors.indigo600,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 12,
  },
  saveChipText: { color: colors.white, fontWeight: '800', fontSize: 12 },
  form: { maxHeight: 520 },
  formContent: { padding: 20, paddingBottom: 40, gap: 18 },
  field: { gap: 8 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { fontSize: 14, fontWeight: '600', color: colors.gray700 },
  input: {
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.gray900,
    backgroundColor: colors.white,
  },
  memo: { minHeight: 120 },
  typeScroll: { marginHorizontal: -4 },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 4 },
  typeChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gray200,
    backgroundColor: colors.white,
  },
  typeChipOn: { backgroundColor: colors.indigo600, borderColor: colors.indigo600 },
  typeChipText: { fontWeight: '700', color: colors.gray600, fontSize: 13 },
  typeChipTextOn: { color: colors.white },
  uploadZone: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.gray200,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    minHeight: 140,
    justifyContent: 'center',
  },
  uploadPlaceholder: { alignItems: 'center', gap: 8 },
  uploadHint: { color: colors.gray500, fontSize: 14 },
  previewWrap: { position: 'relative', alignSelf: 'center' },
  preview: { width: 280, height: 180, borderRadius: 12 },
  removePhoto: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: colors.red500,
    borderRadius: 999,
    padding: 6,
  },
  previewBalance: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    marginTop: 8,
  },
  previewPos: { backgroundColor: colors.green50 },
  previewNeg: { backgroundColor: colors.red50 },
  previewLabel: { fontWeight: '700', color: colors.gray700 },
  previewAmount: { fontSize: 22, fontWeight: '900' },
  textPos: { color: colors.green700 },
  textNeg: { color: colors.red600 },
});

export default BalanceForm;
