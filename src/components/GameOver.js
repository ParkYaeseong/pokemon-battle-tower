// src/components/GameOver.js
import React from 'react';

function GameOver({ onRestart }) {
  return (
    <div>
      <h2>게임 오버</h2>
      <p>모든 포켓몬이 쓰러졌습니다...</p>
      <button onClick={onRestart}>다시 시작</button>
    </div>
  );
}
export default GameOver;
