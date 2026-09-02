/**
 * AdMob modulune tek giris noktasi.
 *
 * `react-native-google-mobile-ads` yalnizca native calisir. Web
 * paketine girdiginde `codegenNativeComponent` importu yuzunden BUTUN
 * uygulama derlenmiyor ve tek bir ekran bile acilmiyor -- bu, tarayicida
 * gorsel dogrulama yapmayi da imkansiz kiliyordu.
 *
 * Dinamik `import()` yetmez: Metro dinamik importlari da statik olarak
 * izler ve modulu yine paketin icine alir. Platform uzantisi (`.web.ts`)
 * ise cozumleme zamaninda ayrisir, yani web paketine hic girmez.
 */
export async function loadAdMob(): Promise<typeof import("react-native-google-mobile-ads") | null> {
  try {
    return await import("react-native-google-mobile-ads");
  } catch {
    return null;
  }
}

export const adMobAvailable = true;
