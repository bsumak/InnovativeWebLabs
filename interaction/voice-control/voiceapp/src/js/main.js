const texts = document.querySelector(".texts");

window.SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();
recognition.interimResults = true;

const synth = window.speechSynthesis;
let voices = [];

recognition.addEventListener("result", (e) => {
    
    const text = Array.from(e.results)
        .map((result) => result[0])
        .map((result) => result.transcript)
        .join("");

    if (e.results[0].isFinal) {
        if (text.includes("hej")) {
            speak("Povej, kaj te muči?");
        }
        if (text.includes("kako si")) {
            speak("Pa super! Petek je! Juhu");
        }
        if (text.includes("maribor")) {
            speak("ŠAMPION!");
        }
        if (text.includes("daj film")) {
            speak("Seveda. Evo");
            window.open("https://www.youtube.com/watch?v=rt1dBr2Jz78");
        }
        if (text.includes("stop")){
            speak("Ugašam...");
            synth.stop();
        }
    }
});

recognition.addEventListener("end", () => {
    recognition.start();
});

recognition.start();

function speak(text) {

    if (synth.speaking) {
        console.error("Currentyl speaking...");
        return;
    }

    const utterThis = new SpeechSynthesisUtterance(text);

    voices = synth.getVoices().sort(function (a, b) {
        const aname = a.name.toUpperCase();
        const bname = b.name.toUpperCase();
    
        if (aname < bname) {
          return -1;
        } else if (aname == bname) {
          return 0;
        } else {
          return +1;
        }
      });

    const selectedOption = "Tina";
    for (let i = 0; i < voices.length; i++) {
        if (voices[i].name === selectedOption) {
          utterThis.voice = voices[i];
          break;
        }
      }

    utterThis.onend = function (event) {
        console.log("SpeechSynthesisUtterance.onend");
    };

    utterThis.onerror = function (event) {
        console.log(event);
        console.error("SpeechSynthesisUtterance.onerror");
    };

    utterThis.pitch = 1.2;
    utterThis.rate = 0.5;
    synth.speak(utterThis);
}