import { useEffect, useRef, useState } from 'react'

function speechRecognitionConstructor() {
  if (typeof window === 'undefined') return null
  return window.SpeechRecognition || window.webkitSpeechRecognition || null
}

export function useSpeech(onFinalTranscript) {
  const recognitionRef = useRef(null)
  const onFinalRef = useRef(onFinalTranscript)
  const [isListening, setIsListening] = useState(false)
  const [interimTranscript, setInterimTranscript] = useState('')
  const isSupported = Boolean(speechRecognitionConstructor())

  useEffect(() => { onFinalRef.current = onFinalTranscript }, [onFinalTranscript])
  useEffect(() => () => recognitionRef.current?.stop(), [])

  function stop() { recognitionRef.current?.stop() }

  function start() {
    const SpeechRecognition = speechRecognitionConstructor()
    if (!SpeechRecognition || isListening) return
    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'
    recognition.onresult = (event) => {
      let finalText = ''
      let interimText = ''
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index]
        if (result.isFinal) finalText += result[0].transcript
        else interimText += result[0].transcript
      }
      if (finalText.trim()) onFinalRef.current?.(finalText.trim())
      setInterimTranscript(interimText)
    }
    recognition.onend = () => { setIsListening(false); setInterimTranscript('') }
    recognition.onerror = () => { setIsListening(false); setInterimTranscript('') }
    recognitionRef.current = recognition
    recognition.start()
    setIsListening(true)
  }

  return { isSupported, isListening, interimTranscript, start, stop }
}
