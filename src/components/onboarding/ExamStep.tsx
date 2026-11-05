import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { colors, spacing, radius, elevation, textStyles } from "@/src/theme";
import { api } from "@/src/services/api";
import { languageLabel } from "@/src/data/languages";
import { Overline } from "@/src/components/ui/Overline";
import { useAiConsentGate } from "@/src/components/AiConsentSheet";

type ExamItem = {
  id: string;
  kind: "written" | "spoken";
  prompt: string;
  seconds: number;
};

export interface ExamOutcome {
  language: string;
  role: "NATIVE" | "LEARNING";
  cefr: string | null;
  /** Istenen rol NATIVE olup dogrulanmadiysa true. Bir HATA DEGIL. */
  downgraded: boolean;
  /** An earlier, still-valid proof was reused; the exam was skipped. */
  reused?: boolean;
}

interface Props {
  language: string;
  role?: "NATIVE" | "LEARNING";
  onComplete: (outcome: ExamOutcome) => void;
  /**
   * Verildiginde sinav kendi dugmesini CIZMEZ; eylemi kabugun sabit alt
   * cubuguna devreder.
   *
   * Sinavin dugmesi icerigin akisinda, en altta duruyordu. Klavye acilinca
   * -- ki bu ekranda klavye hep acik, cevap yaziliyor -- dugme ekranin
   * disina tasiyor, geriye yalnizca bir serit kaliyordu. Ustelik her sorunun
   * suresi isliyor: kullanici cevabi yazip gonderecek yeri ARIYORDU.
   *
   * Kabugun alt cubugu klavyeyi zaten dogru kacirtiyor ve diger butun
   * adimlar oradan ilerliyor; sinavin farkli davranmasi icin bir sebep yok.
   */
  onAction?: (action: { label: string; busy: boolean; run: () => void }) => void;
}

/**
 * Dil kontrolu.
 *
 * Madde basina sure siniri var ve geri donus yok: sozluge bakacak vakit
 * birakmak, olcmeye calistigimiz seyi (akicilik) olculemez hale getirir.
 *
 * Sesli gorev web'de calismaz (kayit izni yok), o yuzden web'de yazili
 * bir yedek gorev gosterilir. Cihazda mevcut ses kaydi bileseni kullanilir.
 */
