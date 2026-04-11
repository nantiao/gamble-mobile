/** @type {import('expo/config').ExpoConfig} */
module.exports = {
  expo: {
    name: "GambleShare",
    slug: "gamble-mobile",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "gambleshare",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.gambleshare.app",
      infoPlist: {
        NSCameraUsageDescription: "QRコードのスキャンに使用します。",
        NSPhotoLibraryUsageDescription:
          "収支の写真を選択するために使用します。",
      },
    },
    android: {
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png",
      },
      package: "com.gambleshare.app",
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
    },
    web: {
      output: "single",
      favicon: "./assets/images/favicon.png",
    },
    plugins: [
      [
        "expo-camera",
        {
          cameraPermission:
            "QRコードのスキャンにカメラへのアクセスが必要です。",
        },
      ],
      [
        "expo-image-picker",
        {
          photosPermission:
            "収支の写真を選択するためにフォトライブラリへのアクセスが必要です。",
        },
      ],
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff",
          dark: {
            backgroundColor: "#000000",
          },
        },
      ],
      "expo-web-browser",
    ],
    extra: {
      eas: {
        projectId: "aa70de33-9c81-44a6-b789-0d5b9ad4fb92", // ← この行を追加
      },
      googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "",
      googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? "",
      googleAndroidClientId:
        process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? "",
    },
  },
};
