import React from "react";
import Svg, { Path } from "react-native-svg";
import { colors } from "@/src/theme";

/**
 * Conversa işareti — "iki yay".
 *
 * İki kalın yay birbirine dönük, aralarında bir boşluk. İki okuması var ve
 * ikisi de doğru: iki insan yüz yüze, ya da açılan bir tırnak işareti —
 * konuşmanın başladığı yer.
 *
 * Onsekiz kavram arasından bunu seçen şey büyük hâli değil, 16 piksel hâli
 * oldu: kırlangıç orada koyu bir lekeye dönüşüyor, düğüm okunmuyor, çift-C
 * "CC" okunuyor. Yalnızca bu dört ölçekte de ayakta kalıyor.
 *
 * Tek renk ve `currentColor` mantığıyla çalışıyor: renk `color` propundan
 * geliyor, varsayılanı marka pirinci.
 */

const VIEW_BOX = "311.4 311.7 1426.3 1426.3";

const LEFT_ARC =
  "M 807.554 595.414 C 831.615 593.415 859.181 599.72 879.723 612.566 C 905.876 628.95 924.469 655.031 931.43 685.097 " +
  "C 946.045 748.636 901.067 810.227 838.064 821.016 C 822.583 823.358 807.397 824.255 792.053 827.714 " +
  "C 686.592 851.483 614.515 959.016 638.936 1065.81 C 656.345 1143.41 716.997 1203.97 794.617 1221.27 " +
  "C 826.05 1228.44 849.688 1224.91 878.994 1243.84 C 905.684 1261.08 924.636 1285.89 931.539 1317.23 " +
  "C 937.992 1346.27 932.421 1376.67 916.097 1401.53 C 897.492 1430.18 869.828 1446.01 836.97 1452.83 " +
  "C 813.373 1456.4 791.661 1454.07 768.298 1450.11 C 689.236 1436.01 615.656 1400.19 555.783 1346.67 " +
  "C 467.831 1268.88 415.32 1158.65 410.333 1041.33 C 398.683 818.122 583.095 607.116 807.554 595.414 z";

const RIGHT_ARC =
  "M 1224.99 595.396 C 1226.23 595.208 1227.32 595.075 1228.57 595.071 C 1329.64 594.756 1432.27 644.063 1504.01 712.536 " +
  "C 1587.08 790.542 1635.75 898.363 1639.29 1012.26 C 1642.05 1127.58 1598.47 1239.2 1518.3 1322.14 " +
  "C 1445.78 1397.77 1339.54 1451 1233.97 1453.31 C 1203.69 1452.88 1179.89 1446 1155.95 1426.55 " +
  "C 1133.44 1407.94 1119.11 1381.25 1116.04 1352.2 C 1110.77 1297.72 1144.94 1247.18 1197.45 1231.77 " +
  "C 1222.19 1224.66 1244.22 1226.6 1270.84 1217.05 C 1307.77 1203.8 1341.93 1183.01 1367.06 1152.51 " +
  "C 1401.87 1110.98 1418.4 1057.13 1412.91 1003.22 C 1403.99 921.427 1346.39 853.195 1267.26 830.667 " +
  "C 1227.51 819.358 1190.63 825.081 1156.93 795.641 C 1076.4 725.29 1120.51 604.684 1224.99 595.396 z";

interface MarkProps {
  size?: number;
  color?: string;
  /**
   * İki yayı ayrı renklendirir. Kimlik kullanımında tek renk doğrudur;
   * bu yalnızca "iki ses" anlatımının istendiği yerler için (karşılama
   * ekranı gibi).
   */
  secondColor?: string;
}

export function Mark({ size = 32, color = colors.primary, secondColor }: MarkProps) {
  return (
    <Svg width={size} height={size} viewBox={VIEW_BOX} accessibilityRole="image">
      <Path d={LEFT_ARC} fill={color} />
      <Path d={RIGHT_ARC} fill={secondColor ?? color} />
    </Svg>
  );
}
