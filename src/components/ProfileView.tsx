import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  Switch,
  ScrollView,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import { Camera, Shield, Bell, Save, QrCode, LogOut } from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';
import { UserProfile } from '../types';
import { colors } from '../theme';

interface ProfileViewProps {
  user: UserProfile;
  onUpdate: (data: Partial<UserProfile>) => Promise<void>;
  onLogout: () => void;
}

const avatarUri = (uid: string, photoURL?: string) =>
  photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${uid}`;

const ProfileView: React.FC<ProfileViewProps> = ({ user, onUpdate, onLogout }) => {
  const [displayName, setDisplayName] = useState(user.displayName);
  const [bio, setBio] = useState(user.bio || '');
  const [visibility, setVisibility] = useState(user.privacySettings?.visibility || 'friends');
  const [friendPostsNotification, setFriendPostsNotification] = useState(
    user.notificationSettings?.friendPosts ?? true,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNotificationToggle = async (checked: boolean) => {
    setFriendPostsNotification(checked);
    if (checked) {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        setFriendPostsNotification(false);
      }
    }
  };

  const cycleVisibility = () => {
    setVisibility((v) => (v === 'friends' ? 'private' : 'friends'));
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await onUpdate({
        displayName,
        bio,
        privacySettings: {
          visibility: visibility as 'friends' | 'private',
        },
        notificationSettings: {
          friendPosts: friendPostsNotification,
        },
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
      <View style={styles.hero} />
      <View style={styles.body}>
        <View style={styles.avatarWrap}>
          <Image source={{ uri: avatarUri(user.uid, user.photoURL) }} style={styles.avatar} />
          <TouchableOpacity style={styles.camBtn} activeOpacity={0.85}>
            <Camera color={colors.gray600} size={18} />
          </TouchableOpacity>
        </View>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.field}>
          <Text style={styles.label}>表示名</Text>
          <TextInput style={styles.input} value={displayName} onChangeText={setDisplayName} />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>自己紹介</Text>
          <TextInput
            style={[styles.input, styles.bio]}
            value={bio}
            onChangeText={setBio}
            placeholder="好きな機種やスタイルなど..."
            placeholderTextColor={colors.gray400}
            multiline
            textAlignVertical="top"
          />
        </View>

        <View style={styles.qrBlock}>
          <View style={styles.qrTitleRow}>
            <QrCode color={colors.indigo600} size={18} />
            <Text style={styles.sectionTitle}>マイQRコード</Text>
          </View>
          <View style={styles.qrBox}>
            <QRCode value={user.uid} size={160} />
          </View>
          <Text style={styles.qrHint}>友達にこのQRコードをスキャンしてもらいましょう</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Shield color={colors.indigo600} size={18} />
            <Text style={styles.sectionTitle}>プライバシー設定</Text>
          </View>
          <TouchableOpacity style={styles.rowBetween} onPress={cycleVisibility}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={styles.rowTitle}>公開範囲</Text>
              <Text style={styles.rowSub}>収支を誰に見せるか設定します</Text>
            </View>
            <Text style={styles.pill}>{visibility === 'friends' ? '友達のみ' : '自分のみ'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Bell color={colors.indigo600} size={18} />
            <Text style={styles.sectionTitle}>通知設定</Text>
          </View>
          <View style={styles.rowBetween}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={styles.rowTitle}>友達の投稿通知</Text>
              <Text style={styles.rowSub}>友達がフィードに投稿した際に通知を受け取ります</Text>
            </View>
            <Switch
              value={friendPostsNotification}
              onValueChange={handleNotificationToggle}
              trackColor={{ false: colors.gray200, true: colors.indigo200 }}
              thumbColor={friendPostsNotification ? colors.indigo600 : colors.gray400}
            />
          </View>
        </View>

        <TouchableOpacity style={[styles.primaryBtn, isSaving && styles.btnDisabled]} onPress={handleSubmit} disabled={isSaving}>
          <Save color={colors.white} size={18} />
          <Text style={styles.primaryBtnText}>{isSaving ? '保存中...' : '設定を保存'}</Text>
        </TouchableOpacity>

        <Text style={styles.accountHint}>アカウント管理</Text>
        <TouchableOpacity style={styles.dangerBtn} onPress={onLogout}>
          <LogOut color={colors.red600} size={18} />
          <Text style={styles.dangerBtnText}>ログアウト</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  hero: { height: 120, backgroundColor: colors.indigo600 },
  body: { marginTop: -64, paddingHorizontal: 20 },
  avatarWrap: { alignSelf: 'flex-start', marginBottom: 20 },
  avatar: {
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 4,
    borderColor: colors.white,
    backgroundColor: colors.gray100,
  },
  camBtn: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: colors.white,
    padding: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  errorBox: {
    backgroundColor: colors.red50,
    borderWidth: 1,
    borderColor: colors.red100,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorText: { color: colors.red600, fontWeight: '700', fontSize: 13 },
  field: { marginBottom: 18 },
  label: { fontSize: 13, fontWeight: '700', color: colors.gray700, marginBottom: 8 },
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
  bio: { minHeight: 96 },
  qrBlock: {
    alignItems: 'center',
    backgroundColor: colors.gray50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.gray100,
    padding: 20,
    marginBottom: 24,
    gap: 12,
  },
  qrTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.gray900 },
  qrBox: {
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.gray100,
  },
  qrHint: { fontSize: 11, color: colors.gray500, textAlign: 'center', paddingHorizontal: 12 },
  section: {
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
    paddingTop: 20,
    marginBottom: 20,
    gap: 16,
  },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowTitle: { fontWeight: '700', color: colors.gray900, fontSize: 15 },
  rowSub: { fontSize: 13, color: colors.gray500, marginTop: 4 },
  pill: {
    fontWeight: '800',
    color: colors.indigo600,
    backgroundColor: colors.indigo50,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.indigo600,
    paddingVertical: 16,
    borderRadius: 14,
    marginBottom: 28,
  },
  btnDisabled: { opacity: 0.65 },
  primaryBtnText: { color: colors.white, fontWeight: '800', fontSize: 16 },
  accountHint: { textAlign: 'center', color: colors.gray400, fontSize: 13, marginBottom: 12 },
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.red50,
    borderWidth: 1,
    borderColor: colors.red100,
    paddingVertical: 16,
    borderRadius: 14,
  },
  dangerBtnText: { color: colors.red600, fontWeight: '800', fontSize: 16 },
});

export default ProfileView;
