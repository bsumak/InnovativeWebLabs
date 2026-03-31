import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FilesetResolver,
  GestureRecognizer,
  type GestureRecognizerResult
} from '@mediapipe/tasks-vision';
import { CATEGORY_ORDER, QUIZZES } from './quizData';
import type { Question, QuizCategory } from './quizTypes';

type AnswerRecord = {
  category: QuizCategory;
  isCorrect: boolean;
};

type GamePhase = 'idle' | 'playing' | 'finished';
type AnswerFeedback = 'correct' | 'wrong' | 'skip' | null;
const QUESTION_TIME_LIMIT = 15;
const HOLD_TO_CONFIRM_MS = 2000;
const NEXT_QUESTION_DELAY_MS = 700;

export default function App() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognizerRef = useRef<GestureRecognizer | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastVideoTimeRef = useRef(-1);

  const heldGestureRef = useRef<string>('None');
  const heldGestureStartRef = useRef<number | null>(null);
  const advanceTimeoutRef = useRef<number | null>(null);
  const isTransitioningRef = useRef(false);
  const phaseRef = useRef<GamePhase>('idle');
  const currentCategoryRef = useRef<QuizCategory>(CATEGORY_ORDER[0]);
  const currentQuestionRef = useRef<Question | undefined>(QUIZZES[CATEGORY_ORDER[0]][0]);
  const questionIndexRef = useRef(0);
  const questionsRef = useRef<Question[]>(QUIZZES[CATEGORY_ORDER[0]]);

  const [cameraReady, setCameraReady] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [liveGesture, setLiveGesture] = useState('None');

  const [phase, setPhase] = useState<GamePhase>('idle');
  const [categoryIndex, setCategoryIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME_LIMIT);
  const [feedback, setFeedback] = useState('Drži pest 2 sekundi za začetek');
  const [gestureHoldProgress, setGestureHoldProgress] = useState(0);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [answerFeedback, setAnswerFeedback] = useState<AnswerFeedback>(null);
  const [isGestureInfoOpen, setIsGestureInfoOpen] = useState(false);

  const currentCategory = CATEGORY_ORDER[categoryIndex];
  const questions = QUIZZES[currentCategory];
  const currentQuestion = questions[questionIndex];

  useEffect(() => {
    phaseRef.current = phase;
    currentCategoryRef.current = currentCategory;
    currentQuestionRef.current = currentQuestion;
    questionIndexRef.current = questionIndex;
    questionsRef.current = questions;
  }, [currentCategory, currentQuestion, phase, questionIndex, questions]);

  const score = useMemo(() => {
    return answers.filter(answer => answer.category === currentCategory && answer.isCorrect).length;
  }, [answers, currentCategory]);

  const progressText = useMemo(() => {
    return `${Math.min(questionIndex + 1, questions.length)} / ${questions.length}`;
  }, [questionIndex, questions.length]);

  const gestureHoldPercentText = useMemo(() => {
    return Math.min(100, Math.floor((gestureHoldProgress * 100) / 10) * 10);
  }, [gestureHoldProgress]);

  useEffect(() => {
    let cancelled = false;

    const setup = async () => {
      try {
        // Dostop do kamere preko browser API (video input za gesture recognition)
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 960, height: 540 },
          audio: false
        });

        if (cancelled) return;

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        setCameraReady(true);

        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm'
        );

        // Inicializacija MediaPipe modela (pre-trained model za prepoznavanje gest)
        const recognizer = await GestureRecognizer.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-tasks/gesture_recognizer/gesture_recognizer.task'
          },
          runningMode: 'VIDEO',
          numHands: 1,
          minHandDetectionConfidence: 0.6,
          minHandPresenceConfidence: 0.6,
          minTrackingConfidence: 0.6,
          cannedGesturesClassifierOptions: {
            categoryAllowlist: ['Closed_Fist', 'Open_Palm', 'Thumb_Down', 'Thumb_Up', 'Victory'],
            scoreThreshold: 0.65
          }
        });

        if (cancelled) {
          recognizer.close();
          return;
        }

        recognizerRef.current = recognizer;
        setModelReady(true);

        // Pošiljanje vsakega frame-a videa modelu
        const renderLoop = () => {
          if (!videoRef.current || !recognizerRef.current) {
            animationFrameRef.current = requestAnimationFrame(renderLoop);
            return;
          }

          const video = videoRef.current;

          if (video.readyState >= 2) {
            const nowMs = performance.now();

            if (video.currentTime !== lastVideoTimeRef.current) {
              // Pošlji video frame modelu in pridobi prepoznano gesto
              const result = recognizerRef.current.recognizeForVideo(video, nowMs);
              handleRecognitionResult(result);
              lastVideoTimeRef.current = video.currentTime;
            }
          }

          animationFrameRef.current = requestAnimationFrame(renderLoop);
        };

        renderLoop();
      } catch (error) {
        console.error('Setup failed:', error);
        setFeedback('Napaka pri inicializaciji kamere ali modela');
      }
    };

    setup();

    return () => {
      cancelled = true;

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      if (advanceTimeoutRef.current) {
        clearTimeout(advanceTimeoutRef.current);
      }

      recognizerRef.current?.close();
      streamRef.current?.getTracks().forEach(track => track.stop());
    };
  }, []);

  useEffect(() => {
    if (phase !== 'playing') return;
    if (isTransitioningRef.current) return;

    if (timeLeft <= 0) {
      saveAnswerAndAdvance(null);
      return;
    }

    const id = window.setTimeout(() => {
      // Časovni limit za vprašanja (countdown)
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => window.clearTimeout(id);
  }, [phase, timeLeft]);

  function resetGestureTracking() {
    heldGestureRef.current = 'None';
    heldGestureStartRef.current = null;
    setGestureHoldProgress(0);
  }

  function clearAdvanceTimeout() {
    if (advanceTimeoutRef.current) {
      clearTimeout(advanceTimeoutRef.current);
      advanceTimeoutRef.current = null;
    }
  }

  function handleRecognitionResult(result: GestureRecognizerResult) {
    const topGesture = result.gestures?.[0]?.[0]?.categoryName ?? 'None';
    setLiveGesture(topGesture);

    if (isTransitioningRef.current) {
      resetGestureTracking();
      return;
    }

    const now = Date.now();

    if (topGesture === 'None') {
      resetGestureTracking();
      return;
    }

    if (heldGestureRef.current !== topGesture) {
      heldGestureRef.current = topGesture;
      heldGestureStartRef.current = now;
      setGestureHoldProgress(0);
      return;
    }

    if (!heldGestureStartRef.current) {
      heldGestureStartRef.current = now;
      setGestureHoldProgress(0);
      return;
    }

    const heldFor = now - heldGestureStartRef.current;
    const progress = Math.min(heldFor / HOLD_TO_CONFIRM_MS, 1);
    setGestureHoldProgress(progress);

    if (heldFor >= HOLD_TO_CONFIRM_MS) {
      const confirmedGesture = topGesture;
      resetGestureTracking();
      onConfirmedGesture(confirmedGesture);
    }
  }

  // Pretvorba gest v akcije
  function onConfirmedGesture(gesture: string) {
    if (isTransitioningRef.current) return;

    if (phaseRef.current === 'idle') {
      if (gesture === 'Closed_Fist') {
        startGame();
      } else if (gesture === 'Victory') {
        nextCategory();
      }
      return;
    }

    if (phaseRef.current === 'finished') {
      if (gesture === 'Closed_Fist') {
        startGame();
      } else if (gesture === 'Victory') {
        nextCategory();
      }
      return;
    }

    if (phaseRef.current !== 'playing') return;

    if (gesture === 'Thumb_Up') {
      saveAnswerAndAdvance(true);
      return;
    }

    if (gesture === 'Thumb_Down') {
      saveAnswerAndAdvance(false);
      return;
    }

    if (gesture === 'Open_Palm') {
      saveAnswerAndAdvance(null);
    }
  }

  function startGame() {
    clearAdvanceTimeout();
    isTransitioningRef.current = false;
    resetGestureTracking();
    setPhase('playing');
    setQuestionIndex(0);
    setTimeLeft(QUESTION_TIME_LIMIT);
    setAnswers([]);
    setAnswerFeedback(null);
    setFeedback('Kviz se je začel');
  }

  function nextCategory() {
    clearAdvanceTimeout();
    isTransitioningRef.current = false;
    resetGestureTracking();
    setCategoryIndex(prev => (prev + 1) % CATEGORY_ORDER.length);
    setPhase('idle');
    setQuestionIndex(0);
    setTimeLeft(QUESTION_TIME_LIMIT);
    setAnswers([]);
    setAnswerFeedback(null);
    setFeedback('Kategorija zamenjana. Drži pest 2 sekundi za začetek');
  }

  function saveAnswerAndAdvance(userAnswer: boolean | null) {
    const question = currentQuestionRef.current;
    const category = currentCategoryRef.current;

    if (!question) return;
    if (isTransitioningRef.current) return;

    isTransitioningRef.current = true;
    clearAdvanceTimeout();
    resetGestureTracking();

    const isCorrect = userAnswer !== null && userAnswer === question.answer;

    const newRecord: AnswerRecord = {
      category,
      isCorrect
    };

    setAnswers(prev => [...prev, newRecord]);

    if (userAnswer === null) {
      setAnswerFeedback('skip');
      setFeedback('Vprašanje preskočeno');
    } else if (isCorrect) {
      setAnswerFeedback('correct');
      setFeedback('Pravilen odgovor');
    } else {
      setAnswerFeedback('wrong');
      setFeedback('Napačen odgovor');
    }

    advanceTimeoutRef.current = window.setTimeout(() => {
      moveToNextQuestion();
    }, NEXT_QUESTION_DELAY_MS);
  }

  function moveToNextQuestion() {
    clearAdvanceTimeout();
    resetGestureTracking();
    setAnswerFeedback(null);

    if (questionIndexRef.current >= questionsRef.current.length - 1) {
      setPhase('finished');
      setFeedback('Kviz zaključen');
      isTransitioningRef.current = false;
      return;
    }

    setQuestionIndex(prev => prev + 1);
    setTimeLeft(QUESTION_TIME_LIMIT);
    setFeedback('Naslednje vprašanje');
    isTransitioningRef.current = false;
  }

  const currentCategoryAnswers = answers.filter(answer => answer.category === currentCategory);

  return (
    <div style={styles.page}>
      <div style={styles.pageGlowTop} />
      <div style={styles.pageGlowBottom} />
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <div style={styles.kicker}>Gesture controlled programming quiz</div>
            <h1 style={styles.title}>GestureQuiz</h1>
            <p style={styles.subtitle}>Programerski kviz z upravljanjem preko gest</p>
          </div>

          <div style={styles.badges}>
            <Badge label="Camera" value={cameraReady ? 'Ready' : 'Loading'} />
            <Badge label="Model" value={modelReady ? 'Ready' : 'Loading'} />
            <Badge label="Gesture" value={liveGesture} />
          </div>
        </div>

        <div style={styles.grid}>
          <section style={styles.leftCard}>
            <div style={styles.sectionTitleRow}>
              <div>
                <div style={styles.sectionEyebrow}>Kamera</div>
                <h2 style={styles.sectionTitle}>Live gesture input</h2>
              </div>
              <button
                type="button"
                style={styles.infoButton}
                onClick={() => setIsGestureInfoOpen(true)}
              >
                Info
              </button>
            </div>

            <div style={styles.videoFrame}>
              <video ref={videoRef} muted playsInline autoPlay style={styles.video} />
              <div style={styles.videoOverlay}>
                <div style={styles.livePill}>Live</div>
                <div style={styles.detectedPill}>{liveGesture}</div>
              </div>
            </div>
          </section>

          <section style={styles.rightCard}>
            <div style={styles.topRow}>
              <div style={styles.metricCard}>
                <div style={styles.label}>Kategorija</div>
                <div style={styles.value}>{currentCategory}</div>
              </div>
              <div style={styles.metricCard}>
                <div style={styles.label}>Vprašanje</div>
                <div style={styles.value}>{progressText}</div>
              </div>
              <div style={styles.metricCard}>
                <div style={styles.label}>Točke</div>
                <div style={styles.value}>{score}</div>
              </div>
              <div style={styles.metricCard}>
                <div style={styles.label}>Čas</div>
                <div style={styles.value}>{timeLeft}s</div>
              </div>
            </div>

            <div style={styles.phaseBox}>
              {phase === 'idle' && (
                <>
                  <h2 style={styles.questionTitle}>Pripravljen za začetek</h2>
                  <div style={styles.hintRow}>
                    <div style={styles.hintChip}>✊ Začetek</div>
                    <div style={styles.hintChip}>✌️ Menjava kategorije</div>
                  </div>
                </>
              )}

              {phase === 'playing' && currentQuestion && (
                <>
                  <h2 style={styles.questionTitle}>{currentQuestion.text}</h2>
                  <div style={styles.hintRow}>
                    <div style={styles.hintChip}>👍 True</div>
                    <div style={styles.hintChip}>👎 False</div>
                    <div style={styles.hintChip}>✋ Preskok</div>
                  </div>
                </>
              )}

              {phase === 'finished' && (
                <>
                  <h2 style={styles.questionTitle}>Kviz zaključen</h2>
                  <div style={styles.resultRow}>
                    <div style={styles.resultCard}>
                      <div style={styles.resultLabel}>Dosežek</div>
                      <div style={styles.resultValue}>
                        {score} / {questions.length}
                      </div>
                    </div>
                    <div style={styles.resultCard}>
                      <div style={styles.resultLabel}>Odgovorjeno</div>
                      <div style={styles.resultValue}>{currentCategoryAnswers.length}</div>
                    </div>
                  </div>
                  <div style={styles.hintRow}>
                    <div style={styles.hintChip}>✊ Ponovni začetek</div>
                    <div style={styles.hintChip}>✌️ Druga kategorija</div>
                  </div>
                </>
              )}

              {answerFeedback && (
                <div
                  style={{
                    ...styles.answerOverlay,
                    color:
                      answerFeedback === 'correct'
                        ? '#22c55e'
                        : answerFeedback === 'wrong'
                          ? '#ef4444'
                          : '#f59e0b'
                  }}
                >
                  {answerFeedback === 'correct' ? '✓' : answerFeedback === 'wrong' ? '✕' : '⏭'}
                </div>
              )}
            </div>

            <div style={styles.progressCard}>
              <div style={styles.progressLabel}>Hold to confirm: {gestureHoldPercentText}%</div>
              <div style={styles.progressOuter}>
                <div
                  style={{
                    ...styles.progressInner,
                    width: `${gestureHoldProgress * 100}%`
                  }}
                />
              </div>
            </div>

            <div style={styles.feedback}>{feedback}</div>
          </section>
        </div>

        {isGestureInfoOpen && (
          <div style={styles.modalBackdrop} onClick={() => setIsGestureInfoOpen(false)}>
            <div style={styles.modalCard} onClick={event => event.stopPropagation()}>
              <div style={styles.modalHeader}>
                <div>
                  <div style={styles.sectionEyebrow}>Pomoč</div>
                  <h2 style={styles.modalTitle}>Razlaga gest</h2>
                </div>
                <button
                  type="button"
                  style={styles.closeButton}
                  onClick={() => setIsGestureInfoOpen(false)}
                >
                  Zapri
                </button>
              </div>

              <div style={styles.modalGrid}>
                <div style={styles.modalItem}>
                  <span style={styles.helpEmoji}>✊</span>
                  <div>
                    <div style={styles.helpTitle}>Začetek / ponovni zagon</div>
                    <div style={styles.helpText}>Zaženi kviz ali začni znova.</div>
                  </div>
                </div>
                <div style={styles.modalItem}>
                  <span style={styles.helpEmoji}>👍</span>
                  <div>
                    <div style={styles.helpTitle}>True</div>
                    <div style={styles.helpText}>Potrdi, da trditev drži.</div>
                  </div>
                </div>
                <div style={styles.modalItem}>
                  <span style={styles.helpEmoji}>👎</span>
                  <div>
                    <div style={styles.helpTitle}>False</div>
                    <div style={styles.helpText}>Označi trditev kot napačno.</div>
                  </div>
                </div>
                <div style={styles.modalItem}>
                  <span style={styles.helpEmoji}>✋</span>
                  <div>
                    <div style={styles.helpTitle}>Preskoči</div>
                    <div style={styles.helpText}>Skoči na naslednje vprašanje.</div>
                  </div>
                </div>
                <div style={styles.modalItem}>
                  <span style={styles.helpEmoji}>✌️</span>
                  <div>
                    <div style={styles.helpTitle}>Naslednja kategorija</div>
                    <div style={styles.helpText}>Zamenjaj temo kviza.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Badge({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.badge}>
      <span style={styles.badgeLabel}>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background:
      'radial-gradient(circle at top left, rgba(56, 189, 248, 0.1), transparent 24%), radial-gradient(circle at bottom right, rgba(37, 99, 235, 0.12), transparent 26%), linear-gradient(180deg, #030712 0%, #0b1120 50%, #111827 100%)',
    color: '#e5eef8',
    fontFamily: '"Segoe UI", "Helvetica Neue", Arial, sans-serif',
    padding: '28px 32px',
    position: 'relative',
    overflow: 'hidden'
  },
  pageGlowTop: {
    position: 'absolute',
    top: -150,
    left: -120,
    width: 420,
    height: 420,
    borderRadius: '50%',
    background: 'rgba(14, 165, 233, 0.12)',
    filter: 'blur(48px)'
  },
  pageGlowBottom: {
    position: 'absolute',
    right: -120,
    bottom: -140,
    width: 420,
    height: 420,
    borderRadius: '50%',
    background: 'rgba(59, 130, 246, 0.12)',
    filter: 'blur(54px)'
  },
  container: {
    maxWidth: 1440,
    margin: '0 auto',
    position: 'relative',
    zIndex: 1
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 24,
    alignItems: 'center',
    marginBottom: 24
  },
  kicker: {
    display: 'inline-flex',
    padding: '6px 12px',
    borderRadius: 999,
    border: '1px solid rgba(56, 189, 248, 0.18)',
    background: 'rgba(15, 23, 42, 0.68)',
    color: '#7dd3fc',
    fontSize: 11,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    marginBottom: 14
  },
  title: {
    margin: 0,
    fontSize: 44,
    lineHeight: 1.05
  },
  subtitle: {
    marginTop: 10,
    color: '#94a3b8',
    maxWidth: 620,
    lineHeight: 1.5,
    fontSize: 16
  },
  badges: {
    display: 'flex',
    gap: 12,
    flexWrap: 'nowrap'
  },
  badge: {
    background: 'rgba(15, 23, 42, 0.88)',
    border: '1px solid rgba(51, 65, 85, 0.88)',
    borderRadius: 16,
    padding: '12px 16px',
    display: 'flex',
    gap: 8,
    alignItems: 'center',
    boxShadow: '0 16px 36px rgba(2, 8, 23, 0.28)'
  },
  badgeLabel: {
    color: '#94a3b8'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(420px, 0.76fr) minmax(760px, 1.24fr)',
    gap: 24,
    alignItems: 'stretch'
  },
  leftCard: {
    background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.96), rgba(8, 15, 28, 0.96))',
    border: '1px solid rgba(51, 65, 85, 0.86)',
    borderRadius: 24,
    padding: 20,
    boxShadow: '0 28px 70px rgba(2, 8, 23, 0.34)'
  },
  rightCard: {
    background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.98), rgba(10, 15, 28, 0.98))',
    border: '1px solid rgba(51, 65, 85, 0.86)',
    borderRadius: 24,
    padding: 24,
    display: 'flex',
    flexDirection: 'column',
    gap: 18,
    boxShadow: '0 28px 70px rgba(2, 8, 23, 0.34)'
  },
  sectionTitleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  infoButton: {
    border: '1px solid rgba(56, 189, 248, 0.18)',
    background: 'rgba(15, 23, 42, 0.78)',
    color: '#e2e8f0',
    borderRadius: 999,
    padding: '8px 14px',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer'
  },
  sectionEyebrow: {
    color: '#38bdf8',
    fontSize: 11,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    marginBottom: 8
  },
  sectionTitle: {
    margin: 0,
    fontSize: 24,
    lineHeight: 1.1
  },
  videoFrame: {
    position: 'relative',
    padding: 10,
    borderRadius: 22,
    background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.92), rgba(14, 165, 233, 0.18))',
    margin: '0 auto'
  },
  video: {
    width: '100%',
    display: 'block',
    borderRadius: 16,
    background: '#000',
    aspectRatio: '16 / 10',
    objectFit: 'cover'
  },
  videoOverlay: {
    position: 'absolute',
    inset: 24,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    pointerEvents: 'none'
  },
  livePill: {
    padding: '8px 12px',
    borderRadius: 999,
    background: 'rgba(15, 23, 42, 0.8)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    color: '#fca5a5',
    fontWeight: 700,
    letterSpacing: '0.04em'
  },
  detectedPill: {
    padding: '8px 12px',
    borderRadius: 999,
    background: 'rgba(15, 23, 42, 0.8)',
    border: '1px solid rgba(56, 189, 248, 0.22)',
    color: '#e2e8f0',
    fontWeight: 700
  },
  helpEmoji: {
    fontSize: 22,
    lineHeight: 1,
    marginTop: 2
  },
  helpTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: '#f8fafc',
    marginBottom: 4
  },
  helpText: {
    fontSize: 13,
    lineHeight: 1.45,
    color: '#94a3b8'
  },
  modalBackdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(2, 8, 23, 0.72)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    zIndex: 20
  },
  modalCard: {
    width: 'min(760px, 100%)',
    background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.98), rgba(10, 15, 28, 0.98))',
    border: '1px solid rgba(51, 65, 85, 0.86)',
    borderRadius: 24,
    padding: 24,
    boxShadow: '0 28px 70px rgba(2, 8, 23, 0.42)'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20
  },
  modalTitle: {
    margin: 0,
    fontSize: 28
  },
  closeButton: {
    border: '1px solid rgba(56, 189, 248, 0.18)',
    background: 'rgba(15, 23, 42, 0.78)',
    color: '#e2e8f0',
    borderRadius: 999,
    padding: '10px 16px',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer'
  },
  modalGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12
  },
  modalItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    padding: '14px 16px',
    borderRadius: 18,
    background: 'rgba(15, 23, 42, 0.62)',
    border: '1px solid rgba(51, 65, 85, 0.76)'
  },
  topRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 12
  },
  metricCard: {
    padding: '16px',
    borderRadius: 18,
    background: 'rgba(15, 23, 42, 0.82)',
    border: '1px solid rgba(51, 65, 85, 0.82)'
  },
  label: {
    color: '#94a3b8',
    fontSize: 12,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: '0.08em'
  },
  value: {
    fontSize: 24,
    fontWeight: 700
  },
  phaseBox: {
    position: 'relative',
    minHeight: 250,
    background: 'linear-gradient(180deg, rgba(7, 12, 24, 0.98), rgba(15, 23, 42, 0.94))',
    borderRadius: 22,
    padding: 26,
    border: '1px solid rgba(51, 65, 85, 0.86)',
    boxShadow: 'inset 0 1px 0 rgba(148, 163, 184, 0.04)'
  },
  questionTitle: {
    fontSize: 34,
    lineHeight: 1.18,
    margin: '0 0 16px 0',
    maxWidth: '18ch'
  },
  hintRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 6
  },
  hintChip: {
    padding: '10px 14px',
    borderRadius: 999,
    background: 'rgba(15, 23, 42, 0.84)',
    border: '1px solid rgba(51, 65, 85, 0.82)',
    color: '#dbe7f5',
    fontSize: 14,
    fontWeight: 600
  },
  resultRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
    marginBottom: 16
  },
  resultCard: {
    padding: '14px 16px',
    borderRadius: 18,
    background: 'rgba(15, 23, 42, 0.82)',
    border: '1px solid rgba(51, 65, 85, 0.82)'
  },
  resultLabel: {
    color: '#94a3b8',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: 8
  },
  resultValue: {
    fontSize: 24,
    fontWeight: 700,
    color: '#f8fafc'
  },
  answerOverlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 108,
    fontWeight: 800,
    background: 'rgba(2, 8, 23, 0.76)',
    pointerEvents: 'none'
  },
  progressCard: {
    padding: 16,
    borderRadius: 18,
    background: 'rgba(15, 23, 42, 0.8)',
    border: '1px solid rgba(51, 65, 85, 0.84)'
  },
  progressLabel: {
    marginBottom: 10,
    color: '#cbd5e1',
    fontWeight: 600
  },
  feedback: {
    fontSize: 16,
    fontWeight: 700,
    color: '#e2e8f0',
    background: 'rgba(14, 165, 233, 0.1)',
    border: '1px solid rgba(56, 189, 248, 0.16)',
    borderRadius: 16,
    padding: '14px 16px'
  },
  progressOuter: {
    height: 12,
    width: '100%',
    background: '#1e293b',
    borderRadius: 999,
    overflow: 'hidden'
  },
  progressInner: {
    height: '100%',
    background: 'linear-gradient(90deg, #38bdf8, #0ea5e9, #22c55e)',
    transition: 'width 0.1s linear'
  }
};
