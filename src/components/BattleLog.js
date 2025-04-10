// src/components/BattleLog.js
import React, { useRef, useEffect } from 'react';
import styled from 'styled-components';

const LogContainer = styled.div`
    height: 100px; /* 고정 높이 */
    overflow-y: scroll; /* 스크롤 가능하게 */
    border: 1px solid #ccc;
    padding: 5px;
    margin-top: 10px;
    background-color: #f9f9f9;
    position: absolute;
    bottom: 120px; /* 위치 조정 필요 */
    left: 180px; /* 위치 조정 필요 */
    right: 180px; /* 위치 조정 필요 */
`;

function BattleLog({ logs }) {
    const logEndRef = useRef(null);

    useEffect(() => {
        // 새 로그 추가 시 맨 아래로 스크롤
        logEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [logs]);

  return (
    <LogContainer>
      {logs.map((log, index) => (
        <p key={index}>{log}</p>
      ))}
       <div ref={logEndRef} /> {/* 스크롤 타겟 */}
    </LogContainer>
  );
}
export default BattleLog;