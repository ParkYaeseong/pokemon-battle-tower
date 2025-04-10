// src/utils/battleLogic.js
import { getTypeChart, fetchMoveDetails } from './pokeapi'; // getTypeChart와 fetchMoveDetails 사용

/**
 * 타입 상성 배율 계산 (PokeAPI 타입 차트 기반)
 * @param {string} moveType - 공격 기술 타입 이름
 * @param {Array} targetTypes - 방어 포켓몬 타입 배열 (예: [{ type: { name: 'grass' } }, { type: { name: 'poison' } }])
 * @returns {Promise<number>} 상성 배율 (e.g., 0, 0.5, 1, 2, 4)
 */
export const getTypeEffectiveness = async (moveType, targetTypes = []) => {
    // 타입 차트 가져오기 (캐시 또는 API 호출)
    const typeChart = await getTypeChart();
    if (!typeChart) {
        console.error("타입 상성표 로드 실패!");
        return 1; // 오류 시 기본 1배
    }

    // 공격 타입 데이터 가져오기
    const moveTypeData = typeChart[moveType];
    if (!moveTypeData) {
        console.warn(`알 수 없는 공격 타입: ${moveType}`);
        return 1; // 모르는 타입이면 1배
    }

    // 방어 타입 이름 배열 추출 (방어 포켓몬의 types 배열 구조 반영)
    const targetTypeNames = targetTypes.map(typeInfo => typeInfo.type.name);

    let effectiveness = 1;
    // 각 방어 타입에 대해 상성 계산
    targetTypeNames.forEach(targetTypeName => {
        if (moveTypeData.double_damage_to.includes(targetTypeName)) {
            effectiveness *= 2;
        } else if (moveTypeData.half_damage_to.includes(targetTypeName)) {
            effectiveness *= 0.5;
        } else if (moveTypeData.no_damage_to.includes(targetTypeName)) {
            effectiveness *= 0;
        }
    });

    // 계산 결과 로깅
    console.log(`[Type Effectiveness] Move: ${moveType}, Target: [${targetTypeNames.join(', ')}], Effectiveness: ${effectiveness}`);
    return effectiveness;
};

/**
 * 기본 데미지 계산 (async 함수!)
 * @param {object} attacker - 공격 포켓몬 객체 (stats 배열 포함 가정)
 * @param {object} defender - 방어 포켓몬 객체 (stats, types 배열 포함 가정)
 * @param {object} move - 사용 기술 객체 (power, type.name, damage_class.name, meta 등 포함 가정)
 * @param {function} addLog - 로그 추가 함수
 * @param {boolean} ignoreType - 타입 상성 무시 여부 (자해 등)
 * @returns {Promise<object>} { damage: number, effectiveness: number }
 */
