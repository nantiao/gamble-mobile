import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Share,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { doc, getDoc, collection, query, orderBy, limit, onSnapshot, writeBatch } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { UserProfile, BalanceEntry } from '../types';
import { format, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';
import {
  ChevronLeft,
  UserMinus,
  Calendar as CalendarIcon,
  Tag,
  Lock,
  Heart,
  MessageCircle,
  Share2,
  Grid3X3,
  BarChart2,
} from 'lucide-react-native';
import { colors } from '../theme';
import type { RootStackParamList } from '../navigation/types';
import StatsView from './StatsView';
import CalendarView from './CalendarView';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type R = RouteProp<RootStackParamList, 'UserDetail'>;

interface UserDetailViewProps {
  currentUser: { uid: string };
  followingIds: string[];
  likedEntryIds: string[];
  likesCountMap: { [key: string]: number };
  commentsCountMap: { [key: string]: number };
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

const UserDetailView: React.FC<UserDetailViewProps> = ({
  currentUser,
  followingIds,
  likedEntryIds,
  likesCountMap,
  commentsCountMap,
  onLike,
  onComment,
}) => {
  const route = useRoute<R>();
  const navigation = useNavigation<Nav>();
  const { uid } = route.params;

  const [user, setUser] = useState<UserProfile | null>(null);
  const [entries, setEntries] = useState<BalanceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'entries' | 'stats' | 'calendar'>('entries');

  const isFollowing = followingIds.includes(uid);

  const handleShare = async (entry: BalanceEntry, userName: string) => {
    const message = `${userName}さんの収支記録: ${gamblingTypeMap[entry.type] || entry.type}で${
      entry.balance > 0 ? '+' : ''
    }${entry.balance.toLocaleString()}円`;
    try {
      await Share.share({ message, title: 'GambleShare' });
    } catch (err) {
      console.error('Share failed:', err);
    }
  };

  useEffect(() => {
    setLoading(true);
    setError(null);
    setUser(null);
    setEntries([]);
    const fetchUser = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (userDoc.exists()) {
          const data = userDoc.data() as UserProfile;
          if (!data.privacySettings) data.privacySettings = { visibility: 'friends' };
          setUser(data);
        } else {
          setError('ユーザーが見つかりませんでした。');
          setLoading(false);
        }
      } catch (err) {
        console.error('Error fetching user:', err);
        setError('ユーザー情報の取得に失敗しました。');
        setLoading(false);
      }
    };
    void fetchUser();
  }, [uid]);

  useEffect(() => {
    if (!user) return;

    const visibility = user.privacySettings.visibility;
    if (visibility === 'private' && uid !== currentUser.uid) {
      setLoading(false);
      return;
    }
    if (visibility === 'friends' && !isFollowing && uid !== currentUser.uid) {
      setLoading(false);
      return;
    }

    const q = query(collection(db, 'entries'), where('uid', '==', uid), orderBy('date', 'desc'), limit(50));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const newEntries = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            ...data,
            id: d.id,
            createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : (data.createdAt || Date.now()),
            updatedAt: data.updatedAt?.toMillis ? data.updatedAt.toMillis() : (data.updatedAt || Date.now()),
          };
        }) as BalanceEntry[];
        setEntries(newEntries);
        setLoading(false);
      },
      (err) => {
        console.error('Entries listener error:', err);
        handleFirestoreError(err, OperationType.LIST, 'entries');
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [uid, user, isFollowing, currentUser.uid]);

  const toggleFollow = async () => {
    const followId = `${currentUser.uid}_${uid}`;
    const reverseFollowId = `${uid}_${currentUser.uid}`;
    const batch = writeBatch(db);
    try {
      if (isFollowing) {
        batch.delete(doc(db, 'follows', followId));
        batch.delete(doc(db, 'follows', reverseFollowId));
      } else {
        batch.set(doc(db, 'follows', followId), {
          followerId: currentUser.uid,
          followingId: uid,
          createdAt: Date.now(),
        });
        batch.set(doc(db, 'follows', reverseFollowId), {
          followerId: uid,
          followingId: currentUser.uid,
          createdAt: Date.now(),
        });
      }
      await batch.commit();
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'follows');
    }
  };

  if (loading && !user) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.indigo600} size="large" />
        <Text style={styles.muted}>読み込み中...</Text>
      </View>
    );
  }

  if (error || !user) {
    return (
      <View style={styles.center}>
        <Text style={styles.err}>{error || 'ユーザーが見つかりません'}</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>戻る</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const canViewEntries =
    (user.privacySettings.visibility as string) === 'public' ||
    uid === currentUser.uid ||
    (user.privacySettings.visibility === 'friends' && isFollowing);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()} accessibilityLabel="戻る">
              <ChevronLeft color={colors.gray500} size={24} />
            </TouchableOpacity>
            <Image source={{ uri: avatarUri(user.uid, user.photoURL) }} style={styles.hAvatar} />
            <View>
              <Text style={styles.hName}>{user.displayName}</Text>
              <Text style={styles.hMeta}>{entries.length} Posts</Text>
            </View>
          </View>
          {uid !== currentUser.uid && (
            <View>
              {isFollowing ? (
                <TouchableOpacity style={styles.iconBtn} onPress={toggleFollow}>
                  <UserMinus color={colors.gray400} size={20} />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.followChip} onPress={toggleFollow}>
                  <Text style={styles.followChipText}>友達になる</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
        {!!user.bio && <Text style={styles.bio}>{user.bio}</Text>}
      </View>

      {canViewEntries ? (
        <View style={styles.tabBlock}>
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'entries' && styles.tabBtnOn]}
              onPress={() => setActiveTab('entries')}
            >
              <Grid3X3 color={activeTab === 'entries' ? colors.indigo600 : colors.gray500} size={20} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'calendar' && styles.tabBtnOn]}
              onPress={() => setActiveTab('calendar')}
            >
              <CalendarIcon color={activeTab === 'calendar' ? colors.indigo600 : colors.gray500} size={20} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'stats' && styles.tabBtnOn]}
              onPress={() => setActiveTab('stats')}
            >
              <BarChart2 color={activeTab === 'stats' ? colors.indigo600 : colors.gray500} size={20} />
            </TouchableOpacity>
          </View>

          {activeTab === 'entries' && (
            <View style={{ gap: 16 }}>
              {entries.length > 0 ? (
                entries.map((entry) => (
                  <View key={entry.id} style={styles.entryCard}>
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
                      <Text style={styles.balanceLabel}>収支</Text>
                      <Text style={[styles.balanceAmt, entry.balance >= 0 ? styles.pos : styles.neg]}>
                        {entry.balance > 0 ? '+' : ''}
                        {entry.balance.toLocaleString()}円
                      </Text>
                    </View>
                    {!!entry.memo && <Text style={styles.memo}>{entry.memo}</Text>}
                    {!!entry.photoURL && (
                      <Image source={{ uri: entry.photoURL }} style={styles.photo} resizeMode="cover" />
                    )}
                    <View style={styles.actions}>
                      <TouchableOpacity style={styles.actionRow} onPress={() => onLike(entry.id)}>
                        <Heart
                          color={likedEntryIds.includes(entry.id) ? colors.red500 : colors.gray500}
                          size={20}
                          fill={likedEntryIds.includes(entry.id) ? colors.red500 : 'transparent'}
                        />
                        <Text style={styles.actionText}>
                          いいね
                          {likesCountMap[entry.id] > 0 ? ` (${likesCountMap[entry.id]})` : ''}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.actionRow} onPress={() => onComment(entry.id)}>
                        <MessageCircle color={colors.gray500} size={20} />
                        <Text style={styles.actionText}>
                          コメント
                          {commentsCountMap[entry.id] > 0 ? ` (${commentsCountMap[entry.id]})` : ''}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.actionRow} onPress={() => handleShare(entry, user.displayName)}>
                        <Share2 color={colors.gray500} size={20} />
                        <Text style={styles.actionText}>シェア</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.empty}>
                  <Text style={styles.muted}>投稿がまだありません。</Text>
                </View>
              )}
            </View>
          )}

          {activeTab === 'calendar' && (
            <CalendarView
              entries={entries}
              onDateClick={(date) => {
                const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
                  date.getDate(),
                ).padStart(2, '0')}`;
                navigation.navigate('Add', { date: dateStr });
              }}
            />
          )}

          {activeTab === 'stats' && <StatsView entries={entries} />}
        </View>
      ) : (
        <View style={styles.locked}>
          <Lock color={colors.gray400} size={40} />
          <Text style={styles.lockedTitle}>非公開アカウント</Text>
          <Text style={styles.lockedSub}>このユーザーの収支を見るには友達になる必要があります。</Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: { flex: 1, marginTop: -16 },
  content: { paddingBottom: 32, gap: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 48, gap: 12 },
  muted: { color: colors.gray400, fontWeight: '600' },
  err: { color: colors.red500, fontWeight: '800', textAlign: 'center' },
  backBtn: { marginTop: 12, backgroundColor: colors.indigo600, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  backBtnText: { color: colors.white, fontWeight: '800' },
  headerCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.gray200,
    padding: 12,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  iconBtn: { padding: 8, borderRadius: 12 },
  hAvatar: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.gray100,
    borderWidth: 1,
    borderColor: colors.gray100,
  },
  hName: { fontSize: 14, fontWeight: '900', color: colors.gray900 },
  hMeta: { fontSize: 9, fontWeight: '800', color: colors.gray400, letterSpacing: 1, marginTop: 2 },
  followChip: {
    backgroundColor: colors.indigo600,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  followChipText: { color: colors.white, fontWeight: '800', fontSize: 12 },
  bio: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.gray50,
    fontSize: 11,
    color: colors.gray500,
    lineHeight: 16,
  },
  tabBlock: { gap: 16 },
  tabs: {
    flexDirection: 'row',
    alignSelf: 'center',
    backgroundColor: colors.gray100,
    borderRadius: 16,
    padding: 4,
    gap: 4,
  },
  tabBtn: { paddingVertical: 10, paddingHorizontal: 22, borderRadius: 12 },
  tabBtnOn: { backgroundColor: colors.white, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4 },
  entryCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.gray200,
    padding: 20,
  },
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
  balanceBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    marginBottom: 12,
  },
  balancePos: { backgroundColor: colors.green50 },
  balanceNeg: { backgroundColor: colors.red50 },
  balanceLabel: { fontWeight: '700', fontSize: 16 },
  balanceAmt: { fontSize: 26, fontWeight: '900' },
  pos: { color: colors.green700 },
  neg: { color: colors.red600 },
  memo: { color: colors.gray700, lineHeight: 22, marginBottom: 12 },
  photo: { width: '100%', height: 220, borderRadius: 12, backgroundColor: colors.gray100 },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.gray50,
  },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionText: { fontSize: 12, fontWeight: '800', color: colors.gray600 },
  empty: { alignItems: 'center', paddingVertical: 40, backgroundColor: colors.white, borderRadius: 24, borderWidth: 1, borderColor: colors.gray100 },
  locked: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: colors.white,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.gray200,
    gap: 10,
  },
  lockedTitle: { fontSize: 18, fontWeight: '800', color: colors.gray900 },
  lockedSub: { textAlign: 'center', color: colors.gray500, lineHeight: 22 },
});

export default UserDetailView;
