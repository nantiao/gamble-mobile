import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Image,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { collection, query, where, getDocs, getDoc, doc, setDoc, deleteDoc, onSnapshot, writeBatch } from 'firebase/firestore';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { UserProfile } from '../types';
import { UserPlus, UserMinus, QrCode, X, Camera, User as UserIcon } from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';
import { colors } from '../theme';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface UserSearchViewProps {
  currentUser: { uid: string };
  userProfile: UserProfile | null;
}

const avatarUri = (uid: string, photoURL?: string) =>
  photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${uid}`;

const UserSearchView: React.FC<UserSearchViewProps> = ({ currentUser, userProfile }) => {
  const navigation = useNavigation<Nav>();
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [followingUsers, setFollowingUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scannerMode, setScannerMode] = useState<'scan' | 'my-qr'>('scan');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [searchError, setSearchError] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const scannedRef = useRef(false);

  useEffect(() => {
    const q = query(collection(db, 'follows'), where('followerId', '==', currentUser.uid));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const ids = snapshot.docs.map((d) => d.data().followingId);
      setFollowingIds(ids);
      if (ids.length > 0) {
        const userDocs = await Promise.all(ids.map((id) => getDoc(doc(db, 'users', id))));
        setFollowingUsers(userDocs.filter((d) => d.exists()).map((d) => d.data() as UserProfile));
      } else {
        setFollowingUsers([]);
      }
    });
    return () => unsubscribe();
  }, [currentUser.uid]);

  useEffect(() => {
    if (showScanner && scannerMode === 'scan' && !permission?.granted) {
      void requestPermission();
    }
  }, [showScanner, scannerMode, permission?.granted, requestPermission]);

  useEffect(() => {
    if (!showScanner || scannerMode !== 'scan') {
      scannedRef.current = false;
    }
  }, [showScanner, scannerMode]);

  const performSearch = async (term: string): Promise<UserProfile | null> => {
    const cleanTerm = term.trim();
    if (!cleanTerm) return null;
    setLoading(true);
    try {
      const userDoc = await getDoc(doc(db, 'users', cleanTerm));
      if (userDoc.exists()) {
        const userData = userDoc.data() as UserProfile;
        if (userData.uid !== currentUser.uid) return userData;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'users');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scannedRef.current) return;
    scannedRef.current = true;
    setShowScanner(false);
    setScannerMode('scan');
    const foundUser = await performSearch(data);
    if (foundUser) {
      setSelectedUser(foundUser);
      setSearchError(false);
    } else {
      setSearchError(true);
    }
  };

  const toggleFollow = async (targetUserId: string) => {
    const isFollowing = followingIds.includes(targetUserId);
    const followId = `${currentUser.uid}_${targetUserId}`;
    const reverseFollowId = `${targetUserId}_${currentUser.uid}`;
    const batch = writeBatch(db);
    try {
      if (isFollowing) {
        batch.delete(doc(db, 'follows', followId));
        batch.delete(doc(db, 'follows', reverseFollowId));
      } else {
        batch.set(doc(db, 'follows', followId), {
          followerId: currentUser.uid,
          followingId: targetUserId,
          createdAt: Date.now(),
        });
        batch.set(doc(db, 'follows', reverseFollowId), {
          followerId: targetUserId,
          followingId: currentUser.uid,
          createdAt: Date.now(),
        });
      }
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'follows');
    }
  };

  const closeScanner = () => {
    setShowScanner(false);
    setScannerMode('scan');
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>友達を追加</Text>
        <Text style={styles.heroSub}>QRコードを読み取って友達になりましょう</Text>
        <View style={styles.heroBtns}>
          <TouchableOpacity
            style={styles.btnPrimary}
            onPress={() => {
              setScannerMode('scan');
              setShowScanner(true);
            }}
          >
            <Camera color={colors.white} size={22} />
            <Text style={styles.btnPrimaryText}>スキャン</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.btnOutline}
            onPress={() => {
              setScannerMode('my-qr');
              setShowScanner(true);
            }}
          >
            <QrCode color={colors.indigo600} size={22} />
            <Text style={styles.btnOutlineText}>マイQRコード</Text>
          </TouchableOpacity>
        </View>
        {searchError && (
          <View style={styles.errBanner}>
            <Text style={styles.errText}>ユーザーが見つかりませんでした。</Text>
          </View>
        )}
      </View>

      <Modal visible={showScanner} animationType="slide" onRequestClose={closeScanner}>
        <View style={styles.scannerSheet}>
          <View style={styles.scannerHeader}>
            <Text style={styles.scannerTitle}>{scannerMode === 'scan' ? 'QRコードをスキャン' : 'マイQRコード'}</Text>
            <TouchableOpacity onPress={closeScanner} hitSlop={12}>
              <X color={colors.gray500} size={26} />
            </TouchableOpacity>
          </View>

          <View style={styles.scannerBody}>
            {scannerMode === 'scan' ? (
              <View style={styles.cameraBox}>
                {permission?.granted ? (
                  <CameraView
                    style={StyleSheet.absoluteFill}
                    facing="back"
                    barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                    onBarcodeScanned={handleBarCodeScanned}
                  />
                ) : (
                  <View style={styles.permBox}>
                    <Text style={styles.permText}>カメラの許可が必要です</Text>
                    <TouchableOpacity style={styles.permBtn} onPress={() => void requestPermission()}>
                      <Text style={styles.permBtnText}>許可を求める</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.myQr}>
                <View style={styles.qrFrame}>
                  <QRCode value={currentUser.uid} size={220} />
                </View>
                <Text style={styles.myQrLabel}>Your QR Code</Text>
                <Text style={styles.myQrName}>{userProfile?.displayName}</Text>
              </View>
            )}
          </View>

          <View style={styles.scannerFooter}>
            <TouchableOpacity
              style={styles.switchModeBtn}
              onPress={() => setScannerMode((m) => (m === 'scan' ? 'my-qr' : 'scan'))}
            >
              {scannerMode === 'scan' ? (
                <>
                  <UserIcon color={colors.indigo600} size={22} />
                  <Text style={styles.switchModeText}>マイQRコードを表示</Text>
                </>
              ) : (
                <>
                  <Camera color={colors.indigo600} size={22} />
                  <Text style={styles.switchModeText}>スキャンに戻る</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {followingUsers.length > 0 && (
        <View style={styles.listSection}>
          <Text style={styles.listHeading}>友達一覧</Text>
          {followingUsers.map((u) => (
            <View key={u.uid} style={styles.friendRow}>
              <TouchableOpacity style={styles.friendMain} onPress={() => setSelectedUser(u)}>
                <Image source={{ uri: avatarUri(u.uid, u.photoURL) }} style={styles.fAvatar} />
                <Text style={styles.fName}>{u.displayName}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.unfriendBtn} onPress={() => toggleFollow(u.uid)}>
                <UserMinus color={colors.gray400} size={20} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {loading ? <ActivityIndicator color={colors.indigo600} style={{ marginVertical: 16 }} /> : null}

      <Modal visible={!!selectedUser} transparent animationType="fade" onRequestClose={() => setSelectedUser(null)}>
        <View style={styles.detailOverlay}>
          <View style={styles.detailCard}>
            <TouchableOpacity style={styles.detailClose} onPress={() => setSelectedUser(null)}>
              <X color={colors.gray500} size={22} />
            </TouchableOpacity>
            {selectedUser && (
              <>
                <Image
                  source={{ uri: avatarUri(selectedUser.uid, selectedUser.photoURL) }}
                  style={styles.dAvatar}
                />
                <Text style={styles.dName}>{selectedUser.displayName}</Text>
                {!!selectedUser.bio && <Text style={styles.dBio}>{selectedUser.bio}</Text>}
                <View style={styles.dActions}>
                  <TouchableOpacity
                    style={styles.dSecondary}
                    onPress={() => {
                      const uid = selectedUser.uid;
                      setSelectedUser(null);
                      navigation.navigate('UserDetail', { uid });
                    }}
                  >
                    <Text style={styles.dSecondaryText}>プロフィール</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.dPrimary,
                      followingIds.includes(selectedUser.uid) && styles.dPrimaryMuted,
                    ]}
                    onPress={() => toggleFollow(selectedUser.uid)}
                  >
                    {followingIds.includes(selectedUser.uid) ? (
                      <>
                        <UserMinus color={colors.red500} size={18} />
                        <Text style={styles.dPrimaryMutedText}>解除</Text>
                      </>
                    ) : (
                      <>
                        <UserPlus color={colors.white} size={18} />
                        <Text style={styles.dPrimaryText}>追加</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingBottom: 40, gap: 20 },
  heroCard: {
    backgroundColor: colors.white,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.gray200,
    padding: 24,
    alignItems: 'center',
  },
  heroTitle: { fontSize: 26, fontWeight: '900', color: colors.gray900, marginBottom: 8 },
  heroSub: { color: colors.gray500, textAlign: 'center', marginBottom: 24 },
  heroBtns: { width: '100%', gap: 12 },
  btnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.indigo600,
    paddingVertical: 16,
    borderRadius: 16,
  },
  btnPrimaryText: { color: colors.white, fontWeight: '800', fontSize: 16 },
  btnOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 2,
    borderColor: colors.indigo100,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: colors.white,
  },
  btnOutlineText: { color: colors.indigo600, fontWeight: '800', fontSize: 16 },
  errBanner: {
    marginTop: 16,
    backgroundColor: colors.red50,
    borderWidth: 1,
    borderColor: colors.red100,
    padding: 12,
    borderRadius: 12,
    width: '100%',
  },
  errText: { color: colors.red600, fontWeight: '700', textAlign: 'center', fontSize: 13 },
  scannerSheet: { flex: 1, backgroundColor: colors.white },
  scannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  scannerTitle: { fontSize: 18, fontWeight: '900', color: colors.gray900 },
  scannerBody: { flex: 1, padding: 20, justifyContent: 'center' },
  cameraBox: {
    aspectRatio: 1,
    maxHeight: 320,
    width: '100%',
    alignSelf: 'center',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: colors.indigo50,
    backgroundColor: colors.gray100,
  },
  permBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  permText: { color: colors.gray600, marginBottom: 12, textAlign: 'center' },
  permBtn: { backgroundColor: colors.indigo600, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  permBtnText: { color: colors.white, fontWeight: '800' },
  myQr: { alignItems: 'center', gap: 12 },
  qrFrame: {
    padding: 20,
    borderRadius: 28,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray100,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  myQrLabel: { fontSize: 11, fontWeight: '800', color: colors.gray400, letterSpacing: 2 },
  myQrName: { fontSize: 20, fontWeight: '900', color: colors.gray900 },
  scannerFooter: { padding: 20, borderTopWidth: 1, borderTopColor: colors.gray100, backgroundColor: colors.gray50 },
  switchModeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.white,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  switchModeText: { fontWeight: '800', color: colors.gray900 },
  listSection: { gap: 12 },
  listHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.gray400,
    letterSpacing: 2,
    marginLeft: 4,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.gray200,
    padding: 16,
  },
  friendMain: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  fAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.gray100,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  fName: { marginLeft: 14, fontWeight: '800', fontSize: 16, color: colors.gray900 },
  unfriendBtn: { padding: 10 },
  detailOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: 20,
  },
  detailCard: {
    backgroundColor: colors.white,
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
  },
  detailClose: { position: 'absolute', top: 16, right: 16, padding: 8, zIndex: 2 },
  dAvatar: {
    width: 112,
    height: 112,
    borderRadius: 56,
    marginTop: 16,
    borderWidth: 4,
    borderColor: colors.white,
    backgroundColor: colors.gray100,
  },
  dName: { fontSize: 22, fontWeight: '900', color: colors.gray900, marginTop: 16, marginBottom: 8 },
  dBio: { color: colors.gray600, textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  dActions: { flexDirection: 'row', gap: 12, width: '100%' },
  dSecondary: {
    flex: 1,
    backgroundColor: colors.gray100,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  dSecondaryText: { fontWeight: '800', color: colors.gray900 },
  dPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.indigo600,
    paddingVertical: 14,
    borderRadius: 16,
  },
  dPrimaryMuted: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.gray200 },
  dPrimaryText: { fontWeight: '800', color: colors.white },
  dPrimaryMutedText: { fontWeight: '800', color: colors.red500 },
});

export default UserSearchView;