export const calculateDamage = async (attacker, defender, move, addLog, ignoreType = false) => {
    // 상태이상 기술, 위력 없는 기술 처리
    if (move.damage_class?.name === 'status' || !move.power || move.power === 0) {
        console.log(`[Damage Calc] Status move or no power (${move.name}). Damage: 0`);
        return { damage: 0, effectiveness: 1 };
    }

    // 레벨, 공격/방어 스탯 가져오기
    const level = attacker.level || 50; // 포켓몬 객체에 level 속성 없으면 50으로 가정
    const attackStatName = move.damage_class?.name === 'special' ? 'special-attack' : 'attack';
    const defenseStatName = move.damage_class?.name === 'special' ? 'special-defense' : 'defense';

    // 포켓몬의 stats 배열에서 해당 능력치 찾기
    const baseAttackStat = attacker.stats?.find(s => s.stat.name === attackStatName);
    const baseDefenseStat = defender.stats?.find(s => s.stat.name === defenseStatName);

    // 능력치 값이 없을 경우 기본값 50 사용
    const baseAttack = baseAttackStat?.base_stat || 50;
    const baseDefense = baseDefenseStat?.base_stat || 50;

    // TODO: 랭크 변화 적용 (statChanges 객체 사용 가정)
    const atkRank = attacker.statChanges?.[attackStatName] || 0;
    const defRank = defender.statChanges?.[defenseStatName] || 0;
    const rankMultiplier = (rank) => Math.max(2/8, Math.min(8/2, (rank >= 0 ? (2 + rank) / 2 : 2 / (2 - rank)))); // 2/8 ~ 8/2 범위

    // 급소 시 랭크 변화 무시 여부 판정 필요 (여기서는 일단 적용)
    const attack = baseAttack * rankMultiplier(atkRank);
    const defense = baseDefense * rankMultiplier(defRank);

    console.log(`[Damage Calc] Attacker: ${attacker.name}, Defender: ${defender.name}, Move: ${move.name}`);
    console.log(`[Damage Calc] Level: ${level}, Power: ${move.power}`);
    console.log(`[Damage Calc] Base Atk(${attackStatName}): ${baseAttack}, Base Def(${defenseStatName}): ${baseDefense}`);
    console.log(`[Damage Calc] Ranks Atk: ${atkRank}, Def: ${defRank}`);
    console.log(`[Damage Calc] Final Atk: ${attack.toFixed(2)}, Final Def: ${defense.toFixed(2)}`);


    // 기본 데미지 계산
    let damage = Math.floor(Math.floor(Math.floor(2 * level / 5 + 2) * move.power * attack / defense) / 50) + 2;
    console.log(`[Damage Calc] Base Damage (before modifiers): ${damage}`);

    // 타입 상성 적용 (await 사용!)
    let effectiveness = 1;
    if (!ignoreType && move.type?.name && defender.types) {
        // ★★★ getTypeEffectiveness 호출 시 await 사용 ★★★
        effectiveness = await getTypeEffectiveness(move.type.name, defender.types);

        // 효과가 없을 때 메시지 추가 및 데미지 0 처리
        if (effectiveness === 0) {
            addLog("효과가 없는 것 같다...");
            console.log(`[Damage Calc] Effectiveness 0. Final Damage: 0`);
            return { damage: 0, effectiveness: 0 }; // 데미지 0 반환
        }
    }

    // 타입 상성 배율 적용
    damage = Math.floor(damage * effectiveness);
    console.log(`[Damage Calc] After Effectiveness (${effectiveness}x): ${damage}`);

    // 급소 판정 (간단 버전)
    // TODO: calculateCritChance 함수 분리 및 사용 고려
    const critChance = (move.meta?.crit_rate || 0) > 0 ? (1 / 8) : (1 / 24); // 간단 확률
    const isCritical = Math.random() < critChance;
    if (isCritical) {
        addLog("급소에 맞았다!");
        // TODO: 급소 시 공격 하락/방어 상승 무시 로직 반영 필요 (위 랭크 계산 부분)
        damage = Math.floor(damage * 1.5); // 데미지 1.5배
        console.log(`[Damage Calc] After Critical Hit (1.5x): ${damage}`);
    }

    // 랜덤 변수 (85% ~ 100%)
    const randomMultiplier = Math.random() * 0.15 + 0.85;
    damage = Math.floor(damage * randomMultiplier);
    console.log(`[Damage Calc] After Random (${randomMultiplier.toFixed(2)}x): ${damage}`);

    // 최소 데미지 1
    damage = Math.max(1, damage);

    // 최종 데미지 로그
    addLog(`${defender.name}에게 ${damage}의 데미지!`);
    if (!ignoreType) { // 상성 메시지 추가
      if (effectiveness > 1) addLog("효과가 굉장했다!");
      if (effectiveness > 0 && effectiveness < 1) addLog("효과가 별로인 듯하다...");
    }
    console.log(`[Damage Calc] Final Damage dealt: ${damage}`);

    return { damage, effectiveness }; // 계산된 데미지와 상성 배율 반환
};

/**
 * 기술 명중률 계산
 * @param {object} move - 사용 기술 객체
 * @param {object} attacker - 공격 포켓몬
 * @param {object} defender - 방어 포켓몬
 * @returns {boolean} 명중 여부
 */
export const checkAccuracy = (move, attacker, defender) => {
    // 필중기 처리
    if (move.accuracy === null) {
        console.log(`[Accuracy Check] Move ${move.name} always hits.`);
        return true;
    }
    // TODO: 명중률/회피율 랭크 고려 필요
    // const evasionRank = defender.statChanges?.evasion || 0;
    // const accuracyRank = attacker.statChanges?.accuracy || 0;
    // const combinedRank = Math.max(-6, Math.min(6, accuracyRank - evasionRank));
    // const rankMultiplier = combinedRank >= 0 ? (3 + combinedRank) / 3 : 3 / (3 - combinedRank);
    const accuracy = move.accuracy;
    const chance = (accuracy / 100.0); // * rankMultiplier; // 랭크 적용 시
    const didHit = Math.random() < chance;
    console.log(`[Accuracy Check] Move: ${move.name}, Accuracy: ${accuracy}%, Chance: ${chance.toFixed(2)}, Result: ${didHit ? 'Hit' : 'Miss'}`);
    return didHit;
};


