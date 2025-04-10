// src/App.js
import React, { useState, useEffect } from 'react';
import PokemonSelection from './components/PokemonSelection';
import BattleScreen from './components/BattleScreen';
import GameOver from './components/GameOver';
import StageClear from './components/StageClear';
import { GameProvider } from './contexts/GameContext';
import './App.css'; // 기본 스타일링

function App() {
  const [gameState, setGameState] = useState('selection'); // 'selection', 'battle', 'stageClear', 'gameOver'
  const [playerTeam, setPlayerTeam] = useState([]);
  const [playerItems, setPlayerItems] = useState([]); // 선택된 아이템 상태
  const [currentStage, setCurrentStage] = useState(1);
  const [battleResult, setBattleResult] = useState(null); // 'win', 'lose'

  // 저장된 게임 불러오기 (예시)
  useEffect(() => {
    const savedGame = localStorage.getItem('pokemonBattleTowerSave');
    if (savedGame) {
      const { savedPlayerTeam, savedCurrentStage, savedPlayerItems } = JSON.parse(savedGame);
      if (savedPlayerTeam && savedCurrentStage <= 10) { // 10단계 이하만 로드
         // 간단하게 로드하는 예시. 실제로는 포켓몬 상태(HP 등)도 복원해야 함
         // 이 예시에서는 선택 화면부터 다시 시작하도록 유도
         console.log(`저장된 게임 발견: ${savedCurrentStage} 단계`);
         // 필요하다면 여기서 setPlayerTeam, setCurrentStage 등을 호출하여 게임 상태 복원
         // setPlayerTeam(savedPlayerTeam.map(p => ({ ...p, currentHp: p.stats.hp }))); // HP 복원 예시
         // setPlayerItems(savedPlayerItems);
         // setCurrentStage(savedCurrentStage);
         // setGameState('battle'); // 바로 배틀 시작 (선택적)
      }
    }
  }, []);

  const handleGameStart = (selectedTeam, selectedItems) => {
    // PokeAPI에서 가져온 전체 능력치와 현재 HP를 포함하도록 팀 구성
    const initialTeam = selectedTeam.map(p => ({
      ...p,
      currentHp: p.stats.find(s => s.stat.name === 'hp').base_stat,
      status: null, // 상태이상 없음
      statChanges: { attack: 0, defense: 0, 'special-attack': 0, 'special-defense': 0, speed: 0 }, // 능력치 변화
      isConfused: false,
      // 아이템 정보 추가 (예시)
      heldItem: selectedItems[p.id] || null, // 포켓몬 ID를 키로 아이템 저장 가정
    }));
    setPlayerTeam(initialTeam);
    setPlayerItems(selectedItems); // 전체 아이템 목록 저장
    setCurrentStage(1); // 항상 1단계부터 시작 (로드 기능 구현 시 수정 필요)
    setGameState('battle');
    localStorage.removeItem('pokemonBattleTowerSave'); // 새 게임 시작 시 이전 저장 데이터 삭제
  };

  const handleStageClear = () => {
    // 포켓몬 치유
    const healedTeam = playerTeam.map(p => ({
        ...p,
        currentHp: p.stats.find(s => s.stat.name === 'hp').base_stat,
        status: null,
        statChanges: { attack: 0, defense: 0, 'special-attack': 0, 'special-defense': 0, speed: 0 },
        isConfused: false,
    }));
    setPlayerTeam(healedTeam);
    const nextStage = currentStage + 1;
    setCurrentStage(nextStage);

    // 10단계 이하 저장
    if (nextStage <= 10) {
      const gameToSave = {
        savedPlayerTeam: healedTeam.map(p => ({
            id: p.id,
            name: p.name,
            // ★★★ 수정된 부분 ★★★
            moves: p.moves.map(m => m.name), // m.move.name 대신 m.name 사용
            // ★★★★★★★★★★★★★★
            // 최대 HP 저장을 위해 base_stat 사용 확인 (기존 코드 유지)
            stats: p.stats.find(s => s.stat.name === 'hp').base_stat,
            heldItem: p.heldItem
        })),
        savedCurrentStage: nextStage,
        savedPlayerItems: playerItems,
      };
      // 저장 전 데이터 구조 확인 (디버깅용)
      console.log("Saving game data:", gameToSave);
      try {
         localStorage.setItem('pokemonBattleTowerSave', JSON.stringify(gameToSave));
         console.log(`${nextStage} 단계 진행 상황 저장됨.`);
      } catch (error) {
          console.error("로컬 스토리지 저장 실패:", error);
          // 필요 시 사용자에게 알림 (예: 저장 공간 부족)
      }
    }

    if (nextStage > 100) {
      // TODO: 게임 클리어 처리
      alert("축하합니다! 100단계를 모두 클리어했습니다!");
      setGameState('selection'); // 다시 선택 화면으로
    } else {
      setGameState('stageClear'); // 다음 단계 전 클리어 화면 표시
    }
  };

  const handleBattleEnd = (result) => { // 'win' or 'lose'
    setBattleResult(result);
    if (result === 'win') {
        handleStageClear(); // 스테이지 클리어 로직 호출
    } else {
        setGameState('gameOver');
        localStorage.removeItem('pokemonBattleTowerSave'); // 패배 시 저장 데이터 삭제
    }
  };

  const handleProceedToNextStage = () => {
    setGameState('battle'); // 'stageClear' 상태에서 다음 배틀 시작
  }

  const handleGameOver = () => {
    setPlayerTeam([]);
    setPlayerItems({});
    setCurrentStage(1);
    setGameState('selection');
  };

  return (
    <GameProvider value={{ playerTeam, setPlayerTeam, currentStage, playerItems }}>
      <div className="App">
        <h1>포켓몬 배틀 타워</h1>
        {gameState === 'selection' && <PokemonSelection onGameStart={handleGameStart} />}
        {gameState === 'battle' && (
           <BattleScreen
             key={currentStage} // 스테이지 변경 시 BattleScreen 강제 리마운트
             onBattleEnd={handleBattleEnd}
           />
         )}
        {gameState === 'stageClear' && <StageClear stage={currentStage -1} onProceed={handleProceedToNextStage} />}
        {gameState === 'gameOver' && <GameOver onRestart={handleGameOver} />}
      </div>
    </GameProvider>
  );
}

export default App;