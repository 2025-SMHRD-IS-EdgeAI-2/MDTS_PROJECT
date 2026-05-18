import { resolveAvatarUrl } from '../../utils/avatar'
import { useState } from 'react'
import { Search, Plus, Edit3, Trash2 } from 'lucide-react'

export default function CrewView({ 
  crewList, crewSearch, setCrewSearch, crewRoleTab, setCrewRoleTab, roles, 
  filteredCrew, activePatient, switchPatient, setShowModal 
}) {
  const handleImageError = (event) => {
    event.currentTarget.src = resolveAvatarUrl(null)
  }

  return (
    <div style={{ flex: 1, padding: 45, overflowY: 'auto', background: '#05070a' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ marginBottom: 45 }}>
          <h1 style={{ fontSize: 36, fontWeight: 900, marginBottom: 27 }}>선원 정보 관리 <span style={{ color: '#64748b', fontSize: 20, marginLeft: 14 }}>전체 {crewList?.length || 0}명</span></h1>
          <div style={{ display: 'flex', gap: 24, alignItems: 'flex-end' }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 18, background: 'rgba(255,255,255,0.03)', borderRadius: 20, padding: '0 27px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <Search size={28} color="#38bdf8" />
              <input placeholder="선원 검색..." value={crewSearch} onChange={e => setCrewSearch && setCrewSearch(e.target.value)} style={{ flex: 1, background: 'none', border: 'none', color: '#fff', fontSize: 20, height: 80, outline: 'none' }} />
            </div>
            <button onClick={() => setShowModal && setShowModal('create')} style={{ height: 80, background: '#38bdf8', color: '#000', border: 'none', borderRadius: 20, padding: '0 40px', fontWeight: 900, fontSize: 20, cursor: 'pointer' }}><Plus size={28} /> 신규 등록</button>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: 12, marginBottom: 32 }}>
          {roles?.map(r => (
            <button key={r} onClick={() => setCrewRoleTab && setCrewRoleTab(r)} style={{ padding: '12px 28px', borderRadius: 14, background: crewRoleTab === r ? '#38bdf8' : 'rgba(255,255,255,0.02)', color: crewRoleTab === r ? '#000' : '#64748b', border: 'none', fontWeight: 800, fontSize: 18, cursor: 'pointer' }}>{r}</button>
          ))}
        </div>

        <div style={{ background: 'rgba(255,255,255,0.01)', borderRadius: 28, border: '1px solid rgba(255,255,255,0.04)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
                <th style={{ padding: '24px 32px', color: '#64748b', fontWeight: 700 }}>이름/ID</th>
                <th style={{ padding: '24px 32px', color: '#64748b', fontWeight: 700 }}>직책</th>
                <th style={{ padding: '24px 32px', color: '#64748b', fontWeight: 700 }}>상태</th>
                <th style={{ padding: '24px 32px', color: '#64748b', fontWeight: 700 }}>액션</th>
              </tr>
            </thead>
            <tbody>
              {filteredCrew?.map(c => (
                <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', background: activePatient?.id === c.id ? 'rgba(56,189,248,0.04)' : 'transparent' }}>
                  <td style={{ padding: '28px 32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ width: 56, height: 56, borderRadius: 16, overflow: 'hidden', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img src={resolveAvatarUrl(c.avatar)} onError={handleImageError} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 21, fontWeight: 900, marginBottom: 4 }}>{c.name}</div>
                        <div style={{ fontSize: 15, color: '#475569' }}>{c.id}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '28px 32px', fontSize: 19, fontWeight: 700, color: '#38bdf8' }}>{c.role}</td>
                  <td style={{ padding: '28px 32px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '6px 16px', borderRadius: 20, background: c.status === '건강' ? 'rgba(45,212,191,0.08)' : 'rgba(244,63,94,0.08)', color: c.status === '건강' ? '#2dd4bf' : '#f43f5e', fontSize: 15, fontWeight: 800 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.status === '건강' ? '#2dd4bf' : '#f43f5e' }} />
                      {c.status}
                    </div>
                  </td>
                  <td style={{ padding: '28px 32px' }}>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <button onClick={() => switchPatient && switchPatient(c)} style={{ padding: '12px 24px', borderRadius: 12, background: 'rgba(56,189,248,0.1)', color: '#38bdf8', border: 'none', fontWeight: 800, cursor: 'pointer' }}>관리 시작</button>
                      <button style={{ padding: 12, borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: 'none', color: '#64748b', cursor: 'pointer' }}><Edit3 size={20}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

