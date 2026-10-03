import { useEffect, useState, type PropsWithChildren } from 'react';
import { Platform } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { Lora_600SemiBold } from '@expo-google-fonts/lora/600SemiBold';
import { Manrope_400Regular } from '@expo-google-fonts/manrope/400Regular';
import { Manrope_500Medium } from '@expo-google-fonts/manrope/500Medium';
import { Manrope_600SemiBold } from '@expo-google-fonts/manrope/600SemiBold';
import { Manrope_700Bold } from '@expo-google-fonts/manrope/700Bold';
if (Platform.OS !== 'web')
  void SplashScreen.preventAutoHideAsync().catch(() => undefined);
export function FontProvider({ children }: PropsWithChildren) {
  const [timedOut, setTimedOut] = useState(false);
  const [loaded, error] = useFonts({
    ...Feather.font,
    Lora_600SemiBold,
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
  });
  useEffect(() => {
    if (Platform.OS === 'web' || loaded || error) return;
    const timer = setTimeout(() => setTimedOut(true), 8000);
    return () => clearTimeout(timer);
  }, [loaded, error]);
  useEffect(() => {
    if (loaded || error || timedOut)
      void SplashScreen.hideAsync().catch(() => undefined);
  }, [loaded, error, timedOut]);
  // Expo records useFonts during static export. Do not erase server-rendered web content.
  if (Platform.OS !== 'web' && !loaded && !error && !timedOut) return null;
  return children;
}
