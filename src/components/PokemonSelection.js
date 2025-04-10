// src/components/PokemonSelection.js
import React, { useState, useEffect } from 'react';
// fetchPokemonList, fetchPokemonCount import 추가 확인
import { fetchPokemonDetails, fetchMoveDetails, fetchGenerationList, fetchGenerationDetails, fetchPokemonList, fetchPokemonCount } from '../utils/pokeapi';
import styled from 'styled-components';

// 사용 가능한 아이템 목록 예시
const availableItems = [
  { id: 'oran-berry', name: '오랭열매', description: 'HP가 절반 이하일 때 HP를 약간 회복한다.' },
  { id: 'leftovers', name: '먹다남은음식', description: '매 턴 종료 시 HP를 약간 회복한다.' },
  { id: 'choice-scarf', name: '구애스카프', description: '스피드가 1.5배 상승하지만, 처음 선택한 기술만 사용할 수 있다.' },
  { id: 'life-orb', name: '생명의구슬', description: '기술의 위력이 1.3배 상승하지만, 공격 후 HP가 감소한다.' },
  { id: 'focus-sash', name: '기합의띠', description: 'HP가 가득 찼을 때 기술을 받아도 반드시 1 남기고 버틴다. (1회용)'}
];

// --- Styled Components 정의 ---
const SelectionContainer = styled.div`
  padding: 15px;
  max-width: 900px;
  margin: 0 auto;
`;

const StepTitle = styled.h2`
  margin-bottom: 15px;
  text-align: center;
  color: #333;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 15px;
  max-height: 450px;
  overflow-y: auto;
  padding: 10px;
  border: 1px solid #eee;
  border-radius: 8px;
  margin-bottom: 15px;
  background-color: #fff;
`;

const ItemCard = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 5px;
  border: 2px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s ease, border-color 0.2s ease, transform 0.1s ease;
  background-color: #f9f9f9;
  text-align: center;
  min-height: 120px;
  justify-content: space-between;

  &:hover {
    background-color: #eee;
    transform: translateY(-2px);
  }
  &.selected {
    border-color: #4a90e2;
    background-color: #e7f0fa;
  }

  img {
    width: 72px;
    height: 72px;
    image-rendering: pixelated;
    margin-bottom: 5px;
  }
  span {
    font-size: 0.85em;
    text-transform: capitalize;
    word-break: break-word;
  }
`;

const LoadingMessage = styled.div`
    padding: 30px 20px;
    font-size: 1.2em;
    text-align: center;
    color: #555;
    min-height: 200px;
    display: flex;
    align-items: center;
    justify-content: center;