/**
 * 기술 효과 적용 (상태이상, 능력치 변화 등)
 * @param {object} attacker
 * @param {object} defender
 * @param {object} move
 * @param {number} damage - 실제 적용된 데미지
 * @param {function} addLog
 * @returns {object} { targetPokemon: updatedDefender, attackerPokemon: updatedAttacker }
 */
export const applyEffects = (attacker, defender, move, damage, addLog) => {
    // 상태 업데이트를 위해 원본을 복사하여 사용
    let updatedDefender = JSON.parse(JSON.stringify(defender)); // 간단한 깊은 복사
    let updatedAttacker = JSON.parse(JSON.stringify(attacker));

    // 1. HP 감소 (이미 계산된 데미지 적용)
    updatedDefender.currentHp = Math.max(0, updatedDefender.currentHp - damage);
    console.log(`[Apply Effects] Defender HP after damage: ${updatedDefender.currentHp}`);

    // 2. 상태 이상 적용 (move.meta 정보 활용)
    const ailment = move.meta?.ailment?.name;
    const ailmentChance = move.meta?.ailment_chance || 0; // 0이면 100% 확률로 가정 필요할 수 있음 (API 확인)

    // ailment_chance가 0이면 100% 확률로 간주 (API 스펙에 따라 조정)
    const effectiveAilmentChance = ailmentChance === 0 && ailment && ailment !== 'none' ? 100 : ailmentChance;

    if (ailment && ailment !== 'none' && Math.random() * 100 < effectiveAilmentChance) {
        // 이미 상태이상이 아니고, 타입/특성 면역이 아닌지 체크 필요
        if (!updatedDefender.status /* && !isImmune(...) */) {
            updatedDefender.status = ailment; // 상태 적용
            addLog(`${updatedDefender.name}은(는) ${ailment} 상태가 되었다!`);
            console.log(`[Apply Effects] Applied status ${ailment} to ${updatedDefender.name}`);
            // TODO: 마비 시 스피드 감소, 화상 시 공격 감소 등 부가 효과 처리 필요
            // (이 효과는 실제 능력치 계산 시 반영되어야 함)
        } else {
            console.log(`[Apply Effects] Status ${ailment} blocked (already has status: ${updatedDefender.status})`);
        }
    }

    // 3. 능력치 변화 적용 (move.stat_changes 정보 활용)
    const statChanges = move.stat_changes || [];
    const statChance = move.meta?.stat_chance || 0; // 0이면 100% 확률로 가정 필요
    const effectiveStatChance = statChance === 0 && statChanges.length > 0 ? 100 : statChance;

    if (statChanges.length > 0 && Math.random() * 100 < effectiveStatChance) {
        statChanges.forEach(changeInfo => {
            const statName = changeInfo.stat.name; // 예: "attack", "speed"
            const changeValue = changeInfo.change; // 예: +1, -2

            // 대상 결정 (user, opponent 등 확인 필요 - move.target.name 참고)
            // 간단하게: changeValue > 0 이면 attacker, < 0 이면 defender 에게 적용 가정 (대부분 맞음)
            let target = changeValue > 0 ? updatedAttacker : updatedDefender;
            const targetName = changeValue > 0 ? attacker.name : defender.name;

            // 현재 랭크 가져오기 (statChanges 객체 사용 가정)
            const currentRank = target.statChanges?.[statName] || 0;

            // 랭크 변경 적용 (-6 ~ +6 범위 제한)
            if ((changeValue > 0 && currentRank < 6) || (changeValue < 0 && currentRank > -6)) {
                const newRank = Math.max(-6, Math.min(6, currentRank + changeValue));
                // target 객체에 직접 업데이트 (상위 컴포넌트에서 setState 필요)
                if (!target.statChanges) target.statChanges = {}; // statChanges 객체 없으면 생성
                target.statChanges[statName] = newRank;

                // 메시지 생성
                let effectMsg = "";
                if (changeValue === 1) effectMsg = "올랐다"; else if (changeValue === 2) effectMsg = "크게 올랐다";
                else if (changeValue >= 3) effectMsg = "대폭 올랐다"; else if (changeValue === -1) effectMsg = "떨어졌다";
                else if (changeValue === -2) effectMsg = "크게 떨어졌다"; else if (changeValue <= -3) effectMsg = "대폭 떨어졌다";

                addLog(`${targetName}의 ${statName.replace('-', ' ')}이(가) ${effectMsg}!`);
                console.log(`[Apply Effects] Stat change for ${targetName}: ${statName} ${changeValue > 0 ? '+' : ''}${changeValue} (New Rank: ${newRank})`);

            } else { // 랭크 변화 불가
                addLog(`${targetName}의 ${statName.replace('-', ' ')}은(는) 더 이상 변하지 않는다!`);
                console.log(`[Apply Effects] Stat change blocked for ${targetName}: ${statName} (Rank limit reached)`);
            }
        });
    }

    // 4. 혼란 적용 (특정 기술 이름으로 판별 - 개선 필요)
    if (move.name === 'confuse-ray' || move.name === 'supersonic' || move.name === 'swagger' || move.name === 'flatter' || move.name === 'dynamic-punch') {
        if (!updatedDefender.isConfused) {
            updatedDefender.isConfused = true;
            addLog(`${updatedDefender.name}은(는) 혼란에 빠졌다!`);
            console.log(`[Apply Effects] Applied confusion to ${updatedDefender.name}`);
        } else {
             console.log(`[Apply Effects] Confusion blocked (already confused)`);
        }
    }
    // TODO: 다른 부가 효과 처리 (씨뿌리기, 압정뿌리기, 반동 데미지, 회복 등)

    return { targetPokemon: updatedDefender, attackerPokemon: updatedAttacker };
};


