import { createContext, useContext, useState, useEffect } from 'react'
import { io } from 'socket.io-client'

// Connect through Vite's proxy so the socket works on any Vite port (5173 or 5174)
const socket = io('/', { path: '/socket.io' })

const DataContext = createContext(null)

const BADGE_RULES = [
  { id: 'beginner',      label: '🌱 Beginner',       desc: 'Logged 1 entry',       check: (entries) => entries >= 1  },
  { id: 'eco_starter',   label: '🌿 Eco Starter',    desc: 'Logged 5 entries',     check: (entries) => entries >= 5  },
  { id: 'eco_warrior',   label: '⚡ Eco Warrior',    desc: 'Logged 10 entries',    check: (entries) => entries >= 10 },
  { id: 'green_streak',  label: '🔥 Green Streak',   desc: 'Maintained a 7-day streak', check: (_, streak) => streak >= 7 },
  { id: 'champion',      label: '🏆 Eco Champion',   desc: 'Earned 500 eco points',     check: (_, __, pts) => pts >= 500 },
];

export function DataProvider({ children }) {
  const [entries, setEntries] = useState(() => {
    const saved = localStorage.getItem('cm_entries')
    return saved ? JSON.parse(saved) : []
  })
  const [ecoPoints, setEcoPoints] = useState(() => {
    return Number(localStorage.getItem('cm_points')) || 0
  })
  const [streak, setStreak] = useState(() => {
    return Number(localStorage.getItem('cm_streak')) || 0
  })
  const [lastActiveDate, setLastActiveDate] = useState(() => {
    return localStorage.getItem('cm_last_active') || ''
  })
  const [badges, setBadges] = useState(() => {
    const saved = localStorage.getItem('cm_badges')
    return saved ? JSON.parse(saved) : []
  })

  // Sync state to local storage when it changes
  useEffect(() => { localStorage.setItem('cm_entries', JSON.stringify(entries)) }, [entries])
  useEffect(() => { localStorage.setItem('cm_points', ecoPoints) }, [ecoPoints])
  useEffect(() => { localStorage.setItem('cm_streak', streak) }, [streak])
  useEffect(() => { localStorage.setItem('cm_last_active', lastActiveDate) }, [lastActiveDate])
  useEffect(() => { localStorage.setItem('cm_badges', JSON.stringify(badges)) }, [badges])

  function calcPoints(totalCO2) {
    if (totalCO2 < 3)  return 50;
    if (totalCO2 < 6)  return 30;
    if (totalCO2 < 10) return 15;
    return 10; // +10 points per entry standard base
  }

  const addEntry = (entryPayload) => {
    const today = new Date().toISOString().split('T')[0]
    
    // Core Entry
    const newEntry = {
      _id: Date.now().toString(),
      date: today,
      transport: entryPayload.transport,
      distance: Number(entryPayload.distance || 0),
      electricity: Number(entryPayload.electricity || 0),
      food: entryPayload.food,
      totalCO2: Number(entryPayload.co2),
    }

    const updatedEntries = [newEntry, ...entries]
    setEntries(updatedEntries)

    // Electron Notification Trigger
    if (window.electron && localStorage.getItem('trackerEnabled') === 'true') {
      const todayTotal = updatedEntries
        .filter(e => e.date === today)
        .reduce((sum, e) => sum + e.totalCO2, 0);
      
      window.electron.send('notify', {
        totalCO2: parseFloat(todayTotal.toFixed(2)),
        lastCO2: newEntry.totalCO2,
        transport: newEntry.transport
      });
    }

    // WebSocket Broadcaster
    socket.emit('new-entry', {
      totalCO2: parseFloat((entries.reduce((s, e) => s + e.totalCO2, 0) + newEntry.totalCO2).toFixed(2)),
      lastCO2: newEntry.totalCO2,
      transport: newEntry.transport
    });

    // Gamification Updates
    const pointsEarned = calcPoints(newEntry.totalCO2)
    const newTotalPts = ecoPoints + pointsEarned
    setEcoPoints(newTotalPts)

    let newStreak = streak;
    if (lastActiveDate !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yStr = yesterday.toISOString().split('T')[0];

      if (lastActiveDate === yStr) {
        newStreak += 1;
      } else {
        newStreak = 1;
      }
      setStreak(newStreak);
      setLastActiveDate(today);
    }

    // Checking Badges
    const newBadges = [...badges]
    let badgeEarned = false
    BADGE_RULES.forEach(rule => {
      if (!newBadges.includes(rule.id) && rule.check(updatedEntries.length, newStreak, newTotalPts)) {
        newBadges.push(rule.id)
        badgeEarned = true
      }
    });

    if (badgeEarned) {
      setBadges(newBadges)
    }

    return { pointsEarned, totalPoints: newTotalPts, streak: newStreak }
  }

  return (
    <DataContext.Provider value={{ entries, ecoPoints, streak, badges, addEntry, BADGE_RULES }}>
      {children}
    </DataContext.Provider>
  )
}

export const useData = () => useContext(DataContext)
