// src/components/PokemonCard.js
import React from 'react';
import styled from 'styled-components';

// Card 컴포넌트 수정: isOpponent -> $isOpponent
const Card = styled.div`
  border: 1px solid #ccc;
  padding: 10px;
  margin: 5px;
  min-width: 150px;
  text-align: center;
  background-color: rgba(255, 255, 255, 0.8); /* 배경 약간 투명하게 */
  border-radius: 8px;
  position: absolute;
  ${({ $isOpponent }) => $isOpponent ? ` /* $ 추가 */
    top: 10px;
    right: 10px;
  ` : `
    bottom: calc(100px + 20px); /* 컨트롤 영역(100px) 바로 위 + 여백(20px) */
    left: 10px;
  `}
  z-index: 5; /* 로그보다 위에 오도록 z-index 추가 */
`;

const Sprite = styled.img`
  width: 96px;
  height: 96px;
  image-rendering: pixelated;
`;

const HPBarContainer = styled.div`
  width: 100%;
  height: 10px;
  background-color: #eee;
  border: 1px solid #aaa;
  border-radius: 5px;
  overflow: hidden;
  margin-top: 5px;
`;

// HPBarInner 컴포넌트 수정: percentage -> $percentage
const HPBarInner = styled.div`
  height: 100%;
  /* $percentage prop 사용 */
  background-color: ${props => props.$percentage > 50 ? 'green' : props.$percentage > 20 ? 'orange' : 'red'};
  width: ${props => props.$percentage}%;
  transition: width 0.5s ease-in-out;
`;

// StatusIndicator 컴포넌트 수정: status -> $status
const StatusIndicator = styled.span`
    margin-left: 5px;
    padding: 2px 4px;
    border-radius: 3px;
    font-size: 0.8em;
    color: white;
    /* $status prop 사용 */
    background-color: ${props => {
        switch(props.$status) {
            case 'poison': return 'purple';
            case 'burn': return 'red';
            case 'paralysis': return 'orange';
            case 'sleep': return 'grey';
            case 'freeze': return 'lightblue';
            default: return 'transparent';
        }
    }};
`;


// PokemonCard 함수 수정: prop 이름에 $ 추가하여 전달
function PokemonCard({ pokemon, isOpponent }) {
    if (!pokemon) return null;
  
    const maxHp = pokemon.stats.find(s => s.stat.name === 'hp')?.base_stat || 1;
    const currentHp = pokemon.currentHp;
    const hpPercentage = Math.max(0, (currentHp / maxHp) * 100);
  
    return (
      <Card $isOpponent={isOpponent}>
        <h4>{pokemon.name}</h4>
        {/* 포켓몬 타입 표시 */}
        <div>
            {pokemon.types?.map(typeInfo => (
                <span key={typeInfo.type.name} className={`type-badge type-${typeInfo.type.name}`}>
                    {typeInfo.type.name}
                </span>
            ))}
        </div>
        <Sprite
          src={isOpponent ? pokemon.sprites.front_default : pokemon.sprites.back_default}
          alt={pokemon.name}
        />
        {/* HP 및 상태 표시 */}
        <div>
          <span>HP: {currentHp} / {maxHp}</span>
          {/* 상태 이상 뱃지 사용 */}
          {pokemon.status && <span className={`status-badge status-${pokemon.status}`}>{pokemon.status}</span>}
          {/* 혼란 상태 텍스트 사용 */}
           {pokemon.isConfused && <span className="status-confusion">혼란</span>}
        </div>
        <HPBarContainer>
          <HPBarInner $percentage={hpPercentage} />
        </HPBarContainer>
      </Card>
    );
  }
  
  export default PokemonCard;