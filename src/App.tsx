import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { onAuthStateChanged, signOut, GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  orderBy,
  limit,
  addDoc,
  deleteDoc,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { LogIn, AlertCircle } from 'lucide-react-native';

import { auth, db, storage, handleFirestoreError, OperationType } from './firebase';
import Layout from './components/Layout';
import FeedView from './components/FeedView';
import CalendarView from './components/CalendarView';
import StatsView from './components/StatsView';
import ProfileView from './components/ProfileView';
import BalanceForm, { BalanceFormSavePayload } from './components/BalanceForm';
import UserSearchView from './components/UserSearchView';
import UserDetailView from './components/UserDetailView';
import CommentModal from './components/CommentModal';
import { BalanceEntry, UserProfile } from './types';
import { colors } from './theme';
import type { RootStackParamList } from './navigation/types';

WebBrowser.maybeCompleteAuthSession();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const Stack = createNativeStackNavigator<RootStackParamList>();

type AuthUser = {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
};

function GoogleSignInPanel({ onError }: { onError: (msg: string) => void }) {
  const extra = (Constants.expoConfig?.extra ?? {}) as {
    googleWebClientId?: string;
    googleIosClientId?: string;
    googleAndroidClientId?: string;
  };

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: extra.googleWebClientId || undefined,
    iosClientId: extra.googleIosClientId || extra.googleWebClientId || undefined,
    androidClientId: extra.googleAndroidClientId || extra.googleWebClientId || undefined,
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const idToken = response.params?.id_token;
      if (idToken) {
        const credential = GoogleAuthProvider.credential(idToken);
        signInWithCredential(auth, credential).catch((e: Error) => {
          onError(e.message || 'ログインに失敗しました');
        });
      }
    } else if (response?.type === 'error') {
      onError(response.error?.message || 'ログインに失敗しました');
    }
  }, [response, onError]);

  return (
    <TouchableOpacity
      style={styles.loginBtn}
      disabled={!request}
      onPress={() => {
        if (!extra.googleWebClientId) {
          onError(
            'Google ログイン用の Web クライアント ID が未設定です。EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID を設定してください。',
          );
          return;
        }
        void promptAsync();
      }}
    >
      <LogIn color={colors.indigo600} size={22} />
      <Text style={styles.loginBtnText}>Googleでログイン</Text>
    </TouchableOpacity>
  );
}

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<BalanceEntry[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [allEntries, setAllEntries] = useState<(BalanceEntry & { user: UserProfile })[]>([]);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [likedEntryIds, setLikedEntryIds] = useState<string[]>([]);
  const [likesCountMap, setLikesCountMap] = useState<Record<string, number>>({});
  const [commentsCountMap, setCommentsCountMap] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [showCommentModal, setShowCommentModal] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (loading) {
        console.error('Auth state resolution timed out');
        setLoading(false);
        setError(
          '認証サーバーとの通信に時間がかかっています。ネットワーク接続を確認してください。アプリを再起動すると解決する場合があります。',
        );
      }
    }, 15000);

    const unsubscribe = onAuthStateChanged(
      auth,
      (u) => {
        clearTimeout(timeoutId);
        setUser(
          u
            ? {
                uid: u.uid,
                displayName: u.displayName,
                email: u.email,
                photoURL: u.photoURL,
              }
            : null,
        );

        const initializeUser = async () => {
          if (u) {
            try {
              const profileRef = doc(db, 'users', u.uid);
              const profileSnap = await getDoc(profileRef);

              if (profileSnap.exists()) {
                const data = profileSnap.data() as UserProfile;
                if (!data.privacySettings) data.privacySettings = { visibility: 'friends' };
                if (!data.notificationSettings) data.notificationSettings = { friendPosts: true };
                setUserProfile(data);
              } else {
                const newProfile: UserProfile = {
                  uid: u.uid,
                  displayName: u.displayName || 'ユーザー',
                  photoURL: u.photoURL || undefined,
                  privacySettings: { visibility: 'friends' },
                  notificationSettings: { friendPosts: true },
                  createdAt: Date.now(),
                };
                await setDoc(profileRef, newProfile);
                setUserProfile(newProfile);
              }
            } catch (err) {
              console.error('Error fetching/creating profile:', err);
            }
          } else {
            setUserProfile(null);
            setEntries([]);
            setAllEntries([]);
            setFollowingIds([]);
          }
          setLoading(false);
        };

        void initializeUser();
      },
      (err) => {
        clearTimeout(timeoutId);
        console.error('Auth error:', err);
        setLoading(false);
        setError(`認証エラーが発生しました: ${err.message || '不明なエラー'}`);
      },
    );

    return () => {
      unsubscribe();
      clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'follows'), where('followerId', '==', user.uid));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setFollowingIds(snapshot.docs.map((d) => d.data().followingId));
      },
      (err) => console.error('Follows listener error:', err),
    );
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'likes'), where('uid', '==', user.uid));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setLikedEntryIds(snapshot.docs.map((d) => d.data().entryId));
      },
      (err) => console.error('Likes listener error:', err),
    );
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(
      collection(db, 'likes'),
      (snapshot) => {
        const counts: Record<string, number> = {};
        snapshot.docs.forEach((d) => {
          const entryId = d.data().entryId as string;
          counts[entryId] = (counts[entryId] || 0) + 1;
        });
        setLikesCountMap(counts);
      },
      (err) => console.error('Global likes listener error:', err),
    );
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(
      collection(db, 'comments'),
      (snapshot) => {
        const counts: Record<string, number> = {};
        snapshot.docs.forEach((d) => {
          const entryId = d.data().entryId as string;
          counts[entryId] = (counts[entryId] || 0) + 1;
        });
        setCommentsCountMap(counts);
      },
      (err) => console.error('Global comments listener error:', err),
    );
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'entries'), where('uid', '==', user.uid), orderBy('date', 'desc'), limit(100));
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
      },
      (err) => console.error('Entries listener error:', err),
    );
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'entries'), orderBy('createdAt', 'desc'), limit(200));
    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        if (userProfile?.notificationSettings?.friendPosts !== false) {
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
              const data = change.doc.data();
              const createdAt =
                typeof data.createdAt === 'number'
                  ? data.createdAt
                  : data.createdAt?.toMillis?.() ?? Date.now();
              if (followingIds.includes(data.uid) && createdAt > Date.now() - 60000) {
                void Notifications.scheduleNotificationAsync({
                  content: {
                    title: 'GambleShare',
                    body: '友達が新しい収支を記録しました！',
                  },
                  trigger: null,
                });
              }
            }
          });
        }

        const entryData = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            ...data,
            id: d.id,
            createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : (data.createdAt || Date.now()),
            updatedAt: data.updatedAt?.toMillis ? data.updatedAt.toMillis() : (data.updatedAt || Date.now()),
          };
        }) as BalanceEntry[];

        const allowedUids = [user.uid, ...followingIds];
        const filteredData = entryData.filter((e) => allowedUids.includes(e.uid));

        if (filteredData.length === 0) {
          setAllEntries([]);
          return;
        }

        const userIds = Array.from(new Set(filteredData.map((e) => e.uid)));
        const profiles: Record<string, UserProfile> = {};
        try {
          const profileSnaps = await Promise.all(userIds.map((uid) => getDoc(doc(db, 'users', uid))));
          profileSnaps.forEach((snap, index) => {
            if (snap.exists()) {
              const data = snap.data() as UserProfile;
              if (!data.privacySettings) data.privacySettings = { visibility: 'friends' };
              profiles[userIds[index]] = data;
            }
          });
        } catch (err) {
          console.error('Error fetching profiles for feed:', err);
        }

        const combined = filteredData.map((e) => ({
          ...e,
          user:
            profiles[e.uid] ||
            ({
              uid: e.uid,
              displayName: '不明なユーザー',
              privacySettings: { visibility: 'private' as const },
              createdAt: 0,
            } satisfies UserProfile),
        }));

        setAllEntries(combined);
      },
      (err) => console.error('Feed listener error:', err),
    );

    return () => unsubscribe();
  }, [user, followingIds, userProfile?.notificationSettings?.friendPosts]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const handleSaveEntry = async (data: BalanceFormSavePayload) => {
    if (!user) return;
    try {
      let photoURL = '';
      if (data.photoUri) {
        const res = await fetch(data.photoUri);
        const blob = await res.blob();
        const storageRef = ref(storage, `entries/${user.uid}/${Date.now()}.jpg`);
        await uploadBytes(storageRef, blob);
        photoURL = await getDownloadURL(storageRef);
      }

      await addDoc(collection(db, 'entries'), {
        uid: user.uid,
        date: data.date,
        type: data.type,
        investment: data.investment,
        return: data.return,
        balance: data.balance,
        memo: data.memo,
        photoURL: photoURL || null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'entries');
    }
  };

  const handleUpdateProfile = async (data: Partial<UserProfile>) => {
    if (!user) return;
    try {
      if (data.customId) {
        const q = query(collection(db, 'users'), where('customId', '==', data.customId));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          throw new Error('このユーザーIDは既に使用されています。');
        }
      }
      const profileRef = doc(db, 'users', user.uid);
      await updateDoc(profileRef, data as any);
      setUserProfile((prev) => (prev ? { ...prev, ...data } : null));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('既に使用されています')) {
        throw err;
      }
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const handleLike = async (entryId: string) => {
    if (!user) return;
    const likeId = `${user.uid}_${entryId}`;
    const likeRef = doc(db, 'likes', likeId);
    try {
      if (likedEntryIds.includes(entryId)) {
        await deleteDoc(likeRef);
      } else {
        await setDoc(likeRef, { uid: user.uid, entryId, createdAt: Date.now() });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'likes');
    }
  };

  const handleAddComment = async (entryId: string, text: string) => {
    if (!user || !text.trim()) return;
    try {
      await addDoc(collection(db, 'comments'), {
        entryId,
        uid: user.uid,
        text: text.trim(),
        createdAt: Date.now(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'comments');
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.indigo600} />
        <Text style={styles.loadingText}>データを読み込み中...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: colors.red50 }]}>
        <View style={styles.errorCard}>
          <View style={{ alignSelf: 'center', marginBottom: 12 }}>
            <AlertCircle color={colors.red500} size={44} />
          </View>
          <Text style={styles.errorTitle}>エラーが発生しました</Text>
          <Text style={styles.errorBody}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => setError(null)}>
            <Text style={styles.retryText}>閉じる</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={[styles.center, { backgroundColor: colors.indigo600 }]}>
        <View style={styles.loginCard}>
          <Text style={styles.brand}>GambleShare</Text>
          <Text style={styles.tagline}>
            ギャンブルの収支を記録し、仲間と共有しよう。{'\n'}可視化することで、より賢いプレイを。
          </Text>
          {authError ? <Text style={styles.authErr}>{authError}</Text> : null}
          <GoogleSignInPanel onError={setAuthError} />
        </View>
      </View>
    );
  }

  const navigationUser = {
    uid: user.uid,
    displayName: user.displayName,
    email: user.email,
    photoURL: user.photoURL,
  };

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: Platform.OS === 'ios' ? 'default' : 'fade' }}>
        <Stack.Screen name="Feed">
          {() => (
            <Layout user={navigationUser} onLogout={handleLogout}>
              <FeedView
                entries={allEntries.map((e) => ({
                  ...e,
                  likesCount: likesCountMap[e.id] || 0,
                  commentsCount: commentsCountMap[e.id] || 0,
                }))}
                followingIds={followingIds}
                currentUserId={user.uid}
                likedEntryIds={likedEntryIds}
                onLike={handleLike}
                onComment={(id) => setShowCommentModal(id)}
              />
            </Layout>
          )}
        </Stack.Screen>
        <Stack.Screen name="Search">
          {() => (
            <Layout user={navigationUser} onLogout={handleLogout}>
              <UserSearchView currentUser={user} userProfile={userProfile} />
            </Layout>
          )}
        </Stack.Screen>
        <Stack.Screen name="UserDetail">
          {() => (
            <Layout user={navigationUser} onLogout={handleLogout}>
              <UserDetailView
                currentUser={user}
                followingIds={followingIds}
                likedEntryIds={likedEntryIds}
                likesCountMap={likesCountMap}
                commentsCountMap={commentsCountMap}
                onLike={handleLike}
                onComment={(id) => setShowCommentModal(id)}
              />
            </Layout>
          )}
        </Stack.Screen>
        <Stack.Screen name="Calendar">
          {() => (
            <Layout user={navigationUser} onLogout={handleLogout}>
              <CalendarView entries={entries} onDateClick={() => {}} />
            </Layout>
          )}
        </Stack.Screen>
        <Stack.Screen name="Stats">
          {() => (
            <Layout user={navigationUser} onLogout={handleLogout}>
              <StatsView entries={entries} />
            </Layout>
          )}
        </Stack.Screen>
        <Stack.Screen name="Settings">
          {() => (
            <Layout user={navigationUser} onLogout={handleLogout}>
              {userProfile ? (
                <ProfileView user={userProfile} onUpdate={handleUpdateProfile} onLogout={handleLogout} />
              ) : (
                <View style={styles.center}>
                  <ActivityIndicator color={colors.indigo600} />
                  <Text style={styles.loadingText}>プロフィールを読み込み中...</Text>
                </View>
              )}
            </Layout>
          )}
        </Stack.Screen>
        <Stack.Screen name="Add">
          {({ navigation }) => (
            <Layout user={navigationUser} onLogout={handleLogout}>
              <BalanceForm
                onSave={async (data) => {
                  await handleSaveEntry(data);
                  navigation.goBack();
                }}
                onCancel={() => navigation.goBack()}
              />
            </Layout>
          )}
        </Stack.Screen>
      </Stack.Navigator>

      {showCommentModal && (
        <CommentModal
          entryId={showCommentModal}
          currentUser={user}
          onClose={() => setShowCommentModal(null)}
          onAddComment={handleAddComment}
        />
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.gray50, padding: 24 },
  loadingText: { marginTop: 12, color: colors.gray500, fontWeight: '600' },
  errorCard: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: colors.red100,
  },
  errorTitle: { fontSize: 22, fontWeight: '800', color: colors.red600, textAlign: 'center', marginBottom: 12 },
  errorBody: { color: colors.gray600, textAlign: 'center', marginBottom: 20 },
  retryBtn: {
    backgroundColor: colors.indigo600,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  retryText: { color: colors.white, fontWeight: '800', fontSize: 16 },
  loginCard: { maxWidth: 400, width: '100%', alignItems: 'center', gap: 20, paddingHorizontal: 16 },
  brand: { fontSize: 40, fontWeight: '900', color: colors.white, textAlign: 'center' },
  tagline: { fontSize: 16, color: colors.indigo100, textAlign: 'center', lineHeight: 24 },
  authErr: { color: colors.red100, textAlign: 'center', fontSize: 13, fontWeight: '600' },
  loginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.white,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 18,
    width: '100%',
  },
  loginBtnText: { fontSize: 17, fontWeight: '800', color: colors.indigo600 },
});