export function ExamStep({ language, role = "LEARNING", onComplete, onAction }: Props) {
  const { t, i18n } = useTranslation();

  const [items, setItems] = useState<ExamItem[] | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [remaining, setRemaining] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<ExamOutcome | null>(null);
  /** Degerlendirme kesintiye ugradiysa cevaplari saklayip tekrar gondeririz. */
  const [retryable, setRetryable] = useState<string[] | null>(null);

  // Answers are scored by an external AI model, so the exam must not start
  // (its timer runs immediately) until the user has agreed to that.
  const { consent, requireAiConsent, handleAiError, consentSheet } = useAiConsentGate();
  const consentOk = consent === "granted";

  // Zamanlayici, cevabi "suresi doldu" anında oldugu gibi almali; bu yuzden
  // taslak bir ref'te de tutuluyor (setState kapanisi eskir).
  const draftRef = useRef("");
  draftRef.current = draft;

  useEffect(() => {
    let cancelled = false;
    api
      .getExamItems(language, role)
      .then((res) => {
        if (cancelled) return;
        // Already passed this language (e.g. onboarding was interrupted
        // after the exam): reuse the proof instead of running into the
        // 7-day retake cooldown (contract 7).
        const proof = res.data.existingProof;
        if (proof) {
          setOutcome({
            language: proof.language,
            role: proof.role,
            cefr: proof.cefr,
            downgraded: role === "NATIVE" && proof.role === "LEARNING",
            reused: true,
          });
          return;
        }
        setItems(res.data.items);
        setRemaining(res.data.items[0]?.seconds ?? 60);
      })
      .catch((e: any) => {
        if (cancelled) return;
        setError(
          e?.response?.data?.error?.code === "EXAM_COOLDOWN"
            ? t("exam.cooldown")
            : t("exam.load_error")
        );
      });
    return () => {
      cancelled = true;
    };
  }, [language, role, t]);

  const submitAll = useCallback(
    async (finalAnswers: string[]) => {
      setSubmitting(true);
      setError(null);
      try {
        const res = await api.submitExam(language, role, finalAnswers);
        const result: ExamOutcome = {
          language: res.data.language,
          role: res.data.role,
          cefr: res.data.cefr,
          downgraded: role === "NATIVE" && res.data.role === "LEARNING",
        };
        setOutcome(result);
      } catch (e: any) {
        const code = e?.response?.data?.error?.code;
        if (handleAiError(e, "ai")) {
          // Consent missing/revoked: keep the answers and let them resend
          // after allowing (the sheet is showing now).
          setError(t("ai_consent.exam_required"));
          setRetryable(finalAnswers);
        } else if (code === "EXAM_UNAVAILABLE") {
          // Degerlendirme yapilamadi: bir sonuc degil, bir kesinti.
          // Kullanici bekleme suresine takilmadan hemen tekrar
          // deneyebilir, o yuzden cevaplari koruyup yeniden gonderme
          // imkani veriyoruz.
          setError(t("exam.unavailable"));
          setRetryable(finalAnswers);
        } else {
          setError(code === "EXAM_COOLDOWN" ? t("exam.cooldown") : t("exam.submit_error"));
        }
      } finally {
        setSubmitting(false);
      }
    },
    [language, role, t, handleAiError]
  );

  const advance = useCallback(() => {
    if (!items) return;
    const next = [...answers, draftRef.current.trim() || "—"];
    setAnswers(next);
    setDraft("");

    if (index + 1 >= items.length) {
      void submitAll(next);
      return;
    }
    setIndex(index + 1);
    setRemaining(items[index + 1].seconds);
  }, [items, answers, index, submitAll]);

  // Geri sayim. Sure dolunca cevap oldugu gibi alinir ve sonraki maddeye
  // gecilir; kullaniciyi beklemek olcumu bozar.
  useEffect(() => {
    if (!items || outcome || submitting || !consentOk) return;
    if (remaining <= 0) {
      advance();
      return;
    }
    const timer = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(timer);
  }, [remaining, items, outcome, submitting, advance, consentOk]);

  /**
   * Sinavin eylemini kabugun alt cubuguna bildir.
   *
   * Bu kanca BUTUN erken donuslerden once durmali: bir ara bunu `items`
   * cozuldukten sonraya koymustum ve React "Rendered more hooks than during
   * the previous render" ile ekrani dusurdu -- yukleme ekranindan soru
   * ekranina gecerken kanca sayisi degisiyordu.
   */
  const total = items?.length ?? 0;
  const isLastItem = total > 0 && index + 1 >= total;
  const actionLabel = submitting
    ? t("exam.submitting")
    : isLastItem
      ? t("exam.finish")
      : t("common.continue");
  const showAction = !!items && !outcome;
  const consentLabel = t("ai_consent.exam_cta");
  const continueLabel = t("common.continue");
  // Callers pass an inline onComplete; a ref keeps it out of the effect deps
  // (otherwise the effect would re-emit the action on every render).
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  useEffect(() => {
    if (outcome) {
      // The shell button must not keep the stale "Finish" action.
      onAction?.({ label: continueLabel, busy: false, run: () => onCompleteRef.current(outcome) });
      return;
    }
    if (!showAction) return;
    if (!consentOk) {
      onAction?.({ label: consentLabel, busy: false, run: () => void requireAiConsent("ai") });
      return;
    }
    onAction?.({ label: actionLabel, busy: submitting, run: advance });
  }, [showAction, onAction, actionLabel, submitting, advance, consentOk, consentLabel,
      continueLabel, outcome, requireAiConsent]);

  // Every early return below shares the consent sheet.
  const renderBody = (): React.ReactElement => {
    if (outcome) {
      return (
        <View style={styles.container} testID="exam-result">
          <Text style={styles.title}>{t("exam.result_title")}</Text>

          <View style={styles.badgeCard}>
            <View style={styles.badgeIcon}>
              <MaterialIcons name="verified" size={28} color={colors.textInverse} />
            </View>
            <View style={{ flex: 1 }}>
              <Overline style={styles.badgeLanguage}>{outcome.language}</Overline>
              <Text style={styles.badgeLevel}>
                {outcome.cefr ?? t("exam.level_unknown")}
              </Text>
            </View>
            {/* KASITLI: "dogrulandi", asla "sertifika". AI'in CEFR takdiri
                yaklasiktir ve arayuz bunu yansitmalidir. */}
            <Text style={styles.badgeVerified}>{t("exam.verified")}</Text>
          </View>

          {outcome.downgraded ? (
            <View style={styles.noticeCard} testID="exam-downgraded">
              <MaterialIcons name="info-outline" size={22} color={colors.info} />
              {/* Sakin ve suclamayan metin: hesap acik, hicbir sey kaybedilmedi. */}
              <Text style={styles.noticeText}>{t("exam.downgraded")}</Text>
            </View>
          ) : null}

          {outcome.reused ? (
          <Text style={styles.footnote} testID="exam-reused">{t("ai_consent.exam_reused")}</Text>
        ) : null}
        <Text style={styles.footnote}>{t("exam.retake_note")}</Text>

          <TouchableOpacity
            testID="exam-continue"
            style={styles.primaryButton}
            onPress={() => onComplete(outcome)}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryButtonText}>{t("common.continue")}</Text>
            <MaterialIcons name="arrow-forward" size={20} color={colors.textInverse} />
          </TouchableOpacity>
        </View>
      );
    }

    if (error && !items) {
      return (
        <View style={styles.container}>
          <View style={styles.noticeCard}>
            <MaterialIcons name="info-outline" size={24} color={colors.info} />
            <Text style={styles.noticeText}>{error}</Text>
          </View>
        </View>
      );
    }

    if (!items) {
      return (
        <View style={[styles.container, styles.center]} testID="exam-loading">
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.subtitle}>{t("exam.loading")}</Text>
        </View>
      );
    }

    if (retryable) {
      return (
        <View style={styles.container} testID="exam-retry">
          {/* Baslik OnboardingShell te; burada da yazilinca ekranda iki baslik olusuyordu. */}
          <View style={styles.noticeCard}>
            <MaterialIcons name="cloud-off" size={22} color={colors.warning} />
            <Text style={styles.noticeText}>{error ?? t("exam.unavailable")}</Text>
          </View>
          <TouchableOpacity
            testID="exam-retry-button"
            style={[styles.primaryButton, submitting && styles.primaryButtonDisabled]}
            onPress={() => {
              setRetryable(null);
              setError(null);
              void submitAll(retryable);
            }}
            disabled={submitting}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryButtonText}>
              {submitting ? t("exam.submitting") : t("exam.retry")}
            </Text>
          </TouchableOpacity>
          <Text style={styles.footnote}>{t("exam.unavailable_note")}</Text>
        </View>
      );
    }

    if (!consentOk) {
      return (
        <View style={styles.container} testID="exam-consent">
          <View style={styles.noticeCard}>
            <MaterialIcons name="privacy-tip" size={22} color={colors.info} />
            <Text style={styles.noticeText}>{t("ai_consent.exam_required")}</Text>
          </View>
          {onAction ? null : (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => void requireAiConsent("ai")}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryButtonText}>{t("ai_consent.exam_cta")}</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }


    const item = items[index];
    const isLast = index + 1 >= items.length;

    return (
      <View style={styles.container} testID="exam-question">
        <View style={styles.progressRow}>
          <Overline style={styles.progressText}>
            {t("exam.progress", { current: index + 1, total: items.length })}
          </Overline>
          <View style={[styles.timer, remaining <= 10 && styles.timerLow]}>
            <MaterialIcons
              name="timer"
              size={16}
              color={remaining <= 10 ? colors.error : colors.textSecondary}
            />
            <Text style={[styles.timerText, remaining <= 10 && styles.timerTextLow]}>
              {remaining}s
            </Text>
          </View>
        </View>

        <Text style={styles.prompt}>{item.prompt}</Text>

        {/* Soru hedef dilde, arayuz kullanicinin dilinde. Hangi dilde cevap
            verilecegi SOYLENMEZSE kullanici kendi dilinde yazar ve olcmeye
            calistigimiz sey olculemez. Gorsel incelemede yakalandi. */}
        <View style={styles.answerHint}>
          <MaterialIcons name="edit" size={16} color={colors.primaryTintText} />
          <Text style={styles.answerHintText}>
            {t("exam.answer_in", { language: languageLabel(language, i18n.language) })}
          </Text>
        </View>

        <TextInput
          testID="exam-answer"
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder={t("exam.answer_placeholder")}
          placeholderTextColor={colors.textTertiary}
          multiline
          autoFocus
          textAlignVertical="top"
          maxLength={2000}
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {/* Esnek bosluk: sinavin dugmesi de diger adimlardaki gibi ekranin
            altinda dursun, sorunun hemen altinda degil. */}
        <View style={styles.spacer} />

        {onAction ? null : (
        <TouchableOpacity
          testID="exam-next"
          style={[styles.primaryButton, submitting && styles.primaryButtonDisabled]}
          onPress={advance}
          disabled={submitting}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryButtonText}>
            {submitting
              ? t("exam.submitting")
              : isLast
                ? t("exam.finish")
                : t("common.continue")}
          </Text>
          {!submitting ? (
            <MaterialIcons name="arrow-forward" size={20} color={colors.textInverse} />
          ) : null}
        </TouchableOpacity>
        )}

        <Text style={styles.footnote}>{t("exam.no_back")}</Text>
      </View>
    );
  };

  return (
    <>
      {renderBody()}
      {consentSheet}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    // Yatay bosluk OnboardingShell'in isi; burada tekrarlaninca sinav
    // icerigi diger adimlardan bir kademe daha iceride duruyordu.
    flex: 1,
  },
  spacer: { flex: 1, minHeight: spacing.lg },
  center: {
    alignItems: "center",
    gap: spacing.md,
    paddingTop: spacing.xxl,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
  },
  progressText: {
    ...textStyles.labelSmall,
    color: colors.textSecondary,
  },
  timer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceElevated,
  },
  timerLow: {
    backgroundColor: colors.passRedSoft,
  },
  timerText: {
    ...textStyles.labelSmall,
    color: colors.textSecondary,
  },
  timerTextLow: {
    color: colors.error,
  },
  title: {
    ...textStyles.title,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...textStyles.body,
    color: colors.textSecondary,
  },
  prompt: {
    ...textStyles.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  input: {
    ...textStyles.body,
    color: colors.text,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    minHeight: 140,
    marginBottom: spacing.md,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    minHeight: 52,
    ...elevation.sm,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    ...textStyles.label,
    color: colors.textInverse,
  },
  badgeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: colors.primaryTintBorder,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...elevation.md,
  },
  badgeIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
  },
  badgeLanguage: {
    ...textStyles.labelSmall,
    color: colors.textSecondary,
  },
  badgeLevel: {
    ...textStyles.title,
    color: colors.text,
  },
  badgeVerified: {
    ...textStyles.labelSmall,
    color: colors.success,
  },
  noticeCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  noticeText: {
    ...textStyles.bodySmall,
    color: colors.textSecondary,
    flex: 1,
  },
  errorText: {
    ...textStyles.bodySmall,
    color: colors.error,
    marginBottom: spacing.md,
  },
  footnote: {
    // textTertiary koyu zeminde okunmuyordu; bu satir kullaniciya geri
    // donus olmadigini soyluyor, yani atlanmamasi gereken bir uyari.
    ...textStyles.caption,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.md,
  },
  answerHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    alignSelf: "flex-start",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryTint,
    borderWidth: 1,
    borderColor: colors.primaryTintBorder,
    marginBottom: spacing.md,
  },
  answerHintText: {
    ...textStyles.labelSmall,
    color: colors.primaryTintText,
  },
});
