// src/components/BattleScreen.js
import React, { useState, useEffect, useCallback, useContext, useRef } from 'react'; // useRef 추가
import { useGame } from '../contexts/GameContext';
import PokemonCard from './PokemonCard';
import BattleLog from './BattleLog';
import MoveSelection from './MoveSelection';
import { fetchPokemonDetails, fetchMoveDetails } from '../utils/pokeapi';
import { calculateDamage, applyEffects, handleStatusEffects, checkAccuracy } from '../utils/battleLogic'; // 복원된 간단 로직 사용

function BattleScreen({ onBattleEnd }) {
    const { playerTeam: initialPlayerTeam, currentStage } = useGame();
    const [playerTeam, setInternalPlayerTeam] = useState(
        initialPlayerTeam.map(p => ({ ...p }))
    );
    const [opponentTeam, setOpponentTeam] = useState([]);
    const [playerCurrentPokemonIndex, setPlayerCurrentPokemonIndex] = useState(0);
    const [opponentCurrentPokemonIndex, setOpponentCurrentPokemonIndex] = useState(0);
    const [battleLog, setBattleLog] = useState([]);
    const [isPlayerTurn, setIsPlayerTurn] = useState(true);
    const [loadingOpponent, setLoadingOpponent] = useState(true);
    const [loadingMoves, setLoadingMoves] = useState(false);
    const [turnInProgress, setTurnInProgress] = useState(false);
    const [showSwitchMenu, setShowSwitchMenu] = useState(false);

    // ★★★ useRef 추가: 최신 상태 참조용 ★★★
    const playerTeamRef = useRef(playerTeam);
    const opponentTeamRef = useRef(opponentTeam);
    const playerIndexRef = useRef(playerCurrentPokemonIndex);
    const opponentIndexRef = useRef(opponentCurrentPokemonIndex);

    // ★★★ 상태 변경 시 ref 업데이트하는 useEffect ★★★
    useEffect(() => {
        playerTeamRef.current = playerTeam;
    }, [playerTeam]);

    useEffect(() => {
        opponentTeamRef.current = opponentTeam;
    }, [opponentTeam]);

    useEffect(() => {
        playerIndexRef.current = playerCurrentPokemonIndex;
    }, [playerCurrentPokemonIndex]);

     useEffect(() => {
        opponentIndexRef.current = opponentCurrentPokemonIndex;
    }, [opponentCurrentPokemonIndex]);


    // 활성화된 포켓몬 참조 (렌더링 시 사용)
    const playerPokemon = playerTeam[playerCurrentPokemonIndex];
    const opponentPokemon = opponentTeam[opponentCurrentPokemonIndex];

    const addLog = useCallback((message) => { /* ... 로그 로직 ... */
        setBattleLog(prev => {
            const newLog = [...prev, message];
            if (newLog.length > 20) return newLog.slice(newLog.length - 20);
            return newLog;
        });
    }, []);

    useEffect(() => { /* ... 상대 팀 생성 로직 (이전과 동일) ... */
        const setupOpponentTeam = async () => {
            setLoadingOpponent(true); setOpponentTeam([]); setOpponentCurrentPokemonIndex(0); setBattleLog([]);
            addLog(`${currentStage} 단계 시작!`);
            const MAX_POKEMON_ID = 1025;
            const opponentIds = []; 
            while (opponentIds.length < 3) {
                const randomId = Math.floor(Math.random() * MAX_POKEMON_ID) + 1;
                if (!opponentIds.includes(randomId)) {
                  opponentIds.push(randomId);
                }
              }
              console.log("Opponent IDs selected:", opponentIds); // 선택된 ID 로깅
        
            try {
                const teamDetails = await Promise.all(opponentIds.map(id => fetchPokemonDetails(id)));
                const processedTeamPromises = teamDetails.map(async (p) => {
                    const moveUrls = p.moves.map(m => m.move.url).sort(() => 0.5 - Math.random()).slice(0, 4);
                    const resolvedMoveDetails = await Promise.all(moveUrls.map(url => fetchMoveDetails(url).catch(err => null)));
                    return { ...p, currentHp: p.stats.find(s => s.stat.name === 'hp').base_stat, status: null, statChanges: {}, isConfused: false, heldItem: null, level: 50, moves: resolvedMoveDetails.filter(m => m) };
                });
                const processedTeam = await Promise.all(processedTeamPromises);
                setOpponentTeam(processedTeam); // State 업데이트 -> ref도 업데이트됨
                if (processedTeam.length > 0 && processedTeam[0]) { addLog(`상대 ${processedTeam[0].name} 등장!`); } else { addLog("오류: 상대 팀 구성 실패."); }
            } catch (error) { console.error("상대 팀 생성 오류:", error); addLog("오류: 상대 팀 로딩 실패."); } finally { setLoadingOpponent(false); setIsPlayerTurn(true); setTurnInProgress(false); }
        };
        setupOpponentTeam();
    }, [currentStage, addLog]);


    // ★★★★★ nextTurn 함수: 상태 참조 시 Ref 사용 ★★★★★
    const nextTurn = useCallback(() => {
        console.log("--- nextTurn 시작 ---");
        let playerFaintedByEffects = false;
        let opponentFaintedByEffects = false;

        // ★★★ 최신 상태를 Ref에서 가져옴 ★★★
        const currentPlayerIndex = playerIndexRef.current;
        const currentOpponentIndex = opponentIndexRef.current;
        const currentPlayerState = playerTeamRef.current[currentPlayerIndex];
        const currentOpponentState = opponentTeamRef.current[currentOpponentIndex];

        // --- 상태 효과 적용 ---
        let finalPlayerHp = currentPlayerState?.currentHp ?? 0;
        if (currentPlayerState && currentPlayerState.currentHp > 0) {
            const { hpLost, stillPoisoned, stillBurned } = handleStatusEffects(currentPlayerState, 'endTurn');
            if (hpLost > 0) {
                const hpAfterEffects = Math.max(0, finalPlayerHp - hpLost);
                // 상태 업데이트는 setState 사용
                setInternalPlayerTeam(prev => prev.map((p, i) => i === currentPlayerIndex ? { ...p, currentHp: hpAfterEffects } : p));
                if (stillPoisoned) addLog(`${currentPlayerState.name} 독 데미지!`);
                if (stillBurned) addLog(`${currentPlayerState.name} 화상 데미지!`);
                finalPlayerHp = hpAfterEffects; // 판정용 HP 업데이트
                if (finalPlayerHp === 0) playerFaintedByEffects = true;
            }
        }

        let finalOpponentHp = currentOpponentState?.currentHp ?? 0;
        if (currentOpponentState && currentOpponentState.currentHp > 0) {
            const { hpLost, stillPoisoned, stillBurned } = handleStatusEffects(currentOpponentState, 'endTurn');
            if (hpLost > 0) {
                const hpAfterEffects = Math.max(0, finalOpponentHp - hpLost);
                // 상태 업데이트는 setState 사용
                setOpponentTeam(prev => prev.map((p, i) => i === currentOpponentIndex ? { ...p, currentHp: hpAfterEffects } : p));
                if (stillPoisoned) addLog(`상대 ${currentOpponentState.name} 독 데미지!`);
                if (stillBurned) addLog(`상대 ${currentOpponentState.name} 화상 데미지!`);
                finalOpponentHp = hpAfterEffects; // 판정용 HP 업데이트
                if (finalOpponentHp === 0) opponentFaintedByEffects = true;
            }
        }

        // --- 쓰러짐 최종 판정 (Ref에서 가져온 최신 HP 기반) ---
        const isPlayerFainted = finalPlayerHp <= 0;
        const isOpponentFainted = finalOpponentHp <= 0; // ★★★ 이 값이 이제 정확해야 함 ★★★

        console.log(`[nextTurn] Faint check - Player Fainted: ${isPlayerFainted} (Final HP: ${finalPlayerHp}), Opponent Fainted: ${isOpponentFainted} (Final HP: ${finalOpponentHp})`);

        // --- 후속 처리 ---
        if (isOpponentFainted) {
            if (!opponentFaintedByEffects && currentOpponentState) { addLog(`상대 ${currentOpponentState.name}은(는) 쓰러졌다!`); }
            const nextOpponentIndex = currentOpponentIndex + 1; // 현재 인덱스 기준
             // ★★★ 다음 상대 존재 여부도 Ref 사용 ★★★
            const opponentTeamFromRef = opponentTeamRef.current;
            console.log(`Opponent fainted! Handling switch/win. Next index: ${nextOpponentIndex}, team length: ${opponentTeamFromRef.length}`);

            if (nextOpponentIndex < opponentTeamFromRef.length) {
                const nextOpponent = opponentTeamFromRef[nextOpponentIndex]; // Ref에서 다음 상대 가져오기
                console.log("Attempting to switch to next opponent:", nextOpponent);
                if (nextOpponent) {
                    addLog(`상대 트레이너가 ${nextOpponent.name}을(를) 내보냈다!`);
                    setOpponentCurrentPokemonIndex(nextOpponentIndex); // 상태 업데이트
                    setIsPlayerTurn(true);
                    setTurnInProgress(false);
                    console.log("--- nextTurn 종료 (상대 교체) ---");
                } else { /* ... 오류 처리 ... */ onBattleEnd('win'); }
                return;
            } else { /* ... 승리 처리 ... */ onBattleEnd('win'); return; }
        }

        if (isPlayerFainted) {
             if (!playerFaintedByEffects && currentPlayerState) { addLog(`${currentPlayerState.name}은(는) 쓰러졌다!`); }
             // ★★★ 교체 가능 포켓몬 확인 시 Ref 사용 ★★★
             const playerTeamFromRef = playerTeamRef.current;
             const availablePokemon = playerTeamFromRef.filter(p => p.currentHp > 0);
             console.log(`Player fainted! Available count: ${availablePokemon.length}, Current index: ${currentPlayerIndex}`);
             // 현재 쓰러진 포켓몬 제외하고 남은 포켓몬 있는지 확인
             if (availablePokemon.length > 0 && availablePokemon.some((p, i) => i !== currentPlayerIndex)) {
                 addLog("교체할 포켓몬을 선택하세요!");
                 setShowSwitchMenu(true);
                 setTurnInProgress(false);
             } else { /* ... 패배 처리 ... */ onBattleEnd('lose'); }
             console.log("--- nextTurn 종료 (플레이어 쓰러짐/교체) ---");
             return;
        }

        console.log("다음 턴으로 전환");
        setIsPlayerTurn(prev => !prev);
        setTurnInProgress(false);
        console.log("--- nextTurn 종료 (턴 전환) ---");

    // useCallback 의존성 배열: Ref 객체는 포함하지 않음. 상태 업데이트 함수 등 포함.
    // addLog는 외부 함수지만 useCallback으로 감싸져 안정적. onBattleEnd도 마찬가지로 가정.
    // 상태값 자체(playerTeam, opponentTeam 등)는 이제 ref로 접근하므로 의존성에서 제거해도 될 수 있으나,
    // 상태 업데이트 로직(setInternalPlayerTeam, setOpponentTeam)이 이 함수 내에 있으므로 유지하는 것이 안전할 수 있음.
    // 또는 상태 업데이트 함수만 의존성에 넣는 방법도 고려. 일단 최소한으로 유지.
    }, [onBattleEnd, addLog]); // playerTeam, opponentTeam 등 상태 의존성 제거 (ref 사용)


    // 상대 AI 턴 로직 (useEffect) - 변경 없음 (내부에서 nextTurn 호출 시 인자 없음)
    useEffect(() => {
        console.log(`[Opponent Effect Hook Entered] isPlayerTurn: ${isPlayerTurn}, turnInProgress: ${turnInProgress}, loadingOpponent: ${loadingOpponent}, opponentExists: ${!!opponentPokemon}, opponentHP: ${opponentPokemon?.currentHp}`);
        if (loadingOpponent) { console.log("[Opponent Effect Skipped]: Still loading opponent data."); return; }
        if (isPlayerTurn) { /* console.log("[Opponent Effect Skipped]: It's player's turn."); */ return; }
        if (!opponentPokemon) { console.log("[Opponent Effect Skipped]: opponentPokemon object is missing."); return; }
        if (opponentPokemon.currentHp <= 0) { console.log(`[Opponent Effect Skipped]: Opponent ${opponentPokemon.name} HP <= 0.`); return; }
        if (turnInProgress) { console.log("[Opponent Effect Skipped]: Turn is already in progress."); return; }

        console.log(">>> Starting Opponent Turn Logic (Checks Passed) <<<");
        setTurnInProgress(true);
        addLog(`상대 ${opponentPokemon.name}의 턴!`);

        const turnAction = async () => {
            console.log(">>> Opponent turnAction started <<<");
            try {
                // 행동 전 상태/혼란 체크 (동일)
                const statusEffect = handleStatusEffects(opponentPokemon, 'beforeMove');
                if (!statusEffect.canMove) { /* ... 행동 불가 처리 ... */ setTimeout(nextTurn, 1000); return; }
                if (opponentPokemon.isConfused && Math.random() < 0.33) { /* ... 혼란 자해 처리 ... */ setTimeout(nextTurn, 1500); return; }

                // 기술 선택 및 실행 (동일)
                if (!opponentPokemon.moves || opponentPokemon.moves.length === 0) { /* ... 기술 없음 ... */ setTimeout(nextTurn, 1000); return; }
                const randomMove = opponentPokemon.moves[Math.floor(Math.random() * opponentPokemon.moves.length)];
                let moveDetails = randomMove;
                addLog(`상대 ${opponentPokemon.name}의 ${moveDetails.name}!`);
                if (!checkAccuracy(moveDetails, opponentPokemon, playerPokemon)) { /* ... 빗나감 ... */ setTimeout(nextTurn, 1000); return; }

                // 데미지 계산 (await 사용)
                const { damage, effectiveness } = await calculateDamage(opponentPokemon, playerPokemon, moveDetails, addLog);

                // 데미지 및 효과 적용 (동일)
                if (damage >= 0) {
                    const { targetPokemon: updatedPlayerPokemon, attackerPokemon: updatedOpponentPokemon } = applyEffects(opponentPokemon, playerPokemon, moveDetails, damage, addLog);
                    setInternalPlayerTeam(prev => prev.map((p, i) => i === playerCurrentPokemonIndex ? updatedPlayerPokemon : p));
                    setOpponentTeam(prev => prev.map((p, i) => i === opponentCurrentPokemonIndex ? updatedOpponentPokemon : p));
                }

                // 턴 종료 예약 (인자 없이 호출)
                console.log("Opponent action finished. Scheduling nextTurn.");
                setTimeout(nextTurn, 1500);

            } catch(error) { /* ... 오류 처리 ... */ setTimeout(nextTurn, 1000); }
        };

        const timeoutId = setTimeout(turnAction, 1000);
        return () => { clearTimeout(timeoutId); }

    // 의존성 배열 유지 (nextTurn 참조는 안정화됨)
    }, [isPlayerTurn, opponentPokemon, playerPokemon, loadingOpponent, addLog, nextTurn, opponentCurrentPokemonIndex, playerCurrentPokemonIndex]);


    // 플레이어 턴: 기술 선택 처리 (handleMoveSelect) - async 및 await 유지, nextTurn 인자 제거
    const handleMoveSelect = async (move) => {
        if (!isPlayerTurn || turnInProgress || loadingMoves || !playerPokemon || playerPokemon.currentHp <= 0 || !opponentPokemon) return;
        setTurnInProgress(true);

        let moveDetails = move;
        if (!moveDetails.power && moveDetails.url) { /* ... 기술 정보 로드 ... */ }

        addLog(`${playerPokemon.name}의 ${moveDetails.name}!`);

        // 행동 전 상태 체크
        const statusEffect = handleStatusEffects(playerPokemon, 'beforeMove');
        if (!statusEffect.canMove) { addLog(`${playerPokemon.name}... 행동 불가!`); setTimeout(nextTurn, 1000); return; }

        // 혼란 체크
        if (playerPokemon.isConfused && Math.random() < 0.33) { /* ... 혼란 자해 처리 ... */ setTimeout(nextTurn, 1500); return; }

        // 명중률 체크
        if (!checkAccuracy(moveDetails, playerPokemon, opponentPokemon)) { addLog(`공격 빗나감!`); setTimeout(nextTurn, 1000); return; }

        // 데미지 계산 (await 사용)
        const { damage, effectiveness } = await calculateDamage(playerPokemon, opponentPokemon, moveDetails, addLog);

        // 데미지 및 효과 적용
        if (damage >= 0) {
            const { targetPokemon: updatedOpponentPokemon, attackerPokemon: updatedPlayerPokemon } = applyEffects(playerPokemon, opponentPokemon, moveDetails, damage, addLog);
            // 상태 업데이트 요청
            setOpponentTeam(prev => prev.map((p, i) => i === opponentCurrentPokemonIndex ? updatedOpponentPokemon : p));
            setInternalPlayerTeam(prev => prev.map((p, i) => i === playerCurrentPokemonIndex ? updatedPlayerPokemon : p));
        }

        // 턴 종료 예약 (인자 없이 호출)
        setTimeout(nextTurn, 1500);
    };


    // 포켓몬 교체 처리 (handleSwitchPokemon) - 변경 없음
    const handleSwitchPokemon = (index) => {
        if (index === playerCurrentPokemonIndex || playerTeam[index].currentHp <= 0 || turnInProgress) { addLog("지금 교체 불가."); return; }
        const oldPokemon = playerPokemon; const newPokemon = playerTeam[index];
        addLog(`${oldPokemon.name}, 돌아와!`);
        setInternalPlayerTeam(prev => prev.map((p, i) => { if (i === playerCurrentPokemonIndex) { return { ...p, statChanges: {} }; } return p; }));
        addLog(`가랏! ${newPokemon.name}!`);
        setPlayerCurrentPokemonIndex(index); setShowSwitchMenu(false);
        setIsPlayerTurn(false); setTurnInProgress(false);
        console.log("Player switched Pokemon. Opponent's turn starts.");
    };


    // --- 렌더링 부분 --- (이전과 동일)
    if (loadingOpponent) return <div>상대 트레이너 준비 중...</div>;
    if (!playerPokemon) return <div>오류: 플레이어 포켓몬 정보 없음</div>;
    if (!loadingOpponent && opponentTeam.length === 0) return <div>오류: 상대 팀 정보 로드 실패</div>;
    if (!opponentPokemon && opponentTeam.length > 0) return <div>배틀 정보 준비 중...</div>;

    return (
        <div className="battle-screen">
          <div className="opponent-area">
            {opponentPokemon && <PokemonCard key={'opp-' + (opponentPokemon.id || opponentCurrentPokemonIndex)} pokemon={opponentPokemon} isOpponent={true} />}
          </div>
          <div className="player-area">
            {playerPokemon && <PokemonCard key={'player-' + (playerPokemon.id || playerCurrentPokemonIndex)} pokemon={playerPokemon} isOpponent={false} />}
          </div>
          <BattleLog logs={battleLog} />
          <div className="battle-controls">
            {isPlayerTurn && !showSwitchMenu && !turnInProgress && playerPokemon?.currentHp > 0 && (
              <>
                <MoveSelection moves={playerPokemon.moves} onMoveSelect={handleMoveSelect} />
                 <button onClick={() => setShowSwitchMenu(true)} disabled={playerTeam.filter(p => p.currentHp > 0).length <= 1 || turnInProgress || loadingMoves}> 포켓몬 교체 </button>
              </>
            )}
            {showSwitchMenu && (
                <div className="switch-menu">
                    <h3>교체할 포켓몬을 선택하세요:</h3>
                    {playerTeam.map((p, index) => ( p.currentHp > 0 && index !== playerCurrentPokemonIndex ? (<button key={p.id + '-' + index} onClick={() => handleSwitchPokemon(index)}> {p.name} (HP: {p.currentHp} / {p.stats.find(s => s.stat.name === 'hp').base_stat}) </button>) : null ))}
                     <button onClick={() => setShowSwitchMenu(false)}>취소</button>
                </div>
            )}
             {!isPlayerTurn && !turnInProgress && opponentPokemon?.currentHp > 0 && <p>상대의 턴...</p>}
             {(turnInProgress || loadingMoves) && <p>...</p>}
          </div>
        </div>
      );
}

export default BattleScreen;