import React, { useState, useEffect, useRef } from 'react';
import { Peer, DataConnection } from 'peerjs';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, CheckCircle2, XCircle, Loader2, Trophy, AlertCircle, Timer, MessageSquare, Send, Scissors, Zap, Flame, Wind, Box, Target, Shield, Snowflake, TrendingUp, Hand, RotateCcw, RefreshCw, Bomb, Lightbulb, Eye, Magnet, Shuffle, Moon, Skull, Ghost, ArrowDownCircle, Contrast, CloudLightning, Hammer, Info, X } from 'lucide-react';
import { GameState, MessageType, ChatMessage, PowerUp, PowerUpType, ActiveEffect } from '../types';
import { clsx } from 'clsx';
import { POWER_UPS_INFO } from '../constants/powerUps';

interface PlayerViewProps {
  onBack: () => void;
}

export function PlayerView({ onBack }: PlayerViewProps) {
  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [connection, setConnection] = useState<DataConnection | null>(null);
  const [gameState, setGameState] = useState<GameState | 'JOINING'>('JOINING');
  const [error, setError] = useState<string | null>(null);
  
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answerResult, setAnswerResult] = useState<{ correct: boolean; score: number; correctAnswer: string; explanation?: string } | null>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [myScore, setMyScore] = useState(0);
  const [settings, setSettings] = useState<any>(null);

  // QUICK mode state
  const [quickQuestions, setQuickQuestions] = useState<any[]>([]);
  const [quickAnswers, setQuickAnswers] = useState<Record<string, string>>({});
  const [quickCurrentIndex, setQuickCurrentIndex] = useState(0);
  const [quickTimeLeft, setQuickTimeLeft] = useState(0);
  const [quickSubmitted, setQuickSubmitted] = useState(false);
  const [quickTotalTime, setQuickTotalTime] = useState(0);
  const [showReview, setShowReview] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [powerUps, setPowerUps] = useState<PowerUp[]>([]);
  const [activeEffects, setActiveEffects] = useState<ActiveEffect[]>([]);
  const [showLuckyBlock, setShowLuckyBlock] = useState(false);
  const [pendingPowerUp, setPendingPowerUp] = useState<PowerUp | null>(null);
  const [showTargetList, setShowTargetList] = useState<string | null>(null);
  const [shuffledOptions, setShuffledOptions] = useState<string[]>([]);
  const [scissorsUsed, setScissorsUsed] = useState(false);
  const [hammerUsed, setHammerUsed] = useState(false);

  const peerRef = useRef<Peer | null>(null);
  const quickTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const peer = new Peer();
    peerRef.current = peer;

    return () => {
      peer.destroy();
      if (quickTimerRef.current) clearInterval(quickTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveEffects(prev => prev.filter(e => e.endTime > Date.now()));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const joinGame = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !roomCode || !peerRef.current) return;
    
    setError(null);
    setGameState('JOINING');

    const conn = peerRef.current.connect(`arcane-exam-${roomCode}`);
    
    conn.on('open', () => {
      setConnection(conn);
      conn.send({ type: 'JOIN', name });
    });

    conn.on('data', (data: any) => {
      handleHostMessage(data);
    });

    conn.on('close', () => {
      setError('Connection to host lost.');
      setGameState('JOINING');
      setConnection(null);
    });

    conn.on('error', (err) => {
      setError('Failed to connect to host.');
      setGameState('JOINING');
      setConnection(null);
    });
  };

  const handleHostMessage = (data: MessageType) => {
    if (data.type === 'JOIN_SUCCESS') {
      setGameState(data.gameState);
      if (data.settings) setSettings(data.settings);
    }
    
    if (data.type === 'STATE_UPDATE') {
      setGameState(data.state);
      if (data.data?.settings) setSettings(data.data.settings);
      
      if (data.state === 'QUESTION') {
        setCurrentQuestion(data.data.question);
        setCurrentQuestionIndex(data.data.questionIndex || 0);
        setTotalQuestions(data.data.totalQuestions || 0);
        setSelectedAnswer(null);
        setAnswerResult(null);
        setShuffledOptions([...data.data.question.options]);
        setScissorsUsed(false);
        setHammerUsed(false);
      }
      if (data.state === 'QUICK_EXAM') {
        setQuickQuestions(data.data.questions);
        setQuickTotalTime(data.data.totalTime);
        setQuickTimeLeft(data.data.totalTime);
        setQuickAnswers({});
        setQuickCurrentIndex(0);
        setQuickSubmitted(false);
        setShowReview(false);
        
        if (quickTimerRef.current) clearInterval(quickTimerRef.current);
        quickTimerRef.current = setInterval(() => {
          setQuickTimeLeft(prev => {
            if (prev <= 1) {
              if (quickTimerRef.current) clearInterval(quickTimerRef.current);
              // Auto submit if time runs out
              if (!quickSubmitted && connection) {
                submitQuickExam(true);
              }
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
      if (data.state === 'LEADERBOARD' || data.state === 'FINISHED') {
        setLeaderboard(data.data.leaderboard);
        if (data.data.fullQuestions) {
          setQuickQuestions(data.data.fullQuestions);
        }
        const me = data.data.leaderboard.find((p: any) => p.id === peerRef.current?.id);
        if (me) setMyScore(me.score);
        if (quickTimerRef.current) clearInterval(quickTimerRef.current);
      }
    }

    if (data.type === 'CHAT_MESSAGE') {
      setMessages(prev => [...prev, data.message]);
    }

    if (data.type === 'GIVE_POWER_UP') {
      // Show lucky block for power-ups received (reward for correct answer or stolen)
      setPendingPowerUp(data.powerUp);
      setShowLuckyBlock(true);
    }

    if (data.type === 'APPLY_EFFECT') {
      const duration = (['SHIELD', 'DOUBLE_POINTS', 'MIRROR', 'CLUE', 'MAGNET'].includes(data.effect) ? 30000 : 5000);
      setActiveEffects(prev => [...prev, { type: data.effect, endTime: Date.now() + duration }]);
      
      if (data.effect === 'SHUFFLE') {
        setShuffledOptions(prev => [...prev].sort(() => Math.random() - 0.5));
      }
    }

    if (data.type === 'PLAYER_LIST') {
      setPlayers(data.players);
    }

    if (data.type === 'ANSWER_RESULT') {
      setAnswerResult({
        correct: data.correct,
        score: data.score,
        correctAnswer: data.correctAnswer,
        explanation: data.explanation
      });
      setMyScore(prev => prev + data.score);
    }

    if (data.type === 'NEW_ROUND') {
      setGameState('LOBBY');
      setQuickQuestions([]);
      setQuickAnswers({});
      setQuickCurrentIndex(0);
      setQuickTimeLeft(0);
      setQuickSubmitted(false);
      setShowReview(false);
      setAnswerResult(null);
      setSelectedAnswer(null);
      setPowerUps([]);
      setActiveEffects([]);
      setScissorsUsed(false);
      setHammerUsed(false);
    }
  };

  const submitAnswer = (answer: string) => {
    if (selectedAnswer || !connection) return;
    setSelectedAnswer(answer);
    connection.send({ type: 'SUBMIT_ANSWER', answer });
  };

  const handleQuickAnswer = (answer: string) => {
    if (quickSubmitted) return;
    const q = quickQuestions[quickCurrentIndex];
    setQuickAnswers(prev => ({ ...prev, [q.id]: answer }));
  };

  const submitQuickExam = (force = false) => {
    if (!connection || (quickSubmitted && !force)) return;
    setQuickSubmitted(true);
    if (quickTimerRef.current) clearInterval(quickTimerRef.current);
    
    const timeTaken = quickTotalTime - quickTimeLeft;
    connection.send({ 
      type: 'SUBMIT_EXAM', 
      answers: quickAnswers,
      timeTaken
    });
  };

  const sendChatMessage = () => {
    if (!chatInput.trim() || !connection) return;
    const newMessage: ChatMessage = {
      senderId: peerRef.current?.id || 'player',
      senderName: name,
      text: chatInput.trim(),
      timestamp: Date.now()
    };
    // We don't add it locally yet, the host will broadcast it back to us
    // Actually, for better UX we can add it locally, but the host broadcast might cause duplicates
    // Let's just send it to the host. The host will broadcast it to everyone including us.
    connection.send({ type: 'CHAT_MESSAGE', message: newMessage });
    setChatInput('');
  };

  const openLuckyBlock = () => {
    if (pendingPowerUp) {
      setPowerUps(prev => [...prev, pendingPowerUp]);
      setPendingPowerUp(null);
      setShowLuckyBlock(false);
    }
  };

  const usePowerUp = (powerUpId: string, targetId: string) => {
    if (!connection) return;
    connection.send({ type: 'USE_POWER_UP', powerUpId, targetId });
    setPowerUps(prev => prev.filter(pu => pu.id !== powerUpId));
    setShowTargetList(null);
  };

  const useScissors = (powerUpId: string) => {
    setPowerUps(prev => prev.filter(pu => pu.id !== powerUpId));
    setScissorsUsed(true);
  };

  const useHammer = (powerUpId: string) => {
    setPowerUps(prev => prev.filter(pu => pu.id !== powerUpId));
    setHammerUsed(true);
  };

  // Option colors for Kahoot-like feel
  const optionColors = [
    'bg-red-500 hover:bg-red-400',
    'bg-blue-500 hover:bg-blue-400',
    'bg-yellow-500 hover:bg-yellow-400 text-black',
    'bg-green-500 hover:bg-green-400'
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col">
      <header className="p-6 flex items-center justify-between border-b border-white/5">
        <button onClick={onBack} className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" /> Exit
        </button>
        {connection && (
          <div className="flex items-center gap-4">
            {/* Active Effects */}
            <div className="flex gap-2 mr-2">
              {activeEffects.map((effect, idx) => {
                const timeLeft = Math.max(0, Math.ceil((effect.endTime - Date.now()) / 1000));
                if (timeLeft === 0) return null;
                return (
                  <motion.div 
                    key={idx}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded-lg text-xs text-zinc-300 border border-white/10 shadow-lg"
                  >
                    {effect.type === 'SHIELD' && <Shield className="w-3.5 h-3.5 text-blue-400" />}
                    {effect.type === 'FREEZE' && <Snowflake className="w-3.5 h-3.5 text-cyan-400" />}
                    {effect.type === 'DOUBLE_POINTS' && <TrendingUp className="w-3.5 h-3.5 text-purple-400" />}
                    {effect.type === 'LIGHTNING' && <Zap className="w-3.5 h-3.5 text-yellow-400" />}
                    {effect.type === 'FIREBALL' && <Flame className="w-3.5 h-3.5 text-orange-400" />}
                    {effect.type === 'TORNADO' && <Wind className="w-3.5 h-3.5 text-emerald-400" />}
                    {effect.type === 'MIRROR' && <RefreshCw className="w-3.5 h-3.5 text-pink-400" />}
                    {effect.type === 'CLUE' && <Lightbulb className="w-3.5 h-3.5 text-lime-400" />}
                    {effect.type === 'MAGNET' && <Magnet className="w-3.5 h-3.5 text-slate-400" />}
                    {effect.type === 'BLACKOUT' && <Moon className="w-3.5 h-3.5 text-zinc-600" />}
                    {effect.type === 'POISON' && <Skull className="w-3.5 h-3.5 text-green-500" />}
                    {effect.type === 'GRAVITY' && <ArrowDownCircle className="w-3.5 h-3.5 text-amber-700" />}
                    {effect.type === 'INVERT' && <Contrast className="w-3.5 h-3.5 text-white" />}
                    {effect.type === 'BOMB' && <Bomb className="w-3.5 h-3.5 text-red-500" />}
                    <span className="font-mono font-bold">{timeLeft}s</span>
                  </motion.div>
                );
              })}
            </div>
            <div className="text-sm font-medium">{name}</div>
            <div className="bg-indigo-500/20 text-indigo-400 px-3 py-1 rounded-full text-sm font-bold">
              {myScore} pts
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6">
        {!connection ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md"
          >
            <div className="text-center mb-8">
              <h2 className="text-4xl font-bold mb-2">Join Game</h2>
              <p className="text-zinc-400">Enter the room code to play</p>
            </div>

            <form onSubmit={joinGame} className="space-y-4">
              {error && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-xl flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <p className="text-sm">{error}</p>
                </div>
              )}
              
              <div>
                <input
                  type="text"
                  placeholder="Room Code (e.g. 123456)"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.trim())}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl p-4 text-center text-2xl font-mono tracking-widest focus:outline-none focus:border-indigo-500 transition-colors"
                  maxLength={6}
                  required
                />
              </div>
              <div>
                <input
                  type="text"
                  placeholder="Your Nickname"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl p-4 text-center text-xl focus:outline-none focus:border-indigo-500 transition-colors"
                  maxLength={15}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={!name || !roomCode}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white p-4 rounded-xl font-bold text-lg transition-all"
              >
                Enter
              </button>
            </form>
          </motion.div>
        ) : (
          <div className="w-full max-w-4xl flex flex-col items-center justify-center h-full">
            {gameState === 'LOBBY' && (
              <div className="w-full max-w-2xl flex flex-col items-center">
                <div className="text-center mb-12">
                  <h2 className="text-4xl font-bold mb-4">You're in!</h2>
                  <p className="text-xl text-zinc-400 flex items-center justify-center gap-3">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    Waiting for host to start...
                  </p>
                </div>

                <div className="w-full bg-zinc-900 border border-white/10 rounded-3xl p-6 flex flex-col h-[400px]">
                  <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
                    <MessageSquare className="w-5 h-5 text-indigo-400" />
                    Lobby Chat
                  </h3>
                  
                  <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-2 custom-scrollbar flex flex-col-reverse">
                    <div className="space-y-3">
                      {messages.length === 0 ? (
                        <div className="text-center py-4 text-zinc-600 text-sm italic">
                          No messages yet. Say hello!
                        </div>
                      ) : (
                        messages.map((msg, i) => (
                          <div key={i} className={clsx(
                            "flex flex-col",
                            msg.senderId === peerRef.current?.id ? "items-end" : "items-start"
                          )}>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">{msg.senderName}</span>
                              <span className="text-[10px] text-zinc-600">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <div className={clsx(
                              "px-3 py-2 rounded-2xl text-sm max-w-[85%] break-words",
                              msg.senderId === peerRef.current?.id 
                                ? "bg-indigo-600 text-white rounded-tr-none" 
                                : "bg-zinc-800 text-zinc-200 rounded-tl-none"
                            )}>
                              {msg.text}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Type a message..." 
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && sendChatMessage()}
                      className="flex-1 bg-zinc-950 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                    <button 
                      onClick={sendChatMessage}
                      disabled={!chatInput.trim()}
                      className="bg-indigo-600 text-white p-2 rounded-xl hover:bg-indigo-500 disabled:opacity-50 transition-colors"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {gameState === 'STARTING' && (
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-center"
              >
                <h2 className="text-5xl font-bold mb-4">Get Ready!</h2>
                <p className="text-xl text-zinc-400">Look at the host's screen</p>
              </motion.div>
            )}

            {gameState === 'QUICK_EXAM' && quickQuestions.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full space-y-4">
                <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
                <p className="text-xl text-zinc-400">Loading exam...</p>
              </div>
            )}

            {gameState === 'QUICK_EXAM' && quickQuestions.length > 0 && (
              <div className="w-full h-full flex flex-col max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-8 bg-zinc-900/80 backdrop-blur-md p-5 rounded-3xl border border-white/10 shadow-xl">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xl">
                      {quickCurrentIndex + 1}
                    </div>
                    <div className="text-zinc-400 font-medium">
                      of {quickQuestions.length}
                    </div>
                  </div>
                  <div className={clsx(
                    "px-6 py-3 rounded-2xl font-mono text-2xl font-bold flex items-center gap-3",
                    quickTimeLeft <= 10 ? "bg-red-500/20 text-red-400 animate-pulse" : "bg-white/5 text-white"
                  )}>
                    <Timer className="w-6 h-6 opacity-50" />
                    {Math.floor(quickTimeLeft / 60)}:{(quickTimeLeft % 60).toString().padStart(2, '0')}
                  </div>
                </div>

                <div className="flex-1 flex flex-col">
                  <div className="bg-zinc-900 border border-white/10 rounded-[2rem] p-8 md:p-12 shadow-2xl mb-8">
                    <h2 className="text-3xl md:text-4xl font-medium leading-tight">
                      {quickQuestions[quickCurrentIndex].text}
                    </h2>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    {quickQuestions[quickCurrentIndex].options.map((opt: string, i: number) => {
                      const isSelected = quickAnswers[quickQuestions[quickCurrentIndex].id] === opt;
                      const labels = ['A', 'B', 'C', 'D'];
                      return (
                        <button
                          key={i}
                          onClick={() => handleQuickAnswer(opt)}
                          disabled={quickSubmitted}
                          className={clsx(
                            "p-6 md:p-8 rounded-3xl text-xl font-medium transition-all text-left border-2 flex items-center gap-6 group",
                            isSelected 
                              ? "bg-indigo-600 border-indigo-500 text-white shadow-[0_0_30px_rgba(79,70,229,0.3)]" 
                              : "bg-zinc-900/50 border-white/10 hover:bg-zinc-800 hover:border-white/20 text-zinc-300",
                            quickSubmitted && !isSelected && "opacity-50"
                          )}
                        >
                          <div className={clsx(
                            "w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold transition-colors flex-shrink-0",
                            isSelected ? "bg-white/20 text-white" : "bg-white/5 text-zinc-500 group-hover:bg-white/10 group-hover:text-zinc-300"
                          )}>
                            {labels[i]}
                          </div>
                          <span className="flex-1">{opt}</span>
                          {isSelected && <CheckCircle2 className="w-6 h-6 text-white flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between mt-auto pt-6 border-t border-white/10">
                  {settings?.canSkipQuestions && (
                    <button
                      onClick={() => setQuickCurrentIndex(prev => Math.max(0, prev - 1))}
                      disabled={quickCurrentIndex === 0}
                      className="px-6 py-3 rounded-xl font-medium bg-zinc-800 text-white disabled:opacity-50 hover:bg-zinc-700 transition-colors"
                    >
                      Previous
                    </button>
                  )}
                  
                  {!quickSubmitted ? (
                    <button
                      onClick={() => {
                        if (quickCurrentIndex === quickQuestions.length - 1) {
                          if (Object.keys(quickAnswers).length < quickQuestions.length) {
                            if (!confirm('You have unanswered questions. Are you sure you want to submit?')) return;
                          }
                          submitQuickExam();
                        } else {
                          setQuickCurrentIndex(prev => Math.min(quickQuestions.length - 1, prev + 1));
                        }
                      }}
                      className={clsx(
                        "px-8 py-3 rounded-xl font-bold transition-colors ml-auto",
                        quickCurrentIndex === quickQuestions.length - 1
                          ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                          : "bg-indigo-600 hover:bg-indigo-500 text-white"
                      )}
                    >
                      {quickCurrentIndex === quickQuestions.length - 1 ? 'Submit Exam' : 'Next'}
                    </button>
                  ) : (
                    <div className="text-emerald-400 font-medium flex items-center gap-2 ml-auto">
                      <CheckCircle2 className="w-5 h-5" />
                      Submitted! Waiting for others...
                    </div>
                  )}
                </div>
                
                {/* Question Navigator */}
                {settings?.canSkipQuestions && (
                  <div className="mt-8 flex flex-wrap gap-2 justify-center">
                    {quickQuestions.map((q, i) => (
                      <button
                        key={q.id}
                        onClick={() => setQuickCurrentIndex(i)}
                        className={clsx(
                          "w-10 h-10 rounded-lg font-medium text-sm flex items-center justify-center transition-colors border",
                          quickCurrentIndex === i ? "border-indigo-500 ring-2 ring-indigo-500/50" : "border-transparent",
                          quickAnswers[q.id] ? "bg-indigo-600 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                        )}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {gameState === 'QUESTION' && currentQuestion && !answerResult && (
              <div className="w-full h-full flex flex-col max-w-5xl mx-auto relative pb-32 md:pb-8">
                {settings?.chaosMode && (
                  <div className="absolute -top-12 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
                    <motion.div 
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="bg-orange-600/20 border border-orange-500/50 text-orange-400 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2 shadow-[0_0_15px_rgba(234,88,12,0.3)] whitespace-nowrap"
                    >
                      <Flame className="w-3 h-3" /> Chaos Mode Active <Flame className="w-3 h-3" />
                    </motion.div>
                    <button 
                      onClick={() => setShowInfoModal(true)}
                      className="bg-zinc-900/80 backdrop-blur-md border border-white/10 text-zinc-400 hover:text-white p-1.5 rounded-full transition-colors shadow-lg"
                      title="Game Info"
                    >
                      <Info className="w-4 h-4" />
                    </button>
                  </div>
                )}
                {/* Power-ups UI for Player */}
                <div className="fixed bottom-6 left-0 right-0 z-50 px-4 pointer-events-none">
                  <div className="max-w-md mx-auto flex items-center justify-center gap-3 pointer-events-auto">
                    <AnimatePresence>
                      {showLuckyBlock && (
                        <motion.div
                          initial={{ scale: 0, y: 100 }}
                          animate={{ scale: 1, y: 0 }}
                          exit={{ scale: 0, y: 100 }}
                          className="relative"
                        >
                          <motion.button
                            whileHover={{ scale: 1.1, rotate: 5 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={openLuckyBlock}
                            className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-yellow-400 to-amber-600 rounded-2xl md:rounded-3xl flex items-center justify-center shadow-[0_0_30px_rgba(234,179,8,0.4)] border-4 border-yellow-300/50 relative group overflow-hidden"
                          >
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-from)_0%,_transparent_70%)] opacity-50 group-hover:opacity-100 transition-opacity" />
                            <Box className="w-8 h-8 md:w-10 md:h-10 text-white drop-shadow-lg relative z-10" />
                            <motion.div 
                              animate={{ opacity: [0, 1, 0], scale: [1, 1.2, 1] }}
                              transition={{ repeat: Infinity, duration: 2 }}
                              className="absolute inset-0 bg-white/20"
                            />
                          </motion.button>
                          <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-yellow-500 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter shadow-lg whitespace-nowrap">
                            Lucky Box!
                          </div>
                        </motion.div>
                      )}

                      {powerUps.length > 0 && (
                        <motion.div 
                          initial={{ y: 100, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          className="bg-zinc-900/90 backdrop-blur-xl border border-white/10 rounded-3xl p-2 flex flex-wrap justify-center items-center gap-2 shadow-2xl max-w-full"
                        >
                          {powerUps.map((pu) => (
                            <div key={pu.id} className="relative">
                              <motion.button
                                whileHover={{ y: -5, scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg border border-white/10 transition-all relative group overflow-hidden"
                                style={{ 
                                  background: `linear-gradient(135deg, ${
                                    pu.type === 'SCISSORS' ? '#4f46e5, #3730a3' : 
                                    pu.type === 'LIGHTNING' ? '#eab308, #ca8a04' : 
                                    pu.type === 'FIREBALL' ? '#ef4444, #b91c1c' : 
                                    pu.type === 'TORNADO' ? '#10b981, #047857' :
                                    pu.type === 'SHIELD' ? '#3b82f6, #1d4ed8' :
                                    pu.type === 'FREEZE' ? '#06b6d4, #0e7490' :
                                    pu.type === 'DOUBLE_POINTS' ? '#a855f7, #7e22ce' : 
                                    pu.type === 'TIME_WARP' ? '#6366f1, #4338ca' :
                                    pu.type === 'MIRROR' ? '#ec4899, #be185d' :
                                    pu.type === 'BOMB' ? '#27272a, #09090b' :
                                    pu.type === 'CLUE' ? '#84cc16, #4d7c0f' :
                                    pu.type === 'REVEAL' ? '#f59e0b, #b45309' :
                                    pu.type === 'MAGNET' ? '#64748b, #334155' :
                                    pu.type === 'BLACKOUT' ? '#18181b, #000000' :
                                    pu.type === 'POISON' ? '#166534, #064e3b' :
                                    pu.type === 'VAMPIRE' ? '#991b1b, #450a0a' :
                                    pu.type === 'GRAVITY' ? '#78350f, #451a03' :
                                    pu.type === 'INVERT' ? '#ffffff, #d1d5db' :
                                    pu.type === 'METEOR' ? '#f87171, #dc2626' :
                                    pu.type === 'HAMMER' ? '#78716c, #44403c' :
                                    pu.type === 'SHUFFLE' ? '#8b5cf6, #5b21b6' : '#f97316, #c2410c'
                                  })`
                                }}
                                onClick={() => {
                                  if (pu.type === 'SCISSORS') {
                                    useScissors(pu.id);
                                  } else if (pu.type === 'HAMMER') {
                                    useHammer(pu.id);
                                  } else if (['SHIELD', 'FREEZE', 'DOUBLE_POINTS', 'MIRROR', 'CLUE', 'REVEAL', 'MAGNET', 'TIME_WARP', 'INVERT', 'GRAVITY', 'BLACKOUT', 'POISON'].includes(pu.type)) {
                                    usePowerUp(pu.id, peerRef.current?.id || '');
                                  } else {
                                    setShowTargetList(showTargetList === pu.id ? null : pu.id);
                                  }
                                }}
                              >
                                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                {pu.type === 'SCISSORS' && <Scissors className="w-5 h-5 md:w-6 md:h-6 text-white" />}
                                {pu.type === 'LIGHTNING' && <Zap className="w-5 h-5 md:w-6 md:h-6 text-white" />}
                                {pu.type === 'FIREBALL' && <Flame className="w-5 h-5 md:w-6 md:h-6 text-white" />}
                                {pu.type === 'TORNADO' && <Wind className="w-5 h-5 md:w-6 md:h-6 text-white" />}
                                {pu.type === 'SHIELD' && <Shield className="w-5 h-5 md:w-6 md:h-6 text-white" />}
                                {pu.type === 'FREEZE' && <Snowflake className="w-5 h-5 md:w-6 md:h-6 text-white" />}
                                {pu.type === 'DOUBLE_POINTS' && <TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-white" />}
                                {pu.type === 'THIEF' && <Hand className="w-5 h-5 md:w-6 md:h-6 text-white" />}
                                {pu.type === 'TIME_WARP' && <RotateCcw className="w-5 h-5 md:w-6 md:h-6 text-white" />}
                                {pu.type === 'MIRROR' && <RefreshCw className="w-5 h-5 md:w-6 md:h-6 text-white" />}
                                {pu.type === 'BOMB' && <Bomb className="w-5 h-5 md:w-6 md:h-6 text-white" />}
                                {pu.type === 'CLUE' && <Lightbulb className="w-5 h-5 md:w-6 md:h-6 text-white" />}
                                {pu.type === 'REVEAL' && <Eye className="w-5 h-5 md:w-6 md:h-6 text-white" />}
                                {pu.type === 'MAGNET' && <Magnet className="w-5 h-5 md:w-6 md:h-6 text-white" />}
                                {pu.type === 'SHUFFLE' && <Shuffle className="w-5 h-5 md:w-6 md:h-6 text-white" />}
                                {pu.type === 'BLACKOUT' && <Moon className="w-5 h-5 md:w-6 md:h-6 text-white" />}
                                {pu.type === 'POISON' && <Skull className="w-5 h-5 md:w-6 md:h-6 text-white" />}
                                {pu.type === 'VAMPIRE' && <Ghost className="w-5 h-5 md:w-6 md:h-6 text-white" />}
                                {pu.type === 'GRAVITY' && <ArrowDownCircle className="w-5 h-5 md:w-6 md:h-6 text-white" />}
                                {pu.type === 'INVERT' && <Contrast className="w-5 h-5 md:w-6 md:h-6 text-zinc-900" />}
                                {pu.type === 'METEOR' && <CloudLightning className="w-5 h-5 md:w-6 md:h-6 text-white" />}
                                {pu.type === 'HAMMER' && <Hammer className="w-5 h-5 md:w-6 md:h-6 text-white" />}
                              </motion.button>

                              {showTargetList === pu.id && (
                                <motion.div 
                                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 bg-zinc-900 border border-white/10 rounded-2xl p-3 shadow-2xl min-w-[200px] z-50"
                                >
                                  <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-2 px-3 flex items-center gap-2">
                                    <Target className="w-3 h-3 text-red-500" /> Select Target
                                  </div>
                                  <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
                                    <button
                                      onClick={() => usePowerUp(pu.id, 'host')}
                                      className="w-full text-left px-3 py-2 rounded-xl text-sm hover:bg-white/5 transition-colors flex items-center justify-between group"
                                    >
                                      <span className="truncate font-medium text-indigo-400">Host</span>
                                    </button>
                                    {players.filter(p => p.id !== peerRef.current?.id).map(p => (
                                      <button
                                        key={p.id}
                                        onClick={() => usePowerUp(pu.id, p.id)}
                                        className="w-full text-left px-3 py-2 rounded-xl text-sm hover:bg-white/5 transition-colors flex items-center justify-between group"
                                      >
                                        <span className="truncate font-medium">{p.name}</span>
                                        <span className="text-[10px] text-zinc-500 font-mono">{p.score}</span>
                                      </button>
                                    ))}
                                  </div>
                                  <div className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-3 h-3 bg-zinc-900 border-r border-b border-white/10 rotate-45" />
                                </motion.div>
                              )}
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="text-center mb-12">
                  <span className="inline-block px-4 py-1.5 rounded-full bg-white/10 text-white/70 font-medium text-sm mb-6 tracking-widest uppercase">
                    Question {currentQuestionIndex + 1} of {totalQuestions}
                  </span>
                  <div className="relative">
                    {/* Screen Shake Effect for Fireball/Meteor */}
                    {(activeEffects.some(e => e.type === 'FIREBALL' && e.endTime > Date.now()) || 
                      activeEffects.some(e => e.type === 'METEOR' && e.endTime > Date.now())) && (
                      <motion.div 
                        animate={{ x: [-2, 2, -2, 2, 0], y: [-2, 2, 2, -2, 0] }}
                        transition={{ repeat: Infinity, duration: 0.1 }}
                        className="absolute inset-0 pointer-events-none z-0"
                      />
                    )}
                    {/* Lightning Effect */}
                    {activeEffects.some(e => e.type === 'LIGHTNING' && e.endTime > Date.now()) && (
                      <div className="absolute inset-0 bg-zinc-950 z-10 flex flex-col items-center justify-center text-yellow-400 animate-pulse rounded-2xl">
                        <Zap className="w-12 h-12 mb-2" />
                        <h3 className="text-lg font-bold uppercase tracking-widest">Blinded!</h3>
                      </div>
                    )}

                    {/* Freeze Effect */}
                    {activeEffects.some(e => e.type === 'FREEZE' && e.endTime > Date.now()) && (
                      <div className="absolute inset-0 bg-cyan-500/10 z-10 pointer-events-none border-4 border-cyan-400/30 rounded-2xl backdrop-blur-[1px]">
                        <div className="absolute top-2 right-2 text-cyan-400 animate-pulse">
                          <Snowflake className="w-6 h-6" />
                        </div>
                      </div>
                    )}

                    {/* Shield Effect */}
                    {activeEffects.some(e => e.type === 'SHIELD' && e.endTime > Date.now()) && (
                      <div className="absolute inset-0 z-10 pointer-events-none border-4 border-blue-500/50 rounded-2xl shadow-[inset_0_0_30px_rgba(59,130,246,0.2)]">
                        <div className="absolute top-2 left-2 text-blue-400">
                          <Shield className="w-6 h-6" />
                        </div>
                      </div>
                    )}

                    {/* Mirror Effect */}
                    {activeEffects.some(e => e.type === 'MIRROR' && e.endTime > Date.now()) && (
                      <div className="absolute inset-0 z-10 pointer-events-none border-4 border-pink-500/50 rounded-2xl shadow-[inset_0_0_30px_rgba(236,72,153,0.2)]">
                        <div className="absolute bottom-2 right-2 text-pink-400 animate-spin-slow">
                          <RefreshCw className="w-6 h-6" />
                        </div>
                      </div>
                    )}

                    {/* Magnet Effect */}
                    {activeEffects.some(e => e.type === 'MAGNET' && e.endTime > Date.now()) && (
                      <div className="absolute inset-0 z-10 pointer-events-none">
                        <div className="absolute top-2 right-10 text-slate-400 animate-bounce">
                          <Magnet className="w-6 h-6" />
                        </div>
                      </div>
                    )}

                    {/* Clue Effect */}
                    {activeEffects.some(e => e.type === 'CLUE' && e.endTime > Date.now()) && (
                      <div className="absolute inset-0 z-10 pointer-events-none bg-lime-500/5">
                        <div className="absolute bottom-2 left-2 text-lime-400">
                          <Lightbulb className="w-6 h-6" />
                        </div>
                      </div>
                    )}

                    {/* Blackout Effect */}
                    {activeEffects.some(e => e.type === 'BLACKOUT' && e.endTime > Date.now()) && (
                      <div className="absolute inset-0 z-40 pointer-events-none bg-black flex items-center justify-center">
                        <Moon className="w-20 h-20 text-zinc-800 animate-pulse" />
                      </div>
                    )}

                    {/* Invert Effect */}
                    {activeEffects.some(e => e.type === 'INVERT' && e.endTime > Date.now()) && (
                      <div className="absolute inset-0 z-50 pointer-events-none backdrop-invert" />
                    )}

                    {/* Gravity Effect */}
                    {activeEffects.some(e => e.type === 'GRAVITY' && e.endTime > Date.now()) && (
                      <motion.div 
                        animate={{ y: [0, 20, 0] }}
                        transition={{ repeat: Infinity, duration: 0.5 }}
                        className="absolute inset-0 z-10 pointer-events-none border-b-8 border-zinc-500/30"
                      />
                    )}

                    {/* Poison Effect */}
                    {activeEffects.some(e => e.type === 'POISON' && e.endTime > Date.now()) && (
                      <div className="absolute inset-0 z-10 pointer-events-none bg-green-900/10">
                        <div className="absolute top-2 left-1/2 -translate-x-1/2 text-green-500 animate-bounce">
                          <Skull className="w-6 h-6" />
                        </div>
                      </div>
                    )}

                    {/* Bomb Effect */}
                    {activeEffects.some(e => e.type === 'BOMB' && e.endTime > Date.now()) && (
                      <div className="absolute inset-0 z-10 pointer-events-none bg-red-900/10 rounded-2xl">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-red-600 animate-ping">
                          <Bomb className="w-20 h-20" />
                        </div>
                      </div>
                    )}

                    {/* Double Points Indicator */}
                    {activeEffects.some(e => e.type === 'DOUBLE_POINTS' && e.endTime > Date.now()) && (
                      <motion.div 
                        initial={{ scale: 0, y: -20 }}
                        animate={{ scale: 1, y: 0 }}
                        className="absolute -top-8 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-2 z-30"
                      >
                        <TrendingUp className="w-4 h-4" /> 2X POINTS ACTIVE
                      </motion.div>
                    )}

                    <h2 className="text-2xl md:text-5xl font-bold mb-4 leading-tight">{currentQuestion.text}</h2>
                  </div>
                </div>
                
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6 relative">
                  {/* Fireball Effect Reworked */}
                  {activeEffects.some(e => e.type === 'FIREBALL' && e.endTime > Date.now()) && (
                    <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden rounded-3xl">
                      <div className="absolute inset-0 bg-gradient-to-t from-orange-600/40 via-transparent to-transparent mix-blend-overlay" />
                      <AnimatePresence>
                        {[...Array(10)].map((_, i) => (
                          <motion.div
                            key={i}
                            initial={{ y: 400, x: Math.random() * 100 + '%', opacity: 0, scale: 0.5 }}
                            animate={{ 
                              y: -100, 
                              x: (Math.random() * 100) + '%',
                              opacity: [0, 1, 1, 0],
                              scale: [0.5, 1.5, 1, 0.5],
                              rotate: Math.random() * 360
                            }}
                            transition={{ 
                              duration: 1.2 + Math.random(), 
                              repeat: Infinity, 
                              delay: i * 0.1,
                              ease: "easeOut"
                            }}
                            className="absolute bottom-0 text-orange-500 blur-[1px]"
                          >
                            <Flame className="w-20 h-20" />
                          </motion.div>
                        ))}
                      </AnimatePresence>
                      <motion.div 
                        animate={{ opacity: [0.1, 0.3, 0.1] }}
                        transition={{ repeat: Infinity, duration: 0.5 }}
                        className="absolute inset-0 bg-orange-500/10"
                      />
                    </div>
                  )}

                  {/* Tornado Effect Reworked */}
                  {activeEffects.some(e => e.type === 'TORNADO' && e.endTime > Date.now()) && (
                    <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden rounded-3xl">
                      <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                        className="absolute inset-[-50%] border-[30px] border-dashed border-emerald-500/10 rounded-full blur-2xl"
                      />
                      {[...Array(6)].map((_, i) => (
                        <motion.div
                          key={i}
                          animate={{ 
                            rotate: 360,
                            scale: [1, 1.2, 1],
                            x: [0, 15, -15, 0],
                            y: [0, -15, 15, 0]
                          }}
                          transition={{ 
                            rotate: { repeat: Infinity, duration: 3, ease: "linear", delay: i * 0.5 },
                            scale: { repeat: Infinity, duration: 2 },
                            x: { repeat: Infinity, duration: 4 },
                            y: { repeat: Infinity, duration: 5 }
                          }}
                          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-emerald-400/20"
                          style={{ width: `${(i + 1) * 20}%`, height: `${(i + 1) * 20}%` }}
                        >
                          <Wind className="w-full h-full" />
                        </motion.div>
                      ))}
                    </div>
                  )}

                  {(activeEffects.some(e => e.type === 'TORNADO' && e.endTime > Date.now()) 
                    ? shuffledOptions 
                    : currentQuestion.options
                  ).map((opt: string, i: number) => {
                    const colors = [
                      'bg-rose-500 hover:bg-rose-400 shadow-[0_6px_0_rgb(159,18,57)]',
                      'bg-blue-500 hover:bg-blue-400 shadow-[0_6px_0_rgb(30,58,138)]',
                      'bg-amber-500 hover:bg-amber-400 shadow-[0_6px_0_rgb(146,64,14)]',
                      'bg-emerald-500 hover:bg-emerald-400 shadow-[0_6px_0_rgb(6,78,59)]'
                    ];
                    const selectedColors = [
                      'bg-rose-600 shadow-[0_0px_0_rgb(159,18,57)] translate-y-[6px]',
                      'bg-blue-600 shadow-[0_0px_0_rgb(30,58,138)] translate-y-[6px]',
                      'bg-amber-600 shadow-[0_0px_0_rgb(146,64,14)] translate-y-[6px]',
                      'bg-emerald-600 shadow-[0_0px_0_rgb(6,78,59)] translate-y-[6px]'
                    ];
                    const labels = ['A', 'B', 'C', 'D'];
                    
                    const isSelected = selectedAnswer === opt;
                    const isDisabled = !!selectedAnswer;

                    // Scissors effect: hide 2 wrong answers
                    const isWrong = opt !== currentQuestion.correctAnswer;
                    const wrongOptions = currentQuestion.options.filter((o: string) => o !== currentQuestion.correctAnswer);
                    const hiddenByScissors = scissorsUsed && isWrong && wrongOptions.indexOf(opt) < 2;
                    const hiddenByHammer = hammerUsed && isWrong && wrongOptions.indexOf(opt) === 0;

                    if ((hiddenByScissors || hiddenByHammer) && !answerResult) return <div key={i} className="min-h-[120px]" />;

                    return (
                      <button
                        key={i}
                        onClick={() => submitAnswer(opt)}
                        disabled={isDisabled}
                        className={clsx(
                          "relative p-5 md:p-8 rounded-2xl md:rounded-3xl text-lg md:text-2xl font-bold transition-all flex items-center gap-4 md:gap-6 min-h-[100px] md:min-h-[160px] group",
                          isSelected ? selectedColors[i % 4] : colors[i % 4],
                          isDisabled && !isSelected ? "opacity-40 grayscale-[0.5]" : "",
                          !isDisabled && "active:translate-y-[6px] active:shadow-none"
                        )}
                      >
                        <div className="w-10 h-10 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-white/20 flex items-center justify-center text-xl md:text-3xl flex-shrink-0">
                          {labels[i]}
                        </div>
                        <span className="text-left leading-tight drop-shadow-md">{opt}</span>
                      </button>
                    );
                  })}
                </div>
                
                {selectedAnswer && (
                  <div className="mt-12 text-center text-xl font-medium text-zinc-400 flex items-center justify-center gap-3">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    Waiting for others...
                  </div>
                )}
              </div>
            )}

            {gameState === 'QUESTION' && answerResult && (
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={clsx(
                  "w-full max-w-md rounded-[2.5rem] p-6 md:p-10 text-center shadow-2xl",
                  (settings?.showCorrectAnswer || !answerResult.correct) ? (answerResult.correct ? "bg-emerald-500 text-white" : "bg-red-500 text-white") : "bg-indigo-600 text-white"
                )}
              >
                {settings?.showCorrectAnswer ? (
                  <>
                    {answerResult.correct ? (
                      <CheckCircle2 className="w-16 h-16 md:w-24 md:h-24 mx-auto mb-6 drop-shadow-lg" />
                    ) : (
                      <XCircle className="w-16 h-16 md:w-24 md:h-24 mx-auto mb-6 drop-shadow-lg" />
                    )}
                    
                    <h2 className="text-3xl md:text-5xl font-black mb-2 uppercase tracking-tight">
                      {answerResult.correct ? "Correct!" : "Incorrect"}
                    </h2>
                    
                    <div className="text-xl md:text-2xl font-bold opacity-90 mb-8">
                      {answerResult.correct ? `+${answerResult.score} points` : "0 points"}
                    </div>
                    
                    {!answerResult.correct && (
                      <div className="bg-black/20 backdrop-blur-sm rounded-2xl p-5 mb-6 border border-white/10">
                        <div className="text-[10px] uppercase tracking-[0.2em] font-black opacity-60 mb-2">Correct Answer</div>
                        <div className="font-bold text-xl">{answerResult.correctAnswer}</div>
                      </div>
                    )}

                    {answerResult.explanation && (
                      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 text-sm italic leading-relaxed border border-white/5">
                        {answerResult.explanation}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-16 h-16 md:w-24 md:h-24 mx-auto mb-6 opacity-50" />
                    <h2 className="text-3xl md:text-4xl font-bold mb-4">Answer Received</h2>
                    <p className="text-lg opacity-80">Waiting for the host to reveal results...</p>
                  </>
                )}
              </motion.div>
            )}

            {gameState === 'LEADERBOARD' && (
              <div className="w-full max-w-2xl mx-auto">
                <div className="text-center mb-10">
                  <h2 className="text-3xl font-bold mb-4">Current Standings</h2>
                  <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 inline-block min-w-[300px] shadow-xl">
                    <div className="text-sm text-zinc-400 uppercase tracking-widest mb-2">Your Score</div>
                    <div className="text-5xl font-bold text-indigo-400 mb-4">{myScore}</div>
                    
                    <div className="text-zinc-400 flex items-center justify-center gap-2">
                      <Trophy className="w-5 h-5" />
                      Rank: #{leaderboard.findIndex(p => p.id === peerRef.current?.id) + 1} of {leaderboard.length}
                    </div>
                  </div>
                </div>

                <div className="space-y-3 mb-10 max-h-[40vh] overflow-y-auto custom-scrollbar pr-2">
                  {leaderboard.map((p, i) => (
                    <motion.div
                      key={p.id}
                      initial={{ x: -10, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: i * 0.05 }}
                      className={clsx(
                        "bg-zinc-900/50 border border-white/5 rounded-xl p-4 flex items-center justify-between",
                        p.id === peerRef.current?.id && "border-indigo-500/50 bg-indigo-500/5"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className={clsx(
                          "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm",
                          i === 0 ? "bg-yellow-500/20 text-yellow-400" :
                          i === 1 ? "bg-zinc-300/20 text-zinc-300" :
                          i === 2 ? "bg-amber-700/20 text-amber-600" :
                          "bg-zinc-800 text-zinc-500"
                        )}>
                          {i + 1}
                        </div>
                        <span className="font-bold truncate max-w-[150px]">{p.name}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="font-mono text-indigo-400 leading-none">{p.score}</div>
                          <div className="text-[8px] text-zinc-500 font-bold uppercase tracking-tighter mt-1">
                            {p.correctCount || 0} Correct
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
                
                {quickQuestions.length > 0 && (
                  <div className="text-center">
                    <button
                      onClick={() => setShowReview(true)}
                      className="bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-3 rounded-xl font-medium transition-colors"
                    >
                      Review Exam
                    </button>
                  </div>
                )}
              </div>
            )}

            {gameState === 'FINISHED' && (
              <div className="w-full max-w-2xl mx-auto">
                <div className="text-center mb-10">
                  <Trophy className="w-20 h-20 text-yellow-400 mx-auto mb-6" />
                  <h2 className="text-4xl font-bold mb-4">Final Results</h2>
                  <div className="bg-zinc-900 border border-white/10 rounded-2xl p-8 inline-block min-w-[300px] shadow-2xl">
                    <div className="text-sm text-zinc-400 uppercase tracking-widest mb-2">Final Score</div>
                    <div className="text-6xl font-bold text-indigo-400 mb-6">{myScore}</div>
                    
                    <div className="text-xl font-medium flex items-center justify-center gap-2">
                      <Trophy className="w-6 h-6 text-yellow-400" />
                      Final Rank: #{leaderboard.findIndex(p => p.id === peerRef.current?.id) + 1}
                    </div>
                  </div>
                </div>

                <div className="space-y-3 mb-10 max-h-[40vh] overflow-y-auto custom-scrollbar pr-2">
                  {leaderboard.map((p, i) => (
                    <motion.div
                      key={p.id}
                      initial={{ x: -10, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: i * 0.05 }}
                      className={clsx(
                        "bg-zinc-900/50 border border-white/5 rounded-xl p-4 flex items-center justify-between",
                        p.id === peerRef.current?.id && "border-indigo-500/50 bg-indigo-500/5"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className={clsx(
                          "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm",
                          i === 0 ? "bg-yellow-500/20 text-yellow-400" :
                          i === 1 ? "bg-zinc-300/20 text-zinc-300" :
                          i === 2 ? "bg-amber-700/20 text-amber-600" :
                          "bg-zinc-800 text-zinc-500"
                        )}>
                          {i + 1}
                        </div>
                        <span className="font-bold truncate max-w-[150px]">{p.name}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="font-mono text-indigo-400 leading-none">{p.score}</div>
                          <div className="text-[8px] text-zinc-500 font-bold uppercase tracking-tighter mt-1">
                            {p.correctCount || 0} Correct
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
                
                {quickQuestions.length > 0 && (
                  <div className="text-center">
                    <button
                      onClick={() => setShowReview(true)}
                      className="bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-3 rounded-xl font-medium transition-colors"
                    >
                      Review Exam
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Review Modal */}
      {showReview && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 md:p-8">
          <div className="bg-zinc-950 border border-white/10 rounded-3xl w-full max-w-4xl max-h-full flex flex-col overflow-hidden">
            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-zinc-900/50">
              <h2 className="text-2xl font-bold">Exam Review</h2>
              <button 
                onClick={() => setShowReview(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <XCircle className="w-6 h-6 text-zinc-400" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-10">
              {quickQuestions.map((q, index) => {
                const userAnswer = quickAnswers[q.id];
                const correctAnswer = q.correctAnswer;
                const isCorrect = userAnswer === correctAnswer;
                
                return (
                  <div key={q.id} className="bg-zinc-900/80 border border-white/10 rounded-[2rem] p-8 shadow-xl">
                    <div className="flex items-start gap-6 mb-8">
                      <div className={clsx(
                        "w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-xl flex-shrink-0 shadow-lg",
                        isCorrect ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-red-500/20 text-red-400 border border-red-500/30"
                      )}>
                        {index + 1}
                      </div>
                      <h3 className="text-2xl font-medium pt-2 leading-tight">{q.text}</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-0 md:pl-18">
                      {q.options.map((opt: string, i: number) => {
                        const isSelected = userAnswer === opt;
                        const isActualCorrect = correctAnswer === opt;
                        const labels = ['A', 'B', 'C', 'D'];
                        
                        return (
                          <div 
                            key={i}
                            className={clsx(
                              "p-5 rounded-2xl border-2 flex items-center gap-4 transition-all",
                              isActualCorrect
                                ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-100 shadow-[0_0_20px_rgba(16,185,129,0.15)]"
                                : isSelected
                                  ? "bg-red-500/20 border-red-500/50 text-red-100"
                                  : "bg-zinc-950/50 border-white/5 text-zinc-500"
                            )}
                          >
                            <div className={clsx(
                              "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg flex-shrink-0",
                              isActualCorrect ? "bg-emerald-500/30 text-emerald-300" :
                              isSelected ? "bg-red-500/30 text-red-300" :
                              "bg-white/5 text-zinc-600"
                            )}>
                              {labels[i]}
                            </div>
                            <span className="flex-1 text-lg">{opt}</span>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {isSelected && !isActualCorrect && <span className="text-xs font-bold uppercase tracking-wider opacity-80 text-red-300 mr-2">Your Answer</span>}
                              {isActualCorrect && <CheckCircle2 className="w-6 h-6 text-emerald-400" />}
                              {isSelected && !isActualCorrect && <XCircle className="w-6 h-6 text-red-400" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    {q.explanation && (
                      <div className="mt-6 pl-0 md:pl-18">
                        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-6">
                          <h4 className="text-indigo-400 font-bold uppercase tracking-widest text-xs mb-2">Explanation</h4>
                          <p className="text-zinc-300 italic leading-relaxed">{q.explanation}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Info Modal */}
      <AnimatePresence>
        {showInfoModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowInfoModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-4xl max-h-[90vh] bg-zinc-900 border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-8 border-b border-white/5 flex items-center justify-between bg-zinc-900/50 backdrop-blur-md sticky top-0 z-10">
                <div>
                  <h2 className="text-3xl font-bold flex items-center gap-3">
                    <Info className="w-8 h-8 text-indigo-500" /> Game Guide
                  </h2>
                  <p className="text-zinc-500 text-sm mt-1">Learn about Chaos Mode and Power-ups</p>
                </div>
                <button 
                  onClick={() => setShowInfoModal(false)}
                  className="p-2 hover:bg-white/5 rounded-full transition-colors text-zinc-400 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                <section className="mb-12">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-orange-500/20 rounded-xl">
                      <Flame className="w-6 h-6 text-orange-500" />
                    </div>
                    <h3 className="text-xl font-bold text-orange-400 uppercase tracking-wider">Chaos Mode</h3>
                  </div>
                  <div className="bg-white/5 border border-white/5 rounded-3xl p-6">
                    <p className="text-zinc-300 leading-relaxed">
                      Chaos Mode is an unpredictable game variant where players earn <span className="text-yellow-500 font-bold">Lucky Boxes</span> by answering questions correctly. 
                      These boxes contain powerful items that can be used to boost your own performance or sabotage your opponents. 
                      Strategic use of power-ups is the key to victory!
                    </p>
                  </div>
                </section>

                <section>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-indigo-500/20 rounded-xl">
                      <Box className="w-6 h-6 text-indigo-500" />
                    </div>
                    <h3 className="text-xl font-bold text-indigo-400 uppercase tracking-wider">Power-ups Library</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {POWER_UPS_INFO.map((info) => (
                      <div 
                        key={info.type}
                        className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors group"
                      >
                        <div 
                          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg"
                          style={{ 
                            background: `linear-gradient(135deg, ${info.color}, ${info.color}88)`
                          }}
                        >
                          {React.cloneElement(info.icon as React.ReactElement, { className: "w-6 h-6 text-white" })}
                        </div>
                        <div>
                          <h4 className="font-bold text-white group-hover:text-indigo-400 transition-colors">{info.name}</h4>
                          <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{info.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              <div className="p-6 bg-zinc-950/50 border-t border-white/5 text-center">
                <button 
                  onClick={() => setShowInfoModal(false)}
                  className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold transition-all shadow-lg"
                >
                  Got it!
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
