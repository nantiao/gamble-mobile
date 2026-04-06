import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, DevSettings } from 'react-native';
import { colors } from '../theme';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <View style={styles.card}>
            <Text style={styles.title}>エラーが発生しました</Text>
            <Text style={styles.body}>申し訳ありません。予期せぬエラーが発生しました。</Text>
            <ScrollView style={styles.preWrap}>
              <Text style={styles.pre}>{this.state.error?.message}</Text>
            </ScrollView>
            <TouchableOpacity
              style={styles.button}
              onPress={() => {
                if (__DEV__) {
                  DevSettings.reload();
                } else {
                  this.setState({ hasError: false, error: null });
                }
              }}
            >
              <Text style={styles.buttonText}>{__DEV__ ? '再読み込み' : '閉じて続行'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.red50,
    padding: 24,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.red100,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.red600,
    marginBottom: 12,
    textAlign: 'center',
  },
  body: {
    color: colors.gray600,
    marginBottom: 16,
    textAlign: 'center',
  },
  preWrap: {
    maxHeight: 160,
    marginBottom: 16,
    backgroundColor: colors.gray100,
    borderRadius: 8,
    padding: 12,
  },
  pre: {
    fontSize: 11,
    color: colors.gray700,
  },
  button: {
    backgroundColor: colors.indigo600,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 16,
  },
});
