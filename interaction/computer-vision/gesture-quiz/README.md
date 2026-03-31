# GestureQuiz

GestureQuiz je interaktivna React + TypeScript aplikacija, kjer uporabnik rešuje programerski kviz z gestami rok prek kamere, brez uporabe miške ali tipkovnice.

Aplikacija uporablja MediaPipe Gesture Recognizer za zaznavo gest v realnem času.

## Aplikacija

https://green-bay-00a29c903.4.azurestaticapps.net

## Funkcionalnosti

- kviz po kategorijah: JavaScript, Python, HTML, CSS, React, TypeScript
- potrjevanje odgovora z držanjem geste približno 2 sekundi
- geste za odgovor (`true` / `false`)
- preskok vprašanja
- začetek / restart
- menjavo kategorije
- vizualni feedback (`pravilen` / `napačen` / `skip`)
- samodejni prehod na naslednje vprašanje
- prikaz točk, časa in napredka

## Geste

- `✊ Closed_Fist` -> začetek / restart
- `👍 Thumb_Up` -> `TRUE`
- `👎 Thumb_Down` -> `FALSE`
- `✋ Open_Palm` -> `SKIP`
- `✌️ Victory` -> naslednja kategorija

## Zakaj MediaPipe?

Za zaznavo gest aplikacija uporablja MediaPipe Gesture Recognizer, ker:

- omogoča real-time prepoznavo gest brez potrebe po treniranju lastnega modela
- deluje direktno v brskalniku prek WebAssembly
- ima dobro natančnost in optimizacijo za performance
- je enostaven za integracijo v frontend aplikacijo z React
- omogoča cross-platform delovanje na desktopu in mobilnih napravah

Alternativa bi bila treniranje lastnega modela, na primer s TensorFlow, kar pa je za ta use-case:

- časovno zahtevno
- kompleksno
- nepotrebno

## Tehnologije

- React 19
- TypeScript
- Vite
- `@mediapipe/tasks-vision`

## Zagon projekta

### 1. Namestitev

```bash
npm install
```

### 2. Development

```bash
npm run dev
```

### 3. Build

```bash
npm run build
```

### 4. Preview

```bash
npm run preview
```

## Kako uporabljati

1. Dovoli dostop do kamere.
2. Počakaj, da se model naloži.
3. Začni z gesto `✊`.
4. Med vprašanjem drži:
   `👍` za `TRUE`
   `👎` za `FALSE`
   `✋` za `SKIP`
5. Po približno 2 sekundah se odgovor potrdi.
6. Kviz se samodejno nadaljuje.

## Struktura

```text
gesture-quiz/
  src/
    App.tsx
    quizData.ts
    main.tsx
  public/
  package.json
```

## Opombe

- potrebna je kamera
- delovanje je odvisno od svetlobe, položaja roke in kakovosti kamere
- gesto je treba držati približno 2 sekundi

## Možne izboljšave

- več vprašanj in kategorij
- shranjevanje rezultatov
- statistika po kvizu
- zvok za pravilen / napačen odgovor
- multiplayer
- AI generiran kviz
- lokalizacija (`SLO` / `ENG`)