`;

const SelectionControls = styled.div`
    margin-top: 20px;
    display: flex;
    justify-content: center;
    gap: 15px;

    button {
        padding: 10px 20px;
        font-size: 1em;
        border-radius: 5px;
        cursor: pointer;
        border: 1px solid #ccc;
        background-color: #f0f0f0;
        transition: background-color 0.2s ease;

        &:hover:not(:disabled) { background-color: #e0e0e0; }
        &:disabled { opacity: 0.6; cursor: not-allowed; }
    }
`;

const MoveButton = styled.button`
    margin: 3px;
    padding: 8px 12px;
    cursor: pointer;
    border: 2px solid #ccc;
    border-radius: 5px;
    font-size: 0.9em;
    transition: transform 0.1s ease, background-color 0.2s, border-color 0.2s;

    &:hover:not(:disabled) { transform: scale(1.05); }
`;
// --- ---

function PokemonSelection({ onGameStart }) {
  const [allGenerations, setAllGenerations] = useState([]);
  const [selectedGeneration, setSelectedGeneration] = useState(undefined); // 초기 상태 undefined
  const [pokemonOfGeneration, setPokemonOfGeneration] = useState([]);
  const [selectedPokemon, setSelectedPokemon] = useState([]);
  const [pokemonDetails, setPokemonDetails] = useState({});
  const [selectedMoves, setSelectedMoves] = useState({});
  const [selectedItems, setSelectedItems] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("세대 목록 로딩 중...");
  const [step, setStep] = useState(0);

  // 1. 세대 목록 로드
  useEffect(() => {
    const loadGenerations = async () => {
      setLoading(true); setLoadingMessage("세대 목록 로딩 중...");
      try {
        const generations = await fetchGenerationList();
        setAllGenerations(generations);
      } catch (error) { console.error("세대 목록 로딩 실패:", error); setLoadingMessage("세대 목록 로딩 오류."); }
      finally { setLoading(false); setLoadingMessage(""); }
    };
    loadGenerations();
  }, []);

  // 2. 포켓몬 목록 로드 useEffect (수정됨)
  useEffect(() => {
    // Effect 시작 로그 및 초기 상태 체크
    console.log(`[Effect Triggered] selectedGeneration changed to:`, selectedGeneration);
    if (selectedGeneration === undefined) {
        console.log("[Effect Skipped] Initial state (undefined).");
        return;
    }

    // 목록 로드 시작 시 상태 초기화
    setPokemonOfGeneration([]);
    setSelectedPokemon([]); setPokemonDetails({}); setSelectedMoves({}); setSelectedItems({});
    setLoading(true); // 로딩 시작

    // 특정 세대 선택 시
    if (selectedGeneration) {
        setLoadingMessage("선택된 세대의 포켓몬 목록 로딩 중...");
        const loadPokemonByGeneration = async () => {
            console.log(`[Generation Load] Fetching details for: ${selectedGeneration}`);
            try {
              const generationData = await fetchGenerationDetails(selectedGeneration);
              console.log(`[Generation Load] Received generation data:`, generationData);
              const pokemonList = generationData.pokemon_species.map(species => {
                const urlParts = species.url.split('/');
                const id = urlParts[urlParts.length - 2];
                const spriteUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
                const detailUrl = `https://pokeapi.co/api/v2/pokemon/${id}/`;
                const numId = parseInt(id, 10);
                if (numId > 1025) return null; // 유효 ID 체크
                return { name: species.name, url: detailUrl, id: numId, spriteUrl };
              }).filter(p => p !== null); // null 제거

              pokemonList.sort((a, b) => a.id - b.id); // ID 정렬
              console.log(`[Generation Load] Processed ${pokemonList.length} Pokemon. Setting state.`);
              setPokemonOfGeneration(pokemonList); // 상태 업데이트
            } catch (error) { console.error("세대별 포켓몬 목록 로딩 실패:", error); setLoadingMessage("포켓몬 목록 로딩 오류."); }
            finally { setLoading(false); setLoadingMessage(""); } // 로딩 종료
        };
        loadPokemonByGeneration();
    }
    // '모든 포켓몬' 선택 시 (selectedGeneration === null)
    else if (selectedGeneration === null) {
        setLoadingMessage("모든 포켓몬 목록 로딩 중... (매우 오래 걸릴 수 있습니다!)");
        const loadAllPokemon = async () => {
            console.log("[All Pokemon Load] Starting fetchPokemonList(null)...");
            try {
                // limit=null 로 전체 목록 요청 (pokeapi.js 수정됨)
                const allPokemonList = await fetchPokemonList(null); // ★★★ 전체 목록 요청 ★★★
                console.log(`[All Pokemon Load] Received ${allPokemonList?.length ?? 0} Pokemon from API.`);

                // 필터링 전/후 길이 로깅
                const filteredList = allPokemonList.filter(p => p.id <= 1025); // 예시 필터
                console.log(`[All Pokemon Load] Filtered list length (ID <= 1025): ${filteredList.length}`);

                console.log("[All Pokemon Load] Setting pokemonOfGeneration state...");
                setPokemonOfGeneration(filteredList); // ★★★ 상태 업데이트 ★★★
                console.log("[All Pokemon Load] State update requested.");

            } catch (error) { console.error("모든 포켓몬 목록 로딩 실패:", error); setLoadingMessage("모든 포켓몬 목록 로딩 오류."); }
            finally { setLoading(false); setLoadingMessage(""); } // 로딩 종료
        };
        loadAllPokemon();
    } else {
         // 이 경우는 발생하면 안 되지만, 예외 처리
         console.warn("Unexpected value for selectedGeneration:", selectedGeneration);
         setLoading(false); // 혹시 모를 로딩 상태 해제
    }

  }, [selectedGeneration]); // selectedGeneration 값이 변경될 때 실행

  // 세대 선택 핸들러
  const handleGenerationSelect = (generationUrl) => {
    console.log(`Generation selected: ${generationUrl === null ? 'All' : generationUrl}`);
    setSelectedGeneration(generationUrl); // null 또는 URL 저장 -> useEffect 트리거
    setStep(1); // 포켓몬 선택 단계로 이동
  };

  // 포켓몬 선택/해제 핸들러
  const handlePokemonSelect = async (pokemon) => {
      const isSelected = selectedPokemon.find(p => p.id === pokemon.id);
      if (isSelected) { // 선택 해제
          setSelectedPokemon(prev => prev.filter(p => p.id !== pokemon.id));
          // 관련 선택 초기화
          setPokemonDetails(prev => { const newState = {...prev}; delete newState[pokemon.id]; return newState; });
          setSelectedMoves(prev => { const newState = {...prev}; delete newState[pokemon.id]; return newState; });
          setSelectedItems(prev => { const newState = {...prev}; delete newState[pokemon.id]; return newState; });
      } else if (selectedPokemon.length < 3) { // 새로 선택
          setLoading(true); setLoadingMessage(`${pokemon.name} 상세 정보 로딩...`);
          try {
              const details = await fetchPokemonDetails(pokemon.id);
              // 기술 정보 로드 (위력 있는 공격 기술만)
              const moveDetailsPromises = details.moves.map(m => fetchMoveDetails(m.move.url).catch(() => null));
              const resolvedMoveDetails = (await Promise.all(moveDetailsPromises))
                  .filter(m => m && m.power && m.power > 0 && m.damage_class?.name !== 'status'); // 상태이상 기술 제외

              // 기술 이름순 정렬 (한국어 지원 시 localeCompare('ko') 고려)
              resolvedMoveDetails.sort((a, b) => a.name.localeCompare(b.name));

              details.learnedMoves = resolvedMoveDetails;
              setSelectedPokemon(prev => [...prev, details]);
              setPokemonDetails(prev => ({ ...prev, [details.id]: details }));
          } catch (error) { console.error(`${pokemon.name} 상세 정보 로딩 실패:`, error); setLoadingMessage(`${pokemon.name} 정보 로딩 오류`); }
          finally { setLoading(false); setLoadingMessage(""); }
      } else {
          alert("포켓몬은 최대 3마리까지 선택할 수 있습니다.");
      }
  };

 // 기술 선택 핸들러
 const handleMoveSelect = (pokemonId, move) => {
    const currentMoves = selectedMoves[pokemonId] || [];
    const isSelected = currentMoves.find(m => m.id === move.id);
    if (isSelected) { setSelectedMoves(prev => ({ ...prev, [pokemonId]: currentMoves.filter(m => m.id !== move.id) })); }
    else if (currentMoves.length < 4) { setSelectedMoves(prev => ({ ...prev, [pokemonId]: [...currentMoves, move] })); }
    else { alert("기술은 포켓몬당 최대 4개까지 선택할 수 있습니다."); }
 };

 // 아이템 선택 핸들러
 const handleItemSelect = (pokemonId, itemId) => {
     setSelectedItems(prev => ({ ...prev, [pokemonId]: prev[pokemonId] === itemId ? null : itemId }));
 };

 // 다음 단계 진행 핸들러
 const proceedToNextStep = () => {
      if (step === 1 && selectedPokemon.length === 3) { setStep(2); }
      else if (step === 2) {
          const allMovesSelected = selectedPokemon.every(p => (selectedMoves[p.id]?.length || 0) === 4);
          if (allMovesSelected) { setStep(3); } else { alert('각 포켓몬마다 4개의 기술을 선택해주세요.'); }
      }
      else if (step === 3) {
          const finalTeam = selectedPokemon.map(pokemon => ({
              ...pokemon, // 포켓몬 기본 정보 (stats, types 등 포함)
              moves: selectedMoves[pokemon.id] || [], // 선택된 기술 객체 배열
              heldItem: availableItems.find(item => item.id === selectedItems[pokemon.id]) || null // 선택된 아이템 객체
          }));
          onGameStart(finalTeam, {}); // 게임 시작 콜백 호출
      }
  };

  // 뒤로 가기 핸들러
  const goBack = () => {
      if (step === 1) { setSelectedGeneration(undefined); setStep(0); } // undefined로 초기화
      else if (step === 2) { setStep(1); }
      else if (step === 3) { setStep(2); }
  };

  // --- 렌더링 로직 ---
  // console.log(`[Render] Step: ${step}, Loading: ${loading}, Pokemon List Length: ${pokemonOfGeneration.length}, Selected Pokemon Count: ${selectedPokemon.length}`);

  // 세대 목록 로딩 중 전체 화면 로딩
  if (loading && step === 0 && selectedGeneration === undefined) return <LoadingMessage>{loadingMessage}</LoadingMessage>;

  return (
    <SelectionContainer>
      {/* --- 세대 선택 단계 --- */}
      {step === 0 && (
        <>
          <StepTitle>세대 선택</StepTitle>
          {/* 세대 목록 로딩 중 메시지 */}
          {loading && selectedGeneration === undefined && <LoadingMessage>{loadingMessage}</LoadingMessage>}
          {!loading && (
             <Grid>
                {allGenerations.map((gen, index) => (
                <ItemCard key={gen.name} onClick={() => handleGenerationSelect(gen.url)}>
                    <span>{`${index + 1}세대`}</span>
                </ItemCard>
                ))}
                <ItemCard onClick={() => handleGenerationSelect(null)}> <span>모든 포켓몬</span> </ItemCard>
             </Grid>
          )}
          <p style={{textAlign: 'center', fontSize: '0.8em', color: '#777'}}> '모든 포켓몬' 선택 시 로딩에 매우 오랜 시간이 걸릴 수 있습니다. </p>
        </>
      )}

      {/* --- 포켓몬 선택 단계 --- */}
      {step === 1 && (
        <>
           <StepTitle>
             {/* 제목 표시 로직 개선 */}
             {selectedGeneration === undefined ? '세대 선택 중...' : (selectedGeneration === null ? '모든' : `${allGenerations.find(g => g.url === selectedGeneration)?.name.replace('generation-','').toUpperCase()} 세대`)} 포켓몬 선택 ({selectedPokemon.length} / 3)
           </StepTitle>
           {/* 특정 목록 로딩 중 메시지 */}
           {loading && <LoadingMessage>{loadingMessage}</LoadingMessage>}
           {!loading && (
               <Grid>
                 {/* console.log(`[Render Step 1] Mapping ${pokemonOfGeneration.length} Pokemon...`) */}
                 {pokemonOfGeneration.map(p => (
                   <ItemCard key={p.id} onClick={() => handlePokemonSelect(p)} className={selectedPokemon.find(sp => sp.id === p.id) ? 'selected' : ''} title={p.name}>
                     <img src={p.spriteUrl} alt={p.name} loading="lazy" />
                     <span>#{p.id} {p.name}</span>
                   </ItemCard>
                 ))}
                 {/* 로딩 끝났는데 목록 비어있으면 메시지 */}
                 {pokemonOfGeneration.length === 0 && selectedGeneration !== undefined && <p style={{ gridColumn: '1 / -1', textAlign: 'center' }}>포켓몬 목록이 비어있거나 로딩에 실패했습니다.</p>}
               </Grid>
           )}
           <SelectionControls>
              <button onClick={goBack}>세대 다시 선택</button>
              {/* 로딩 중 아닐 때만 다음 단계 버튼 활성화 */}
              {!loading && selectedPokemon.length === 3 && <button onClick={proceedToNextStep}>기술 선택하기</button>}
           </SelectionControls>
        </>
      )}

      {/* --- 기술 선택 단계 --- */}
      {step === 2 && (
        <>
          <StepTitle>기술 선택 (포켓몬당 4개)</StepTitle>
           {loading && <LoadingMessage>{loadingMessage}</LoadingMessage>} {/* 포켓몬 상세 정보 로딩 시 */}
           {selectedPokemon.map(pokemon => (
            <div key={pokemon.id} style={{ marginBottom: '20px', border: '1px solid #ccc', padding: '15px', borderRadius: '8px', background: '#fff' }}>
              <h3 style={{display: 'flex', alignItems: 'center', gap: '10px'}}> <img src={pokemon.sprites?.front_default} alt={pokemon.name} style={{height: '40px'}}/> {pokemon.name} ({selectedMoves[pokemon.id]?.length || 0}/4) </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
                {/* 기술 목록 표시 */}
                {pokemonDetails[pokemon.id]?.learnedMoves?.length > 0 ? pokemonDetails[pokemon.id].learnedMoves.map(move => (
                    <MoveButton
                      key={move.id}
                      onClick={() => handleMoveSelect(pokemon.id, move)}
                      className={`move-button ${move.type?.name ? `type-${move.type.name}` : 'type-unknown'} ${selectedMoves[pokemon.id]?.find(m => m.id === move.id) ? 'selected' : ''}`}
                      disabled={(selectedMoves[pokemon.id]?.length || 0) >= 4 && !selectedMoves[pokemon.id]?.find(m => m.id === move.id)}
                      title={`타입: ${move.type?.name ?? '??'} | 위력: ${move.power ?? '-'} | 명중: ${move.accuracy ?? '-'} | PP: ${move.pp ?? '-'}\n${move.flavor_text_entries?.find(fte => fte.language.name === 'ko')?.flavor_text || move.flavor_text_entries?.find(fte => fte.language.name === 'en')?.flavor_text || ''}`} // ko 없으면 en
                    >
                      {move.name}
                    </MoveButton>
                )) : <p>배울 수 있는 공격 기술이 없습니다.</p>}
              </div>
            </div>
           ))}
           <SelectionControls>
              <button onClick={goBack}>포켓몬 다시 선택</button>
              {/* 모든 포켓몬 기술 선택 완료 및 로딩 중 아닐 때 버튼 활성화 */}
              {!loading && selectedPokemon.every(p => (selectedMoves[p.id]?.length || 0) === 4) && <button onClick={proceedToNextStep}>아이템 선택하기</button>}
           </SelectionControls>
        </>
      )}

      {/* --- 아이템 선택 단계 --- */}
      {step === 3 && (
        <>
           <StepTitle>아이템 선택 (포켓몬당 1개, 선택사항)</StepTitle>
           {selectedPokemon.map(pokemon => (
               <div key={pokemon.id} style={{ marginBottom: '20px', border: '1px solid #ccc', padding: '15px', borderRadius: '8px', background: '#fff' }}>
                 <h3 style={{display: 'flex', alignItems: 'center', gap: '10px'}}> <img src={pokemon.sprites?.front_default} alt={pokemon.name} style={{height: '40px'}}/> {pokemon.name} </h3>
                 <p>선택된 아이템: <strong>{availableItems.find(item => item.id === selectedItems[pokemon.id])?.name || '없음'}</strong></p>
                 <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
                      <button onClick={() => handleItemSelect(pokemon.id, null)} style={{ border: !selectedItems[pokemon.id] ? '2px solid blue' : '1px solid grey' }}> 아이템 없음 </button>
                     {availableItems.map(item => ( <button key={item.id} onClick={() => handleItemSelect(pokemon.id, item.id)} title={item.description} style={{ border: selectedItems[pokemon.id] === item.id ? '2px solid blue' : '1px solid grey' }}> {item.name} </button> ))}
                 </div>
               </div>
           ))}
           <SelectionControls>
              <button onClick={goBack}>기술 다시 선택</button>
              <button onClick={proceedToNextStep}>게임 시작!</button>
           </SelectionControls>
        </>
      )}
    </SelectionContainer>
  );
}

export default PokemonSelection;