/**
 * 상태 이상 효과 처리 (턴 시작 전 / 턴 종료 후)
 * @param {object} pokemon
 * @param {'beforeMove' | 'endTurn'} timing
 * @returns {object} { canMove, cause, hpLost, stillPoisoned, stillBurned }
 */
export const handleStatusEffects = (pokemon, timing) => {
     let canMove = true;
     let cause = '';
     let hpLost = 0;
     let stillPoisoned = false;
     let stillBurned = false;

     // 포켓몬 또는 능력치 정보 없을 경우 대비
     if (!pokemon || !pokemon.stats) return { canMove, cause, hpLost, stillPoisoned, stillBurned };

     const maxHp = pokemon.stats.find(s => s.stat.name === 'hp')?.base_stat || 1;

     if (timing === 'beforeMove') {
         // 잠듦 체크
         if (pokemon.status === 'sleep') {
             // TODO: 잠듦 턴 카운트 및 해제 로직 필요
             if (Math.random() < 0.5) { // 임시: 50% 확률로 깨어남
                 cause = '깨어남'; // 상태 해제는 BattleScreen에서 처리
                 console.log(`[Status Check] ${pokemon.name} woke up!`);
             } else {
                 canMove = false; cause = '잠듦';
                 console.log(`[Status Check] ${pokemon.name} is asleep.`);
             }
         }
         // 얼음 체크
         else if (pokemon.status === 'freeze') {
             if (Math.random() < 0.2) { // 20% 확률 해동
                 cause = '얼음 풀림'; // 상태 해제는 BattleScreen에서 처리
                 console.log(`[Status Check] ${pokemon.name} thawed out!`);
             } else {
                 canMove = false; cause = '얼음';
                 console.log(`[Status Check] ${pokemon.name} is frozen.`);
             }
         }
         // 마비 체크
         else if (pokemon.status === 'paralysis') {
             if (Math.random() < 0.25) { // 25% 확률 행동 불가
                 canMove = false; cause = '마비';
                 console.log(`[Status Check] ${pokemon.name} is paralyzed and can't move!`);
             }
         }
         // 혼란은 BattleScreen의 각 턴 로직 시작 시 별도 체크
     }
      else if (timing === 'endTurn') {
         // 독 데미지
         if (pokemon.status === 'poison') {
             // TODO: 맹독(toxic) 처리 필요 (데미지 증가)
             hpLost = Math.max(1, Math.floor(maxHp / 8));
             stillPoisoned = true;
             console.log(`[Status Check] ${pokemon.name} takes poison damage: ${hpLost}`);
         }
         // 화상 데미지
         else if (pokemon.status === 'burn') {
              hpLost = Math.max(1, Math.floor(maxHp / 16)); // Gen 7+ 기준 1/16
              stillBurned = true;
              console.log(`[Status Check] ${pokemon.name} takes burn damage: ${hpLost}`);
         }
         // TODO: 씨뿌리기, 저주 등 턴 종료 데미지/회복
     }

    return { canMove, cause, hpLost, stillPoisoned, stillBurned };
};