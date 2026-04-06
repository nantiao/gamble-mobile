import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Share,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Heart, MessageCircle, Share2, MoreHorizontal, Calendar as CalendarIcon, Tag } from 'lucide-react-native';
import { BalanceEntry, UserProfile } from '../types';
import { format, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';
import { colors } from '../theme';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface FeedViewProps {
  entries: (BalanceEntry & { user: UserProfile; likesCount: number; commentsCount: number })[];
  followingIds: string[];
  currentUserId: string;
  likedEntryIds: string[];
  onLike: (entryId: string) => void;
  onComment: (entryId: string) => void;
}

const gamblingTypeMap: Record<string, string> = {
  pachinko: 'パチンコ',
  pachislot: 'パチスロ',
  'horse-racing': '競馬',
  'boat-racing': '競艇',
  'bicycle-racing': '競輪',
  casino: 'カジノ',
  other: 'その他',
};

const avatarUri = (uid: string, photoURL?: string) =>
  photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${uid}`;

const FeedView: React.FC<FeedViewProps> = ({
  entries,
  followingIds,
  currentUserId: _currentUserId,
  likedEntryIds,
  onLike,
  onComment,
}) => {
  const navigation = useNavigation<Nav>();
  const [activeTab, setActiveTab] = useState<'all' | 'following'>('all');

  const filteredEntries = activeTab === 'all' ? entries : entries.filter((e) => followingIds.includes(e.uid));

  const handleShare = async (entry: BalanceEntry & { user: UserProfile }) => {
    const message = `${entry.user.displayName}さんの収支記録: ${gamblingTypeMap[entry.type] || entry.type}で${
      entry.balance > 0 ? '+' : ''
    }${entry.balance.toLocaleString()}円`;
    try {
      await Share.share({ message, title: 'GambleShare' });
    } catch (err) {
      console.error('Share failed:', err);
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'all' && styles.tabOn]}
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextOn]}>すべて</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'following' && styles.tabOn]}
          onPress={() => setActiveTab('following')}
        >
          <Text style={[styles.tabText, activeTab === 'following' && styles.tabTextOn]}>友達</Text>
        </TouchableOpacity>
      </View>

      {filteredEntries.length > 0 ? (
        filteredEntries.map((entry) => (
          <View key={entry.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <TouchableOpacity
                style={styles.userRow}
                onPress={() => navigation.navigate('UserDetail', { uid: entry.uid })}
              >
                <Image source={{ uri: avatarUri(entry.user.uid, entry.user.photoURL) }} style={styles.avatar} />
                <View style={styles.userText}>
                  <Text style={styles.displayName}>{entry.user.displayName}</Text>
                  <Text style={styles.time}>{format(entry.createdAt, 'yyyy/MM/dd HH:mm', { locale: ja })}</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => Alert.alert('GambleShare', 'メニューは準備中です。')}>
                <MoreHorizontal color={colors.gray400} size={24} />
              </TouchableOpacity>
            </View>

            <View style={styles.cardBody}>
              <View style={styles.chipsRow}>
                <View style={styles.chip}>
                  <CalendarIcon color={colors.indigo600} size={14} />
                  <Text style={styles.chipText}>{format(parseISO(entry.date), 'yyyy年MM月dd日', { locale: ja })}</Text>
                </View>
                <View style={styles.chip}>
                  <Tag color={colors.indigo600} size={14} />
                  <Text style={styles.chipText}>{gamblingTypeMap[entry.type] || entry.type}</Text>
                </View>
              </View>

              <View style={[styles.balanceBox, entry.balance >= 0 ? styles.balancePos : styles.balanceNeg]}>
                <Text style={[styles.balanceAmount, entry.balance >= 0 ? styles.textPos : styles.textNeg]}>
                  {entry.balance > 0 ? '+' : ''}
                  {entry.balance.toLocaleString()}円
                </Text>
              </View>

              {!!entry.memo && <Text style={styles.memo}>{entry.memo}</Text>}

              {!!entry.photoURL && (
                <Image source={{ uri: entry.photoURL }} style={styles.photo} resizeMode="cover" />
              )}
            </View>

            <View style={styles.actions}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => onLike(entry.id)}>
                <Heart
                  color={likedEntryIds.includes(entry.id) ? colors.red500 : colors.gray500}
                  size={24}
                  fill={likedEntryIds.includes(entry.id) ? colors.red500 : 'transparent'}
                />
                {entry.likesCount > 0 && <Text style={styles.actionCount}>{entry.likesCount}</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => onComment(entry.id)}>
                <MessageCircle color={colors.gray500} size={24} />
                {entry.commentsCount > 0 && <Text style={styles.actionCount}>{entry.commentsCount}</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => handleShare(entry)}>
                <Share2 color={colors.gray500} size={24} />
              </TouchableOpacity>
            </View>
          </View>
        ))
      ) : (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>表示する投稿がありません。</Text>
          {activeTab === 'following' && (
            <Text style={styles.emptyHint}>友達を追加して投稿をチェックしましょう！</Text>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { gap: 24, marginTop: -16 },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.gray100,
    borderRadius: 16,
    padding: 4,
    alignSelf: 'center',
    marginBottom: 8,
  },
  tab: { paddingVertical: 10, paddingHorizontal: 28, borderRadius: 12 },
  tabOn: { backgroundColor: colors.white, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4 },
  tabText: { fontWeight: '700', color: colors.gray500, fontSize: 15 },
  tabTextOn: { color: colors.indigo600 },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.gray200,
    marginBottom: 8,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
  },
  userRow: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.gray100,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  userText: { marginLeft: 12, flex: 1 },
  displayName: { fontWeight: '700', fontSize: 16, color: colors.gray900 },
  time: { fontSize: 11, color: colors.gray500, marginTop: 2 },
  cardBody: { paddingHorizontal: 20, paddingBottom: 12 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.gray100,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  chipText: { fontSize: 13, color: colors.gray600 },
  balanceBox: { padding: 20, borderRadius: 16, marginBottom: 12 },
  balancePos: { backgroundColor: colors.green50 },
  balanceNeg: { backgroundColor: colors.red50 },
  balanceAmount: { fontSize: 28, fontWeight: '900' },
  textPos: { color: colors.green700 },
  textNeg: { color: colors.red600 },
  memo: { color: colors.gray700, lineHeight: 22, marginBottom: 12 },
  photo: { width: '100%', height: 240, borderRadius: 12, backgroundColor: colors.gray100 },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 28,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: colors.gray50,
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionCount: { fontSize: 12, fontWeight: '600', color: colors.gray500 },
  empty: {
    alignItems: 'center',
    paddingVertical: 56,
    backgroundColor: colors.white,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.gray100,
  },
  emptyTitle: { color: colors.gray500, fontWeight: '600' },
  emptyHint: { color: colors.gray400, fontSize: 13, marginTop: 8, textAlign: 'center', paddingHorizontal: 24 },
});

export default FeedView;
