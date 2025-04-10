// src/components/MoveSelection.js
import React from 'react';
import styled from 'styled-components';

const MoveButtonContainer = styled.button`
  /* App.css의 .move-button 기본 스타일과 일치시킬 부분 */
  margin: 3px;
  padding: 8px 12px;
  cursor: pointer;
  border: 2px solid #ccc; /* 기본 테두리 */
  border-radius: 5px;
  font-size: 0.9em;
  transition: transform 0.1s ease;

  &:hover:not(:disabled) {
    transform: scale(1.05);
  }

  /* 타입별 색상은 App.css의 클래스가 적용하도록 여기서는 제거 */
`;

const MoveTypeSpan = styled.span`
  /* App.css의 .move-type-indicator 스타일과 일치시킬 부분 */
  font-size: 0.8em;
  margin-left: 8px;
  padding: 1px 4px;
  border-radius: 3px;
  background-color: rgba(255, 255, 255, 0.7);
  color: #333;
  border: 1px solid #ccc;
`;


function MoveSelection({ moves, onMoveSelect }) {
  if (!moves) return null;
  return (
    <div className="move-selection">
      {moves.map((move, index) => {
        const moveName = move.name || move.move?.name;
        // 기술 객체에서 type 정보 가져오기 (구조 확인 필요)
        // PokeAPI에서 가져온 상세 정보라면 move.type.name 형태일 것임
        const moveType = move.type?.name;

        if (!moveName) return null;

        return (
          // className에 타입 클래스 적용 (App.css 스타일 위함)
          <MoveButtonContainer
            key={moveName + '-' + index}
            onClick={() => onMoveSelect(move)}
            className={`move-button ${moveType ? `type-${moveType}` : 'type-unknown'}`} // App.css 클래스 적용
            title={`타입: ${moveType || '??'}, 위력: ${move.power ?? '??'}, 명중률: ${move.accuracy ?? '??'}`}
          >
            {moveName}
            {/* 타입 표시 span 추가 (선택적) */}
            {moveType && <MoveTypeSpan className="move-type-indicator">{moveType.toUpperCase()}</MoveTypeSpan>}
          </MoveButtonContainer>
        );
      })}
    </div>
  );
}
export default MoveSelection;




