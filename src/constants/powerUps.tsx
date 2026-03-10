import React from 'react';
import { 
  Scissors, Zap, Flame, Wind, Shield, Snowflake, TrendingUp, Hand, 
  RotateCcw, RefreshCw, Bomb, Lightbulb, Eye, Magnet, Shuffle, 
  Moon, Skull, Ghost, ArrowDownCircle, Contrast, CloudLightning, Hammer 
} from 'lucide-react';
import { PowerUpType } from '../types';

export interface PowerUpInfo {
  type: PowerUpType;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

export const POWER_UPS_INFO: PowerUpInfo[] = [
  {
    type: 'SCISSORS',
    name: 'Scissors',
    description: 'Removes 2 wrong answer options for the current question.',
    icon: <Scissors className="w-5 h-5" />,
    color: '#4f46e5'
  },
  {
    type: 'LIGHTNING',
    name: 'Lightning',
    description: 'Blinds the target player, making it hard to see for 5 seconds.',
    icon: <Zap className="w-5 h-5" />,
    color: '#eab308'
  },
  {
    type: 'FIREBALL',
    name: 'Fireball',
    description: 'Burns the target\'s screen with flames and causes a screen shake for 5 seconds.',
    icon: <Flame className="w-5 h-5" />,
    color: '#ef4444'
  },
  {
    type: 'TORNADO',
    name: 'Tornado',
    description: 'Shuffles the answer options for the target player for 5 seconds.',
    icon: <Wind className="w-5 h-5" />,
    color: '#10b981'
  },
  {
    type: 'SHIELD',
    name: 'Shield',
    description: 'Protects you from the next offensive power-up. Lasts 30 seconds.',
    icon: <Shield className="w-5 h-5" />,
    color: '#3b82f6'
  },
  {
    type: 'FREEZE',
    name: 'Freeze',
    description: 'Prevents the target player from submitting an answer for 5 seconds.',
    icon: <Snowflake className="w-5 h-5" />,
    color: '#06b6d4'
  },
  {
    type: 'DOUBLE_POINTS',
    name: 'Double Points',
    description: 'Your next correct answer gives double points. Lasts 30 seconds.',
    icon: <TrendingUp className="w-5 h-5" />,
    color: '#a855f7'
  },
  {
    type: 'THIEF',
    name: 'Thief',
    description: 'Steals a random power-up from the target player.',
    icon: <Hand className="w-5 h-5" />,
    color: '#f97316'
  },
  {
    type: 'TIME_WARP',
    name: 'Time Warp',
    description: 'Resets the question timer back to the full limit.',
    icon: <RotateCcw className="w-5 h-5" />,
    color: '#6366f1'
  },
  {
    type: 'MIRROR',
    name: 'Mirror',
    description: 'Reflects any offensive power-up back to the sender. Lasts 30 seconds.',
    icon: <RefreshCw className="w-5 h-5" />,
    color: '#ec4899'
  },
  {
    type: 'BOMB',
    name: 'Bomb',
    description: 'A dangerous explosive that can be passed around or reduce points.',
    icon: <Bomb className="w-5 h-5" />,
    color: '#18181b'
  },
  {
    type: 'CLUE',
    name: 'Clue',
    description: 'Highlights one wrong answer for 30 seconds.',
    icon: <Lightbulb className="w-5 h-5" />,
    color: '#84cc16'
  },
  {
    type: 'REVEAL',
    name: 'Reveal',
    description: 'Shows the most popular answer among all players in the chat.',
    icon: <Eye className="w-5 h-5" />,
    color: '#f59e0b'
  },
  {
    type: 'MAGNET',
    name: 'Magnet',
    description: 'Attracts points from the target player. Lasts 30 seconds.',
    icon: <Magnet className="w-5 h-5" />,
    color: '#64748b'
  },
  {
    type: 'SHUFFLE',
    name: 'Shuffle',
    description: 'Shuffles the order of answer options for everyone.',
    icon: <Shuffle className="w-5 h-5" />,
    color: '#7c3aed'
  },
  {
    type: 'BLACKOUT',
    name: 'Blackout',
    description: 'Turns the target player\'s screen completely black for 30 seconds.',
    icon: <Moon className="w-5 h-5" />,
    color: '#09090b'
  },
  {
    type: 'POISON',
    name: 'Poison',
    description: 'Slowly reduces the target player\'s score over 30 seconds.',
    icon: <Skull className="w-5 h-5" />,
    color: '#166534'
  },
  {
    type: 'VAMPIRE',
    name: 'Vampire',
    description: 'Steals 200 points from the target player and gives them to you.',
    icon: <Ghost className="w-5 h-5" />,
    color: '#7f1d1d'
  },
  {
    type: 'GRAVITY',
    name: 'Gravity',
    description: 'Makes the target\'s screen bounce and adds a heavy border for 30 seconds.',
    icon: <ArrowDownCircle className="w-5 h-5" />,
    color: '#451a03'
  },
  {
    type: 'INVERT',
    name: 'Invert',
    description: 'Inverts all colors on the target player\'s screen for 30 seconds.',
    icon: <Contrast className="w-5 h-5" />,
    color: '#ffffff'
  },
  {
    type: 'METEOR',
    name: 'Meteor',
    description: 'Deals 300 points of damage to the target player.',
    icon: <CloudLightning className="w-5 h-5" />,
    color: '#f87171'
  },
  {
    type: 'HAMMER',
    name: 'Hammer',
    description: 'Disables one answer option, making it unclickable.',
    icon: <Hammer className="w-5 h-5" />,
    color: '#57534e'
  }
];
