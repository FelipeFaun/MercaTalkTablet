import { Injectable, NgZone, inject, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';
import { TextToSpeech } from '@capacitor-community/text-to-speech';

const DEFAULT_LOCALE = 'es-CL';
const MUTED_KEY = 'mercatalk.voice.muted';

const LOCALE_MAP: Record<string, string> = {
  es: 'es-CL',
  en: 'en-US',
  pt: 'pt-BR',
};

// Web Speech API (no está en las tipificaciones estándar de TS)
type WebRecognition = {
  lang: string; continuous: boolean; interimResults: boolean; maxAlternatives: number;
  onresult: ((event: { results: { 0: { 0: { transcript: string } } } }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void; stop(): void; abort(): void;
};
type WebRecognitionCtor = new () => WebRecognition;

/**
 * Voz → texto y texto → voz.
 * En el APK usa los plugins Capacitor (@capacitor-community/speech-recognition
 * y text-to-speech); en el navegador, la Web Speech API. Un solo lugar para
 * permisos y estado (C2, M1, M2).
 */
@Injectable({
  providedIn: 'root'
})
export class VoiceService {
  private zone = inject(NgZone);
  private readonly native = Capacitor.isNativePlatform();

  private readonly _currentLocale = signal<string>(DEFAULT_LOCALE);
  readonly currentLocale = this._currentLocale.asReadonly();

  readonly isListening = signal(false);
  readonly isSpeaking = signal(false);
  readonly muted = signal(false);
  readonly recognitionSupported = signal(false);

  private webRecognition: WebRecognition | null = null;
  private webUtterance: SpeechSynthesisUtterance | null = null;

  constructor() {
    void this.detectSupport();
    void this.restoreMuted();
  }

  /** Configura el locale según el código de idioma activo ('es', 'en', 'pt') */
  setLocale(langCode: string): void {
    const locale = LOCALE_MAP[langCode] || DEFAULT_LOCALE;
    this._currentLocale.set(locale);
  }

  // ---------- reconocimiento ----------

  /** Escucha una frase y la devuelve; null si se canceló o no se entendió. */
  async listen(): Promise<string | null> {
    if (!this.recognitionSupported() || this.isListening()) return null;
    this.stopSpeaking();
    this.isListening.set(true);
    try {
      return this.native ? await this.listenNative() : await this.listenWeb();
    } catch {
      return null;
    } finally {
      this.isListening.set(false);
    }
  }

  /** Detiene el micrófono de verdad (antes solo cambiaba la bandera, M1). */
  stopListening(): void {
    if (this.native) {
      void SpeechRecognition.stop();
    } else {
      this.webRecognition?.stop();
    }
    this.isListening.set(false);
  }

  private async listenNative(): Promise<string | null> {
    const permission = await SpeechRecognition.requestPermissions();
    if (permission.speechRecognition !== 'granted') return null;
    const { matches } = await SpeechRecognition.start({
      language: this._currentLocale(),
      maxResults: 1,
      partialResults: false,
      popup: false,
    });
    return matches?.[0]?.trim() || null;
  }

  private listenWeb(): Promise<string | null> {
    const Ctor = getWebRecognitionCtor();
    if (!Ctor) return Promise.resolve(null);

    return new Promise(resolve => {
      const recognition = new Ctor();
      this.webRecognition = recognition;
      recognition.lang = this._currentLocale();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      let result: string | null = null;
      recognition.onresult = event => { result = event.results[0][0].transcript?.trim() || null; };
      recognition.onerror = () => { result = null; };
      recognition.onend = () => this.zone.run(() => {
        this.webRecognition = null;
        resolve(result);
      });
      recognition.start();
    });
  }

  // ---------- síntesis ----------

  /** Lee un texto. Si ya estaba hablando, corta lo anterior: la última respuesta manda (M2). */
  async speak(text: string): Promise<void> {
    const clean = cleanForSpeech(text);
    if (this.muted() || !clean) return;
    this.stopSpeaking();
    this.isSpeaking.set(true);
    try {
      if (this.native) {
        await TextToSpeech.speak({ text: clean, lang: this._currentLocale(), rate: 0.95, pitch: 1.0, volume: 1.0 });
        this.isSpeaking.set(false);
      } else {
        await this.speakWeb(clean);
      }
    } catch {
      this.isSpeaking.set(false);
    }
  }

  stopSpeaking(): void {
    if (this.native) {
      void TextToSpeech.stop();
    } else if (typeof speechSynthesis !== 'undefined') {
      this.webUtterance = null;
      speechSynthesis.cancel();
    }
    this.isSpeaking.set(false);
  }

  private speakWeb(text: string): Promise<void> {
    if (typeof speechSynthesis === 'undefined') {
      this.isSpeaking.set(false);
      return Promise.resolve();
    }
    return new Promise(resolve => {
      const utterance = new SpeechSynthesisUtterance(text);
      this.webUtterance = utterance;
      const locale = this._currentLocale();
      utterance.lang = locale;
      utterance.rate = 0.95;

      const voices = speechSynthesis.getVoices();
      const prefix = locale.slice(0, 2).toLowerCase();
      const matchedVoice = voices.find(v => v.lang.toLowerCase().startsWith(prefix));
      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }

      const done = () => this.zone.run(() => {
        // Ignorar el "end" de una locución que ya fue reemplazada
        if (this.webUtterance === utterance) {
          this.webUtterance = null;
          this.isSpeaking.set(false);
        }
        resolve();
      });
      utterance.onend = done;
      utterance.onerror = done;
      speechSynthesis.speak(utterance);
    });
  }

  // ---------- silencio ----------

  async toggleMute(): Promise<void> {
    const muted = !this.muted();
    this.muted.set(muted);
    if (muted) this.stopSpeaking();
    await Preferences.set({ key: MUTED_KEY, value: String(muted) });
  }

  private async restoreMuted(): Promise<void> {
    const { value } = await Preferences.get({ key: MUTED_KEY });
    if (value === 'true') this.muted.set(true);
  }

  private async detectSupport(): Promise<void> {
    if (this.native) {
      try {
        const { available } = await SpeechRecognition.available();
        this.recognitionSupported.set(available);
      } catch {
        this.recognitionSupported.set(false);
      }
    } else {
      this.recognitionSupported.set(getWebRecognitionCtor() !== null && !!navigator.mediaDevices);
    }
  }
}

function getWebRecognitionCtor(): WebRecognitionCtor | null {
  const w = window as unknown as { SpeechRecognition?: WebRecognitionCtor; webkitSpeechRecognition?: WebRecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** Texto apto para leer en voz alta: sin Markdown, emojis ni saltos de línea. */
export function cleanForSpeech(text: string): string {
  return text
    .replace(/[*#`_]/g, '')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
    .replace(/\n+/g, '. ')
    .replace(/\.\s*\./g, '.')
    .replace(/\s+/g, ' ')
    .trim();
}
