/**
 * Turkce'de buyuk harf `toUpperCase()` DEGILDIR.
 *
 * "ogreniyor" -> `toUpperCase()` -> "OGRENIYOR"  (noktasiz I -- yanlis)
 *              -> `toLocaleUpperCase("tr")` -> "OGRENIYOR" dogru bicimiyle
 *                 noktali I uretir.
 *
 * Ayni sorun `textTransform: "uppercase"` icin de gecerli: RN ve tarayici
 * bunu dilden bagimsiz uyguluyor, dolayisiyla Turkce arayuzde "İ" harfi
 * "I"ya dusuyor. Bir Turk kullanicinin gozunde bu yazim hatasidir ve
 * uygulamanin dili bilmedigini soyler -- bir DIL uygulamasi icin pahali
 * bir izlenim.
 *
 * Cozum: buyuk harfe cevirmeyi stile birakmayip burada, dile gore yapmak.
 */
export function upperLocale(text: string, language?: string): string {
  const lang = (language ?? "").toLowerCase();
  // Azerice ve Kazakca da ayni noktali/noktasiz I ayrimini kullaniyor.
  if (lang.startsWith("tr") || lang.startsWith("az")) {
    return text.toLocaleUpperCase("tr-TR");
  }
  return text.toLocaleUpperCase();
}
