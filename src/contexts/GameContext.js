// src/contexts/GameContext.js
import React, { createContext, useContext } from 'react';

const GameContext = createContext();

export const useGame = () => useContext(GameContext);

export const GameProvider = ({ children, value }) => {
  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};