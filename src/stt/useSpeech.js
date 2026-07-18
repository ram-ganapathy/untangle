import { useEffect, useRef, useState } from 'react'

function speechRecognitionConstructor() {
  if (typeof window === 'undefined') return null
  return window.SpeechRecognition || window.webkitSpeechRecognition || null
}

const terminalErrors = new Set(['not-allowed', 'service-not-allowed', 'audio-capture', 'language-not-supported'])

export function useSpeech(onFinalTranscript) {
  const recognitionRef = useRef(null)
  const restartTimerRef = useRef(null)
  const shouldListenRef = useRef(false)
  const onFinalRef = useRef(onFinalTranscript)
  const [isListening, setIsListening] = useState(false)
  const [interimTranscript, setInterimTranscript] = useState('')
  const isSupported = Boolean(speechRecognitionConstructor())

  useEffect(() => { onFinalRef.current = onFinalTranscript }, [onFinalTranscript])
  useEffect(() => () => {
    shouldListenRef.current = false
    if (restartTimerRef.current) window.clearTimeout(restartTimerRef.current)
    recognitionRef.current?.stop()
  }, [])

  function clearRestart() {
    if (restartTimerRef.current) window.clearTimeout(restartTimerRef.current)
    restartTimerRef.current = null
  }

  function scheduleRestart() {
    clearRestart()
    // Android Chrome can end a continuous service after a pause; wait for its teardown before restarting.
    restartTimerRef.current = window.setTimeout(() => {
      restartTimerRef.current = null
      if (shouldListenRef.current) beginRecognition()
    }, 250)
  }

  function beginRecognition() {
    const SpeechRecognition = speechRecognitionConstructor()
    if (!SpeechRecognition || !shouldListenRef.current || recognitionRef.current) return
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
    recognition.onend = () => {
      if (recognitionRef.current === recognition) recognitionRef.current = null
      setInterimTranscript('')
      if (shouldListenRef.current) scheduleRestart()
      else setIsListening(false)
    }
    recognition.onerror = (event) => {
      if (terminalErrors.has(event.error)) shouldListenRef.current = false
    }
    recognitionRef.current = recognition
    try {
      recognition.start()
      setIsListening(true)
    } catch (error) {
      console.error('Unable to start speech recognition.', error)
      recognitionRef.current = null
      if (shouldListenRef.current) scheduleRestart()
      else setIsListening(false)
    }
  }

  function stop() {
    shouldListenRef.current = false
    clearRestart()
    recognitionRef.current?.stop()
    setIsListening(false)
    setInterimTranscript('')
  }

  function start() {
    if (!speechRecognitionConstructor() || shouldListenRef.current) return
    shouldListenRef.current = true
    beginRecognition()
  }

  return { isSupported, isListening, interimTranscript, start, stop }
}
