import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { collection, query, where, orderBy, onSnapshot, getDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, Comment as CommentType } from '../types';
import { X, Send, MessageCircle } from 'lucide-react-native';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { colors } from '../theme';

interface CommentModalProps {
  entryId: string;
  currentUser: { uid: string };
  onClose: () => void;
  onAddComment: (entryId: string, text: string) => Promise<void>;
}

const avatarUri = (uid: string, photoURL?: string) =>
  photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${uid}`;

function commentTimeMs(c: CommentType): number {
  const t = c.createdAt as unknown;
  if (typeof t === 'number') return t;
  if (t && typeof (t as { toMillis?: () => number }).toMillis === 'function') {
    return (t as { toMillis: () => number }).toMillis();
  }
  return Date.now();
}

const CommentModal: React.FC<CommentModalProps> = ({ entryId, onClose, onAddComment }) => {
  const [comments, setComments] = useState<(CommentType & { user?: UserProfile })[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'comments'), where('entryId', '==', entryId), orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const commentData = snapshot.docs.map((d) => ({
        ...d.data(),
        id: d.id,
      })) as CommentType[];

      const userIds = Array.from(new Set(commentData.map((c) => c.uid)));
      const profiles: { [key: string]: UserProfile } = {};

      await Promise.all(
        userIds.map(async (uid) => {
          const profileSnap = await getDoc(doc(db, 'users', uid));
          if (profileSnap.exists()) {
            profiles[uid] = profileSnap.data() as UserProfile;
          }
        }),
      );

      const combined = commentData.map((c) => ({
        ...c,
        user: profiles[c.uid],
      }));

      setComments(combined);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [entryId]);

  const handleSubmit = async () => {
    if (!newComment.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onAddComment(entryId, newComment);
      setNewComment('');
    } catch (err) {
      console.error('Failed to add comment:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible animationType="fade" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <MessageCircle color={colors.indigo600} size={22} />
              <Text style={styles.headerTitle}>コメント</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <X color={colors.gray400} size={24} />
            </TouchableOpacity>
          </View>

          <View style={styles.list}>
            {loading ? (
              <View style={styles.loader}>
                <ActivityIndicator color={colors.indigo600} />
              </View>
            ) : comments.length > 0 ? (
              comments.map((comment) => (
                <View key={comment.id} style={styles.commentRow}>
                  <Image
                    source={{ uri: avatarUri(comment.uid, comment.user?.photoURL) }}
                    style={styles.cAvatar}
                  />
                  <View style={styles.cBody}>
                    <View style={styles.bubble}>
                      <Text style={styles.cName}>{comment.user?.displayName}</Text>
                      <Text style={styles.cText}>{comment.text}</Text>
                    </View>
                    <Text style={styles.cTime}>{format(commentTimeMs(comment), 'MM/dd HH:mm', { locale: ja })}</Text>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.empty}>
                <MessageCircle color={colors.gray200} size={48} />
                <Text style={styles.emptyText}>まだコメントはありません</Text>
              </View>
            )}
          </View>

          <View style={styles.inputBar}>
            <TextInput
              style={styles.input}
              value={newComment}
              onChangeText={setNewComment}
              placeholder="コメントを入力..."
              placeholderTextColor={colors.gray400}
              editable={!isSubmitting}
              onSubmitEditing={handleSubmit}
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!newComment.trim() || isSubmitting) && styles.sendBtnOff]}
              onPress={handleSubmit}
              disabled={!newComment.trim() || isSubmitting}
            >
              <Send color={colors.white} size={20} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '82%',
    paddingBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 18, fontWeight: '900', color: colors.gray900 },
  list: { padding: 20, minHeight: 160, maxHeight: 360 },
  loader: { paddingVertical: 40, alignItems: 'center' },
  commentRow: { flexDirection: 'row', marginBottom: 18 },
  cAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.gray100 },
  cBody: { flex: 1, marginLeft: 12 },
  bubble: {
    backgroundColor: colors.gray50,
    padding: 14,
    borderRadius: 16,
    borderTopLeftRadius: 4,
  },
  cName: { fontSize: 13, fontWeight: '700', color: colors.gray900, marginBottom: 4 },
  cText: { fontSize: 14, color: colors.gray700 },
  cTime: { fontSize: 10, color: colors.gray400, marginTop: 4, marginLeft: 8 },
  empty: { alignItems: 'center', paddingVertical: 32 },
  emptyText: { marginTop: 12, color: colors.gray400, fontWeight: '600' },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 10,
    backgroundColor: colors.gray50,
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
  },
  input: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.gray200,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.gray900,
  },
  sendBtn: {
    backgroundColor: colors.indigo600,
    padding: 14,
    borderRadius: 14,
  },
  sendBtnOff: { opacity: 0.45 },
});

export default CommentModal;
