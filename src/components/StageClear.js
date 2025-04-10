// src/components/StageClear.js
import React from 'react';

function StageClear({ stage, onProceed }) {
  return (
    <div>
      <h2>스테이지 {stage} 클리어!</h2>
      <p>포켓몬들이 모두 회복되었습니다.</p>
      {stage < 100 ? (
          <button onClick={onProceed}>다음 스테이지 ({stage + 1}) 도전</button>
      ) : (
           <p>축하합니다! 모든 스테이지를 클리어했습니다!</p>
           // TODO: 최종 클리어 후 처리 (예: 초기 화면으로 돌아가기 버튼)
      )}
    </div>
  );
}
export default StageClear;