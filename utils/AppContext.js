import React, { createContext, useContext, useReducer, useCallback } from 'react';

// Initial state
const initialState = {
  user: null,
  isOnline: true,
  isLoading: false,
  error: null,
  notifications: [],
  theme: 'dark',
  settings: {
    autoRefresh: true,
    refreshInterval: 30000, // 30 seconds
    showAnimations: true,
    compactMode: false,
  },
  cache: {
    stocks: new Map(),
    portfolio: null,
    lastUpdated: null,
  },
};

// Action types
const ACTIONS = {
  SET_USER: 'SET_USER',
  SET_ONLINE_STATUS: 'SET_ONLINE_STATUS',
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  ADD_NOTIFICATION: 'ADD_NOTIFICATION',
  REMOVE_NOTIFICATION: 'REMOVE_NOTIFICATION',
  UPDATE_SETTINGS: 'UPDATE_SETTINGS',
  UPDATE_CACHE: 'UPDATE_CACHE',
  CLEAR_CACHE: 'CLEAR_CACHE',
};

// Reducer
function appReducer(state, action) {
  switch (action.type) {
    case ACTIONS.SET_USER:
      return { ...state, user: action.payload };
    
    case ACTIONS.SET_ONLINE_STATUS:
      return { ...state, isOnline: action.payload };
    
    case ACTIONS.SET_LOADING:
      return { ...state, isLoading: action.payload };
    
    case ACTIONS.SET_ERROR:
      return { ...state, error: action.payload };
    
    case ACTIONS.CLEAR_ERROR:
      return { ...state, error: null };
    
    case ACTIONS.ADD_NOTIFICATION:
      return {
        ...state,
        notifications: [...state.notifications, { id: Date.now(), ...action.payload }]
      };
    
    case ACTIONS.REMOVE_NOTIFICATION:
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.payload)
      };
    
    case ACTIONS.UPDATE_SETTINGS:
      return {
        ...state,
        settings: { ...state.settings, ...action.payload }
      };
    
    case ACTIONS.UPDATE_CACHE:
      return {
        ...state,
        cache: { ...state.cache, ...action.payload }
      };
    
    case ACTIONS.CLEAR_CACHE:
      return {
        ...state,
        cache: { ...initialState.cache }
      };
    
    default:
      return state;
  }
}

// Create context
const AppContext = createContext();

// Provider component
export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Actions
  const setUser = useCallback((user) => {
    dispatch({ type: ACTIONS.SET_USER, payload: user });
  }, []);

  const setOnlineStatus = useCallback((isOnline) => {
    dispatch({ type: ACTIONS.SET_ONLINE_STATUS, payload: isOnline });
  }, []);

  const setLoading = useCallback((isLoading) => {
    dispatch({ type: ACTIONS.SET_LOADING, payload: isLoading });
  }, []);

  const setError = useCallback((error) => {
    dispatch({ type: ACTIONS.SET_ERROR, payload: error });
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: ACTIONS.CLEAR_ERROR });
  }, []);

  const addNotification = useCallback((notification) => {
    dispatch({ type: ACTIONS.ADD_NOTIFICATION, payload: notification });
  }, []);

  const removeNotification = useCallback((id) => {
    dispatch({ type: ACTIONS.REMOVE_NOTIFICATION, payload: id });
  }, []);

  const updateSettings = useCallback((settings) => {
    dispatch({ type: ACTIONS.UPDATE_SETTINGS, payload: settings });
  }, []);

  const updateCache = useCallback((cache) => {
    dispatch({ type: ACTIONS.UPDATE_CACHE, payload: cache });
  }, []);

  const clearCache = useCallback(() => {
    dispatch({ type: ACTIONS.CLEAR_CACHE });
  }, []);

  const value = {
    ...state,
    setUser,
    setOnlineStatus,
    setLoading,
    setError,
    clearError,
    addNotification,
    removeNotification,
    updateSettings,
    updateCache,
    clearCache,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

// Custom hook to use the context
export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

// Selector hooks for specific state
export function useUser() {
  const { user, actions } = useApp();
  return { user, setUser: actions.setUser };
}

export function useOnlineStatus() {
  const { isOnline, actions } = useApp();
  return { isOnline, setOnlineStatus: actions.setOnlineStatus };
}

export function useLoading() {
  const { isLoading, actions } = useApp();
  return { isLoading, setLoading: actions.setLoading };
}

export function useError() {
  const { error, actions } = useApp();
  return { error, setError: actions.setError, clearError: actions.clearError };
}

export function useNotifications() {
  const { notifications, actions } = useApp();
  return {
    notifications,
    addNotification: actions.addNotification,
    removeNotification: actions.removeNotification,
  };
}

export function useSettings() {
  const { settings, actions } = useApp();
  return { settings, updateSettings: actions.updateSettings };
}

export function useCache() {
  const { cache, actions } = useApp();
  return { cache, updateCache: actions.updateCache, clearCache: actions.clearCache };
}
