import { Ship, Database, Shield, CheckCircle } from 'lucide-react'
import { SettingCard, ModalField } from '../../../components/ui'

export default function SettingsView({ SHIP_INFO }) {
  return (
    <div style={{ flex: 1, padding: 45, background: '#05070a', overflowY: 'auto' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <h1 style={{ fontSize: 32, fontWeight: 900, marginBottom: 40 }}>시스템 설정 및 관리</h1>
        <div style={{ display: 'grid', gap: 32 }}>
          <SettingCard icon={<Ship size={28}/>} title="선박 정보 관리" desc="시스템이 설치된 선박 정보를 관리합니다.">
             <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <ModalField label="선박 명칭" value={SHIP_INFO?.name} readOnly />
                <ModalField label="선박 유형" value={SHIP_INFO?.type} readOnly />
                <ModalField label="IMO 번호" value={SHIP_INFO?.id} readOnly />
                <ModalField label="현재 상태" value={SHIP_INFO?.status} readOnly />
             </div>
          </SettingCard>
          
          <SettingCard icon={<Database size={28}/>} title="데이터 동기화 설정" desc="육상 의료 센터와의 동기화 상태를 관리합니다.">
            <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 12, color: '#2dd4bf', fontWeight: 700 }}>
              <CheckCircle size={20} /> 실시간 동기화 활성 중 (지연 시간 : 1.2s)
            </div>
          </SettingCard>

          <SettingCard icon={<Shield size={28}/>} title="AI 모델 업데이트" desc="최신 Edge AI 모델 엔진 상태를 점검합니다.">
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>현재 버전 : v2.4.1-Maritime-Edge</div>
              <button style={{ padding: '10px 20px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}>업데이트 확인</button>
            </div>
          </SettingCard>
        </div>
      </div>
    </div>
  )
}
