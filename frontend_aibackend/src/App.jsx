import { useState, useEffect, useRef } from 'react'
import Login from './pages/Login'
import Layout from './components/Layout'
import Main from './pages/Main'
import CrewManagement from './pages/CrewManagement'
import Emergency from './pages/Emergency'
import Patients from './pages/Patients'
import PatientChart from './pages/PatientChart'
import Settings from './pages/Settings'
import { SHIP_INFO, DEVICE_INFO } from './utils/constants'
import { AlertProvider } from './utils/AlertContext'
import { fetchCrew, fetchSensorCrew, mapCrewToFrontend, fetchFocusedCrewState, syncFocusedCrewState, setMonitorCrew } from './utils/api'

function PatientLoading({ message }) {
  return (
    <div style={{
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#020408',
      color: '#94a3b8',
      fontSize: 20,
      fontWeight: 800,
    }}>
      {message}
    </div>
  )
}

function getCrewIdForSync(crew) {
  const value = Number(crew?.crewDbId || String(crew?.id || '').split('-').pop())
  return Number.isFinite(value) && value > 0 ? Math.trunc(value) : null
}

export default function App() {
  const [auth, setAuth] = useState(null)
  const [page, setPage] = useState('main')
  const [activePatient, setActivePatient] = useState(null)
  const [crewList, setCrewList] = useState([])
  const [crewLoadError, setCrewLoadError] = useState('')

  const [emergencyData, setEmergencyData] = useState(null)
  const [mainData, setMainData] = useState(null)
  const [hasShownTutorial, setHasShownTutorial] = useState(false)
  const pyqtCrewIdRef = useRef(null)
  const activePatientRef = useRef(null)

  // 초기 진입 시 DB 선원 목록에서 기본 선원 로드
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setCrewLoadError('')
        const dbCrewList = await fetchCrew()
        const focusedState = await fetchFocusedCrewState().catch(() => null)
        const focusedIds = new Set((focusedState?.focused_crew_ids || []).map(Number))
        const savedCrewList = (() => {
          try {
            return JSON.parse(localStorage.getItem('mdts_crew_list') || '[]')
          } catch {
            return []
          }
        })()
        const mapped = (Array.isArray(dbCrewList) ? dbCrewList : [])
          .map(mapCrewToFrontend)
          .filter(Boolean)
          .map((crew) => {
            const saved = Array.isArray(savedCrewList)
              ? savedCrewList.find((item) => item.id === crew.id)
              : null
            return {
              ...crew,
              isEmergency: Boolean(focusedIds.has(Number(crew.crewDbId)) || saved?.isEmergency || crew.isEmergency),
            }
          })
        if (!mapped.length) {
          if (!cancelled) {
            setCrewList([])
            setCrewLoadError('DB 선원 정보가 비어 있습니다.')
          }
          return
        }

        const fromLocal = (() => {
          try {
            const stored = localStorage.getItem('mdts_active_patient_id')
            if (!stored) return null
            return mapped.find((c) => c.id === stored) || null
          } catch {
            return null
          }
        })()
        const target = fromLocal || mapped.find((c) => c.isEmergency) || mapped[0]
        if (!cancelled) {
          localStorage.setItem('mdts_crew_list', JSON.stringify(mapped))
          syncFocusedCrewState(
            mapped.map(getCrewIdForSync).filter((crewId, index) => crewId && mapped[index]?.isEmergency),
            'web-app-bootstrap'
          ).catch(error => {
            console.warn('[mdts-app] focused crew bootstrap sync failed:', error.message)
          })
          setCrewList(mapped)
          setCrewLoadError('')
          setActivePatient(target)
        }
      } catch (error) {
        if (!cancelled) {
          setCrewList([])
          setCrewLoadError(`DB 선원 정보 연결 실패: ${error.message}`)
        }
        console.warn('[mdts-app] crew bootstrap failed:', error.message)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [auth])

  // 웹 내부 선원 변경은 PyQt5 센서 서버로 전파하지 않는다.
  useEffect(() => {
    if (!activePatient) return
    activePatientRef.current = activePatient
    try {
      localStorage.setItem('mdts_active_patient_id', activePatient.id)
    } catch {}
  }, [activePatient?.id])

  // PyQt5에서 선택한 선원은 웹 대시보드에 단방향으로 반영한다.
  useEffect(() => {
    if (!auth || !crewList.length) return

    let cancelled = false

    const applySharedFocusState = (focusState) => {
      if (!focusState || !Array.isArray(focusState.focused_crew_ids)) return
      const focusedIds = new Set(focusState.focused_crew_ids.map(Number))
      setCrewList(prev => {
        const next = prev.map(crew => ({
          ...crew,
          isEmergency: focusedIds.has(Number(crew.crewDbId || String(crew.id || '').split('-').pop())),
        }))
        try {
          localStorage.setItem('mdts_crew_list', JSON.stringify(next))
        } catch {}
        return next
      })
      setActivePatient(prev => {
        if (!prev) return prev
        const crewId = Number(prev.crewDbId || String(prev.id || '').split('-').pop())
        return {
          ...prev,
          isEmergency: focusedIds.has(crewId),
        }
      })
    }

    const syncCrewFromPyqt = async () => {
      try {
        const [state, focusState] = await Promise.all([
          fetchSensorCrew(),
          fetchFocusedCrewState().catch(() => null),
        ])
        if (!cancelled) {
          applySharedFocusState(focusState)
        }

        const crewId = Number(state?.crew_id)
        if (!Number.isFinite(crewId) || crewId <= 0) {
          const webCrewId = getCrewIdForSync(activePatientRef.current)
          if (webCrewId) {
            try {
              await setMonitorCrew(webCrewId)
              pyqtCrewIdRef.current = webCrewId
            } catch (error) {
              console.warn('[mdts-app] failed to apply web crew to empty PyQt5 state:', error.message)
            }
          }
          return
        }

        const normalizedCrewId = Math.trunc(crewId)
        const target = crewList.find((crew) => Number(crew.crewDbId) === normalizedCrewId)
        if (!target || cancelled) return

        pyqtCrewIdRef.current = normalizedCrewId

        setActivePatient((prev) => (
          Number(prev?.crewDbId) === normalizedCrewId ? prev : target
        ))
      } catch (error) {
        console.warn('[mdts-app] failed to sync crew from PyQt5:', error.message)
      }
    }

    syncCrewFromPyqt()
    const poll = setInterval(syncCrewFromPyqt, 2000)
    return () => {
      cancelled = true
      clearInterval(poll)
    }
  }, [auth, crewList])

  // 페이지 전환 로직
  const handleNavigate = (newPage, data = null) => {
    if (newPage === 'emergency') {
      setEmergencyData(data)
    } else {
      setEmergencyData(null)
    }
    setMainData(newPage === 'main' ? data : null)
    setPage(newPage)
  }

  const handleWebSwitchPatient = (patient) => {
    if (!patient) return

    const crewDbId = Number(patient.crewDbId)
    const normalizedCrewId = Number.isFinite(crewDbId) ? Math.trunc(crewDbId) : null
    const currentPyqtCrewId = Number(pyqtCrewIdRef.current)

    if (Number.isFinite(currentPyqtCrewId) && currentPyqtCrewId > 0 && normalizedCrewId !== currentPyqtCrewId) {
      const pyqtPatient = crewList.find((crew) => Number(crew.crewDbId) === currentPyqtCrewId)
      if (pyqtPatient) {
        setActivePatient(pyqtPatient)
        return
      }
    }

    setActivePatient(patient)

    if ((!Number.isFinite(currentPyqtCrewId) || currentPyqtCrewId <= 0) && normalizedCrewId) {
      setMonitorCrew(normalizedCrewId).then(() => {
        pyqtCrewIdRef.current = normalizedCrewId
      }).catch((error) => {
        console.warn('[mdts-app] failed to apply web selected crew to PyQt5:', error.message)
      })
    }
  }

  return (
    <AlertProvider>
      {!auth ? (
        <Login onLogin={(val) => setAuth(val)} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100%', overflow: 'hidden' }}>
          <Layout
            activePage={page}
            onNavigate={handleNavigate}
            auth={{ shipNo: auth.ship || 'MV KOREA STAR', deviceNo: auth.device || 'MED-001' }}
            onLogout={() => { setAuth(null); setHasShownTutorial(false); }}
            isOnline={false}
          />
          <div style={{ flex: 1, overflow: 'hidden' }}>
            {page === 'main' && (
              activePatient
                ? <Main patient={activePatient} crewList={crewList} auth={auth} onNavigate={handleNavigate} onSwitchPatient={handleWebSwitchPatient} historicalRecord={mainData?.historicalRecord || null} tutorialShown={hasShownTutorial} setTutorialShown={setHasShownTutorial} />
                : <PatientLoading message={crewLoadError || 'DB 선원 정보를 불러오는 중입니다.'} />
            )}
            {page === 'crew'      && (
              <CrewManagement onSelectPatient={p => { handleWebSwitchPatient(p); handleNavigate('chart') }} />
            )}
            {page === 'emergency' && (
              activePatient
                ? (
                  <Emergency
                    patient={activePatient}
                    initialAction={emergencyData?.traumaType || emergencyData?.type}
                    initialTraumaResult={emergencyData?.traumaResult || null}
                    initialContext={emergencyData || null}
                    onNavigate={handleNavigate}
                  />
                )
                : <PatientLoading message={crewLoadError || 'DB 선원 정보를 불러오는 중입니다.'} />
            )}
            {page === 'chart'     && (
              activePatient
                ? <PatientChart patient={activePatient} onNavigate={handleNavigate} onSwitchPatient={handleWebSwitchPatient} />
                : <PatientLoading message={crewLoadError || 'DB 선원 정보를 불러오는 중입니다.'} />
            )}
            {page === 'settings'  && <Settings />}
          </div>
        </div>
      )}
    </AlertProvider>
  )
}
