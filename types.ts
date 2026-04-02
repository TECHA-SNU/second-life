
import React from 'react';

export enum AppView {
  LANDING = 'LANDING',
  ONBOARDING = 'ONBOARDING',
  SELF_UNDERSTANDING = 'SELF_UNDERSTANDING',
  HOLLAND_TEST = 'HOLLAND_TEST',
  JOB_EXPLORATION = 'JOB_EXPLORATION',
  GOAL_SETTING = 'GOAL_SETTING',
  GOAL_MANAGER = 'GOAL_MANAGER',
  ACTION_EXECUTION = 'ACTION_EXECUTION',
  ACTION_TRACKER = 'ACTION_TRACKER',
  REFLECTION = 'REFLECTION',
  PLAYGROUND = 'PLAYGROUND',
  PROFILE = 'PROFILE',
  ADMIN = 'ADMIN',
  INTERIM_REPORT = 'INTERIM_REPORT',
  MASTER_REPORT = 'MASTER_REPORT'
}

export interface ChatLog {
  id: string;
  type: string;
  summary: string;
  timestamp: any;
}

export interface HollandResult {
  topCode: string;
  scores: Record<string, number>;
  timestamp: any;
}

export interface UserAction {
  title: string;
  status: 'PENDING' | 'COMPLETED';
}

export interface Roadmap {
  vision: string;
  mission: string;
  values: string;
  challenges: string;
  goals: string[] | Record<string, string[]>;
  expertComment?: string;
  challengeAdvice?: string;
}

export interface ValuePriorities {
  items: { label: string; rank: number }[];
  expertComment: string;
}
