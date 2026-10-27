import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BotDifficulty, GameMap, GameMode, MatchResult, Skin } from '../types';
import type { RosterEntry } from '../engine/entities';
import type { Rewards } from '../logic/progression';

/** Where the player is in the "play" flow: skin → map → lobby → game. */
export interface PlayFlow {
  mode: GameMode;
  tournamentId?: string;
}

export interface MatchSetup {
  flow: PlayFlow;
  map: GameMap;
  roster: RosterEntry[];
  localId: string;
  isAuthority: boolean;
  startTime: number;
  durationSec?: number;
  difficulty: BotDifficulty;
  seed: number;
  roomCode?: string;
}

export interface ResultsParams {
  result: MatchResult;
  rewards: Rewards;
  levelBefore: number;
  levelAfter: number;
  achievementIds: string[];
  tournamentPoints: number;
  flow: PlayFlow;
  map: GameMap;
  roomCode?: string;
  players: { name: string; role: 'survivor' | 'zombie'; startRole: 'survivor' | 'zombie'; skin: Skin; isBot: boolean; infections: number; tasks: number; isLocal: boolean }[];
}

export type RootStackParamList = {
  Intro: undefined;
  Auth: undefined;
  Home: undefined;
  SkinSelect: { flow?: PlayFlow } | undefined;
  SkinDesigner: { skinId?: string } | undefined;
  MapSelect: { flow: PlayFlow };
  MapCreator: { map?: GameMap } | undefined;
  Lobby: { flow: PlayFlow; map: GameMap; roomCode?: string };
  Game: { setup: MatchSetup };
  Results: ResultsParams;
  Shop: { tab?: ShopTab } | undefined;
  Missions: undefined;
  Tournaments: undefined;
  Profile: undefined;
};

export type ShopTab = 'skins' | 'outfits' | 'abilities' | 'upgrades' | 'filters' | 'coins';

export type ScreenProps<K extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, K>;
