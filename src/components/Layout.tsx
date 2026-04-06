import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
} from 'react-native';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Calendar,
  BarChart2,
  Users,
  Settings,
  PlusCircle,
  LogOut,
  Menu,
  X,
  Search,
} from 'lucide-react-native';
import { colors } from '../theme';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface LayoutProps {
  children: React.ReactNode;
  user: { uid: string; displayName?: string | null; email?: string | null; photoURL?: string | null };
  onLogout: () => void;
}

const avatarUri = (uid: string, photoURL?: string | null) =>
  photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${uid}`;

const Layout: React.FC<LayoutProps> = ({ children, user, onLogout }) => {
  const navigation = useNavigation<Nav>();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const routeName = useNavigationState((state) => {
    if (!state?.routes?.length) return '';
    return state.routes[state.index]?.name ?? '';
  });

  useEffect(() => {
    setIsMenuOpen(false);
  }, [routeName]);

  const navItems: { name: string; screen: keyof RootStackParamList; Icon: typeof Users }[] = [
    { name: 'フィード', screen: 'Feed', Icon: Users },
    { name: '友達を追加', screen: 'Search', Icon: Search },
    { name: 'カレンダー', screen: 'Calendar', Icon: Calendar },
    { name: '分析', screen: 'Stats', Icon: BarChart2 },
    { name: '設定', screen: 'Settings', Icon: Settings },
  ];

  const hideChrome = routeName === 'UserDetail' || routeName === 'Add';

  return (
    <View style={styles.root}>
      {!hideChrome && (
        <TouchableOpacity
          style={styles.menuBtn}
          onPress={() => setIsMenuOpen(true)}
          accessibilityLabel="メニューを開く"
        >
          <Menu color={colors.gray600} size={24} />
        </TouchableOpacity>
      )}

      <Modal visible={isMenuOpen} animationType="fade" transparent onRequestClose={() => setIsMenuOpen(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.backdrop} onPress={() => setIsMenuOpen(false)} />
          <View style={styles.drawer}>
            <View style={styles.drawerHeader}>
              <Text style={styles.drawerTitle}>GambleShare</Text>
              <TouchableOpacity onPress={() => setIsMenuOpen(false)} hitSlop={12}>
                <X color={colors.gray400} size={24} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.navScroll} contentContainerStyle={styles.navContent}>
              {navItems.map((item) => {
                const active = routeName === item.screen;
                return (
                  <TouchableOpacity
                    key={item.screen}
                    style={[styles.navRow, active && styles.navRowActive]}
                    onPress={() => {
                      navigation.navigate(item.screen);
                      setIsMenuOpen(false);
                    }}
                  >
                    <View style={styles.navIcon}>
                      <item.Icon color={active ? colors.white : colors.indigo600} size={22} />
                    </View>
                    <Text style={[styles.navLabel, active && styles.navLabelActive]}>{item.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <View style={styles.drawerFooter}>
              <View style={styles.userRow}>
                <Image source={{ uri: avatarUri(user.uid, user.photoURL) }} style={styles.avatar} />
                <View style={styles.userMeta}>
                  <Text numberOfLines={1} style={styles.userName}>
                    {user.displayName || 'ユーザー'}
                  </Text>
                  <Text numberOfLines={1} style={styles.userEmail}>
                    {user.email || ''}
                  </Text>
                </View>
              </View>
              <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
                <View style={styles.navIcon}>
                  <LogOut color={colors.red600} size={22} />
                </View>
                <Text style={styles.logoutText}>ログアウト</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ScrollView style={styles.mainScroll} contentContainerStyle={styles.mainContent}>
        <View style={styles.inner}>{children}</View>
      </ScrollView>

      {!hideChrome && (
        <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('Add')} activeOpacity={0.85}>
          <PlusCircle color={colors.white} size={32} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.gray50,
  },
  menuBtn: {
    position: 'absolute',
    top: 48,
    left: 16,
    zIndex: 40,
    padding: 12,
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gray200,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  modalRoot: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    flex: 1,
    backgroundColor: colors.blackOverlay,
  },
  drawer: {
    width: 288,
    backgroundColor: colors.white,
    borderRightWidth: 1,
    borderRightColor: colors.gray100,
    paddingTop: 56,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  drawerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.indigo600,
  },
  navScroll: { flex: 1 },
  navContent: { paddingHorizontal: 12, gap: 8, paddingBottom: 16 },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
  },
  navRowActive: {
    backgroundColor: colors.indigo600,
    shadowColor: colors.indigo600,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  navIcon: { marginRight: 12 },
  navLabel: { fontSize: 16, fontWeight: '700', color: colors.gray600 },
  navLabelActive: { color: colors.white },
  drawerFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
    backgroundColor: colors.gray50,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.gray100,
    marginBottom: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.indigo100,
    borderWidth: 2,
    borderColor: colors.white,
  },
  userMeta: { marginLeft: 12, flex: 1, minWidth: 0 },
  userName: { fontSize: 14, fontWeight: '700', color: colors.gray900 },
  userEmail: { fontSize: 12, color: colors.gray500, marginTop: 2 },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
  },
  logoutText: { fontSize: 16, fontWeight: '700', color: colors.red600 },
  mainScroll: { flex: 1 },
  mainContent: { paddingTop: 88, paddingBottom: 120, paddingHorizontal: 16 },
  inner: { maxWidth: 448, width: '100%', alignSelf: 'center' },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 32,
    backgroundColor: colors.indigo600,
    width: 64,
    height: 64,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: colors.indigo600,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
});

export default Layout;
