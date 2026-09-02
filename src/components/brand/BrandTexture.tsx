import React from "react";
import { View, StyleSheet } from "react-native";
import Svg, { Path, G } from "react-native-svg";
import { colors } from "@/src/theme";

/**
 * Marka dokusu — `RainBackground`'ın yerine.
 *
 * Eskisi 28 animasyonlu damla çiziyordu. Bir tanışma uygulamasında ambiyans
 * arayan bir fikirdi ama sonucu tam olarak reddedilen nitelikti: hareketli,
 * oyunsu, ekran koruyucu gibi. Bumble'ın karşılama ekranında hiçbir şey
 * hareket etmez.
 *
 * Yerine markanın kendi formu: işaretin yayı, çok düşük opaklıkta, sabit ve
 * seyrek. Bumble'ın peteğinin yaptığı iş bu — dekorasyon değil, kimliğin
 * tekrarı. Hareket yok, dolayısıyla `prefers-reduced-motion` sorunu da yok
 * ve her karede sıfır iş yapıyor.
 */

const ARC =
  "M 60 8 C 31 8 8 31 8 60 C 8 89 31 112 60 112";

interface Props {
  /** Doku yoğunluğu. Karşılama gibi boş ekranlarda biraz daha görünür. */
  intensity?: "faint" | "soft";
}

export function BrandTexture({ intensity = "faint" }: Props) {
  const opacity = intensity === "soft" ? 0.055 : 0.035;

  // Kaydırılmış ızgara: aynı yay iki yönde tekrar ediyor. Düz ızgara
  // duvar kağıdı gibi duruyordu; kaydırma onu dokuya çeviriyor.
  // Ilk denemede yaylar 120 birimdi ve doku degil CEMBER okunuyordu:
  // goz onlari tek tek sekil olarak seciyordu. Kucultup siklastirmak
  // onlari arka plana itiyor.
  const rows = Array.from({ length: 13 }, (_, i) => i);
  const cols = Array.from({ length: 7 }, (_, i) => i);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%" viewBox="0 0 460 900">
        {rows.map((r) =>
          cols.map((c) => {
            const x = c * 74 + (r % 2 ? 37 : 0) - 20;
            const y = r * 76 - 16;
            const flip = (r + c) % 2 === 0;
            return (
              <G
                key={`${r}-${c}`}
                transform={`translate(${x} ${y}) scale(${flip ? 0.42 : -0.42} 0.42) translate(${flip ? 0 : -120} 0)`}
              >
                <Path
                  d={ARC}
                  stroke={colors.primary}
                  strokeWidth={13}
                  strokeLinecap="round"
                  fill="none"
                  opacity={opacity}
                />
              </G>
            );
          })
        )}
      </Svg>
    </View>
  );
}
