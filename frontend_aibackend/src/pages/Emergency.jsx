import { useState, useEffect } from 'react'
import { Brain, Heart, Zap, Shield, ShieldAlert, Cpu, AlertCircle, Wind, Clock, Video, Pill, History, User, Info, Activity, Scissors, Plus, Thermometer, Mic, X, ChevronRight, HeartPulse, ChevronLeft, CheckCircle2, AlertTriangle, ArrowDown, FileText, Ruler, Droplets, MapPin, Phone, Upload, Camera, Edit3, Bone, Flame, RefreshCw, Send, Check, LayoutDashboard} from 'lucide-react'
import { useAlert } from '../utils/AlertContext'
import { fetchLatestVital, fetchPyqtSensorVital, mapVitalToFrontend, updateVital, savePatientHistory, stopPyqtTraumaStream } from '../utils/api'
import { resolveAvatarUrl } from '../utils/avatar'
import { CardiacIllustration, TraumaIllustration, UnconsciousIllustration, RespiratoryIllustration } from '../components/EmergencyIllustrations'
import CameraModal from '../components/CameraModal'

const SEVERITY_COLORS = { LOW: '#22c55e', MEDIUM: '#f97316', HIGH: '#ef4444', CRITICAL: '#dc2626' }

const ACTION_GUIDES = {
  '심폐소생술': {
    title: '심폐소생술 및 AED 사용',
    description: '심장이 멈추거나 호흡이 없는 경우 즉시 시행하는 생명유지 처치입니다.',
    diagnosis: '심정지(Cardiac Arrest) 의심',
    severity: null,
    riskLevel: '4',
    legalBasis: null,
    hasMetronome: true,
    steps: [
      { title: '의식 및 호흡 확인', desc: '어깨를 두드리며 "괜찮으세요?"라고 묻고, 가슴이 오르내리는지 10초간 확인하십시오.', tip: '이 단계를 클릭하면 골든타임 타이머(4분)가 작동합니다.', stepImage: '/assets/Fracture_Dislocation/CPR-01.png' },
      { title: '도움 및 AED 요청', desc: '주변 사람 중 한 명을 지목해 "비상 상황 전파" 및 "AED(심장충격기)"를 가져와 달라고 지시하십시오.', stepImage: '/assets/Fracture_Dislocation/CPR-02.png' },
      { title: '가슴 압박 시행', desc: '가슴 중앙에 깍지 낀 손을 대고, 팔꿈치를 펴서 수직으로 5~6cm 깊이로 강하게 누르십시오.', tip: '분당 100~120회 속도를 유지하세요.', stepImage: '/assets/Fracture_Dislocation/CPR-03.png' },
      { title: 'AED 패드 부착', desc: '전원을 켜고 패드 하나는 오른쪽 쇄골 아래, 다른 하나는 왼쪽 옆구리에 붙인 뒤 음성 지시에 따르십시오.', tip: '분석 중에는 환자에게서 떨어지십시오.', stepImage: '/assets/Fracture_Dislocation/CPR-04.png' }
    ],
    dos: ['1초당 2번 속도로 강하게 압박하세요', '압박 후 가슴이 완전히 올라오게 하세요', 'AED의 음성 지시에 따라 행동하십시오'],
    donts: ['환자가 의식이 있다면 하지 마세요', '맥박 확인을 위해 시간을 허비하지 마세요', '압박 중 팔꿈치를 굽히지 마세요'],
    warning: '환자가 스스로 숨을 쉬거나 의료진이 올 때까지 중단하지 마십시오.',
    color: '#ef4444'
  },
  '하임리히법': {
    title: '기도 이물질 제거 (하임리히법)',
    description: '기도가 이물질로 막혀 말을 못 하거나 호흡이 불가능한 경우 즉시 시행합니다.',
    diagnosis: '기도 폐쇄(Airway Obstruction)',
    severity: null,
    riskLevel: '4',
    legalBasis: null,
    steps: [
      { title: '의식 및 상태 확인', desc: '환자 뒤로 가서 말을 걸어보세요. 목을 감싸고 말을 전혀 못 하면 즉시 처치를 시작합니다.', tip: '환자가 기침을 할 수 있다면 계속하게 하세요.', stepImage: '/assets/Fracture_Dislocation/Heimlich_Maneuver-01.png' },
      { title: '자세 잡고 지탱하기', desc: '환자 뒤에 서서 양팔로 허리를 감싸고, 내 한쪽 다리를 환자 다리 사이에 넣어 환자가 쓰러질 때를 대비해 지탱하세요.', stepImage: '/assets/Fracture_Dislocation/Heimlich_Maneuver-02.png' },
      { title: '손 모양과 위치 잡기', desc: '한쪽 주먹의 엄지손가락 쪽 면을 배꼽과 명치 사이에 대고, 다른 손으로 그 주먹을 꽉 움켜쥐십시오.', stepImage: '/assets/Fracture_Dislocation/Heimlich_Maneuver-03.png' },
      { title: '강하게 밀어 올리기', desc: '환자의 배를 안쪽 위 방향(J자 모양)으로 강하게 들어 올리듯 반복해서 당기십시오.', tip: '이물질이 나오거나 환자가 의식을 잃을 때까지 반복하세요.', stepImage: '/assets/Fracture_Dislocation/Heimlich_Maneuver-04.png' }
    ],
    dos: ['이물질이 튀어나올 때까지 최대한 강하게 하세요', '환자가 의식을 잃으면 즉시 바닥에 눕히고 심폐소생술을 시작하세요'],
    donts: ['입안에 이물질이 보이지 않는데 손가락을 넣어 쑤시지 마세요', '임산부는 복부가 아닌 가슴 부위를 압박하세요'],
    warning: '환자가 의식을 잃으면 즉시 기도를 확보하고 심폐소생술(CPR)로 전환하십시오.',
    color: '#ef4444'
  },
  '찰과상': {
    title: '찰과상 (Abrasions)',
    description: '넘어지거나 긁혀서 피부 표면이 쓸린 상처입니다. 피는 많이 나지 않지만, 모래·먼지가 파고들어 곪을 수 있어 깨끗이 씻는 것이 가장 중요합니다.',
    diagnosis: '찰과상 (Abrasion)',
    severity: 'LOW',
    riskLevel: '1',
    legalBasis: 'WHO 선내의료지침 Ch.7',
    steps: [
      { title: '상처를 깨끗이 씻기', desc: '흐르는 깨끗한 물이나 식염수로 상처 속 흙·먼지를 5~10분간 충분히 씻어내십시오.', tip: '이 단계를 클릭하면 세척 타이머가 시작됩니다. 이물질이 남아 있으면 나중에 곪는 원인이 됩니다.', stepImage: '/assets/trauma_wound/찰과상_01.png' },
      { title: '소독 연고 바르기', desc: '깨끗한 거즈로 물기를 닦은 뒤, 소독 연고를 면봉으로 얇게 발라 주십시오.', tip: '손으로 상처를 직접 만지지 마십시오. 장갑을 꼭 착용하세요.', stepImage: '/assets/trauma_wound/찰과상_02.png' },
      { title: '거즈로 덮어 보호하기', desc: '바람이 통하는 거즈를 상처 위에 덮어 먼지나 오염으로부터 보호하십시오.', stepImage: '/assets/trauma_wound/절상_03.png' },
      { title: '하루마다 확인 및 교체', desc: '하루에 한 번 거즈를 교체하고 상처 상태를 확인하십시오. 상처 주변이 빨개지거나 고름이 나오면 즉시 의료진에게 알리십시오.', tip: '곪는 신호: 주변이 빨개짐, 고름, 열감, 냄새.', stepImage: '/assets/trauma_wound/찰과상_04.png' }
    ],
    dos: ['처치 전 반드시 장갑을 착용하십시오', '하루에 한 번 거즈를 교체하십시오', '상처 주변을 항상 깨끗하게 유지하십시오'],
    donts: ['알코올·소독약을 상처 안에 직접 붓지 마십시오', '솜을 상처에 직접 붙이지 마십시오', '된장·치약 등 민간요법을 사용하지 마십시오'],
    warning: '상처 주변이 빨개지거나 고름이 생기면 곪은 것입니다. 즉시 의료진에게 보고하십시오.',
    color: '#22c55e'
  },
  '타박상': {
    title: '타박상 (Bruises)',
    description: '부딪히거나 맞아서 생긴 멍입니다. 피부는 찢어지지 않았지만 피부 속 혈관이 터져 멍이 들고 붓습니다. 심하면 뼈가 부러진 경우도 있으니 주의가 필요합니다.',
    diagnosis: '타박상 (Contusion)',
    severity: 'LOW',
    riskLevel: '1',
    legalBasis: '선원법 시행규칙 [별표 5의5]',
    steps: [
      { title: '차갑게 식히기 처음 48시간', desc: '처음 48시간 동안 얼음팩(수건에 싸서)을 20분 올려두고, 20분 쉬는 것을 반복하십시오.', tip: '이 단계를 클릭하면 냉찜질 타이머(20분)가 시작됩니다. 얼음이 피부에 직접 닿으면 동상이 생길 수 있습니다.', stepImage: '/assets/trauma_wound/타박상_01.png' },
      { title: '다친 부위 높이 올려두기', desc: '다친 부위를 심장보다 높은 위치에 올려두면 붓기가 줄어듭니다.', stepImage: '/assets/trauma_wound/타박상_02.png' },
      { title: '따뜻하게 하기 48시간 이후', desc: '48시간이 지난 뒤에는 따뜻한 찜질로 혈액 순환을 도와 빠른 회복을 도우십시오.', stepImage: '/assets/trauma_wound/타박상_03.png' },
      { title: '뼈 부러짐 의심 시 고정', desc: '통증이 심해지거나 부위가 더 붓고 모양이 이상하면 뼈가 부러진 것일 수 있습니다. 움직이지 않도록 즉시 고정하십시오.', tip: '모양이 틀어지거나 살짝만 건드려도 극심하게 아프면 골절 신호입니다.', stepImage: '/assets/trauma_wound/타박상_04.png' }
    ],
    dos: ['처음 48시간은 냉찜질로 붓기를 줄이십시오', '다친 부위를 심장보다 높게 올려두십시오', '통증이 심해지면 뼈 부러짐 가능성을 의심하십시오'],
    donts: ['처음 48시간 안에는 뜨거운 찜질을 하지 마십시오', '멍든 곳을 세게 주무르지 마십시오', '모양이 이상해도 직접 맞추려 하지 마십시오'],
    warning: '통증이 심해지거나 모양이 이상하게 변하면 뼈가 부러진 것일 수 있습니다. 즉시 고정하고 의료진에게 보고하십시오.',
    color: '#22c55e'
  },
  '화상': {
    title: '화상 긴급 냉각 및 보호',
    description: '즉각적인 냉각이 조직 손상을 최소화합니다. 뜨거운 물, 증기, 화염 또는 화학물질 등에 의해 발생하는 피부 손상입니다.',
    diagnosis: '2도 화상(물집 형성) 의심',
    severity: 'HIGH',
    riskLevel: '3',
    legalBasis: '선원법 시행규칙 [별표 5의5] 화상처치',
    steps: [
      { title: '흐르는 물에 20분 냉각', desc: '12~25°C 찬물에 최소 20분 이상 노출시켜 열기를 식힙니다. 수압은 약하게 유지하십시오.', tip: '이 단계를 클릭하면 냉각 타이머(20분)가 시작됩니다. 얼음물 절대 금지 — 저체온증·혈관 수축 위험.', stepImage: '/assets/Fracture_Dislocation/Burn-01.png' },
      { title: '의복 및 장신구 제거', desc: '피부가 붓기 전 반지·시계 등 신속 제거. 피부에 붙은 옷은 억지로 떼지 마십시오.', tip: '무리하게 당기면 피부가 함께 벗겨질 수 있습니다. 장신구는 혈액 순환을 방해할 수 있습니다.', stepImage: '/assets/Fracture_Dislocation/Burn-02.png' },
      { title: '화상 연고 도포', desc: '깨끗한 면봉을 사용하여 화상 부위에 화상 전용 연고를 얇게 펴 발라 주십시오.', tip: '물집은 절대 터뜨리지 마십시오. 감염의 원인이 됩니다.', stepImage: '/assets/Fracture_Dislocation/Burn-03.png' },
      { title: '멸균 드레싱 및 보호', desc: '멸균 거즈나 화상 전용 드레싱을 환부에 대고 느슨하게 고정하여 외부 오염을 차단하십시오.', tip: '상처 부위가 압박되지 않도록 주의하며, 즉시 의료진에게 보고하십시오.', stepImage: '/assets/Fracture_Dislocation/Burn-04.png' }
    ],
    dos: ['최소 20분간 흐르는 물에 식히십시오', '물집이 터지지 않도록 주의하십시오', '다친 부위를 심장보다 높게 올리십시오'],
    donts: ['얼음을 직접 대지 마십시오', '물집을 억지로 터뜨리지 마십시오', '된장, 소주, 치약 등을 바르지 마십시오'],
    warning: '안면 화상이나 호흡 곤란 동반 시 즉시 산소를 공급하고 배를 돌리십시오.',
    color: '#f59e0b'
  },
  '절상': {
    title: '절상 (Cut)',
    description: '칼이나 유리처럼 날카로운 것에 베인 상처입니다. 상처 가장자리가 깔끔하게 잘려 있으며, 깊이 베이면 혈관이나 힘줄까지 다칠 수 있습니다.',
    diagnosis: '절상 (Incised Wound)',
    severity: 'MEDIUM',
    riskLevel: '2',
    legalBasis: 'WHO 선내의료지침 Ch.7',
    steps: [
      { title: '거즈로 눌러 피 멈추기 (5~10분)', desc: '깨끗한 거즈를 상처에 대고 5~10분간 꾹 눌러 피를 멈추십시오. 거즈가 피에 젖어도 떼지 말고 위에 계속 덧대십시오.', stepImage: '/assets/trauma_wound/절상_01.png' },
      { title: '깨끗한 물로 씻기', desc: '피가 멈추면 깨끗한 물이나 식염수로 상처를 충분히 씻어내십시오.', tip: '알코올 등 소독약을 상처 안에 직접 붓지 마십시오.', stepImage: '/assets/trauma_wound/절상_02.png' },
      { title: '상처 테이프로 임시 접합', desc: '상처가 1cm보다 얕고 벌어지지 않으면 상처 접합 테이프(스테리스트립)로 가장자리를 맞붙여 주십시오.', stepImage: '/assets/trauma_wound/절상_03.png' },
      { title: '깊은 상처는 의료진에게 즉시 알리기', desc: '1cm 이상 깊거나 벌어진 상처는 테이프로 임시로 맞붙인 뒤 즉시 원격 의료진에게 알리십시오. 바늘로 꿰매는 것은 반드시 의료진이 해야 합니다.', tip: '6시간 안에 처치하지 않으면 나중에 꿰매기가 어려워집니다.', stepImage: '/assets/trauma_wound/절상_04.png' }
    ],
    dos: ['거즈를 최소 5~10분간 꾹 눌러 피를 멈추십시오', '깊은 상처는 임시 접합 후 즉시 의료진에게 알리십시오', '상처 가장자리를 테이프로 맞붙이십시오'],
    donts: ['피가 멈추기 전에 거즈를 떼지 마십시오', '바늘로 꿰매는 것을 직접 시도하지 마십시오', '힘줄이나 뼈가 보여도 직접 건드리지 마십시오'],
    warning: '1cm 이상 깊거나 벌어진 상처는 테이프로 임시 접합 후 즉시 의료진에게 보고하십시오. 바느질(봉합)은 반드시 의료진만 할 수 있습니다.',
    color: '#f97316'
  },
  '열상': {
    title: '열상 (Laceration)',
    description: '딱딱한 것에 세게 부딪히거나 찢겨서 피부가 울퉁불퉁하게 찢어진 상처입니다. 상처 안쪽이 오염되기 쉽고 곪을 위험이 높습니다.',
    diagnosis: '열상 (Laceration)',
    severity: 'HIGH',
    riskLevel: '3',
    legalBasis: '선원법 시행규칙 [별표 5의5]',
    steps: [
      { title: '강하게 눌러 피 멈추기', desc: '거즈를 상처에 대고 있는 힘껏 꾹 눌러 피를 멈추십시오. 피가 많이 솟구치면 상처 더 위쪽 부분도 함께 눌러 주십시오.', tip: '거즈가 젖어도 떼지 말고 위에 계속 덧대어 눌러 주십시오.', stepImage: '/assets/trauma_wound/열상_01.png' },
      { title: '깨끗한 물로 충분히 씻기', desc: '식염수나 깨끗한 물을 많이 사용하여 상처 안쪽을 충분히 씻어내십시오.', tip: '찢겨서 울퉁불퉁한 상처 안쪽까지 꼼꼼히 씻어야 합니다.', stepImage: '/assets/trauma_wound/열상_02.png' },
      { title: '임시 접합 후 의료진에게 즉시 알리기', desc: '상처 접합 테이프로 임시로 맞붙인 뒤 즉시 원격 의료진에게 알리십시오. 바늘로 꿰매는 것은 반드시 의료진이 해야 합니다.', tip: '의료진 연결 전까지 거즈로 덮어 상처를 보호하십시오.', stepImage: '/assets/trauma_wound/열상_03.png' },
      { title: '파상풍·감염 확인', desc: '파상풍 주사를 맞은 적이 있는지 확인하십시오. 48시간 동안 상처 주변이 빨개지거나 고름이 나오지 않는지 살펴봐야 합니다.', tip: '빨개짐·고름·열감·냄새가 나면 즉시 의료진에게 보고하십시오.', stepImage: '/assets/trauma_wound/열상_04.png' }
    ],
    dos: ['강하게 눌러 피를 먼저 멈추십시오', '물을 많이 사용해 충분히 씻어내십시오', '파상풍 주사 접종 여부를 반드시 확인하십시오'],
    donts: ['바늘로 꿰매는 것을 직접 시도하지 마십시오', '감염이 의심되면 상처를 밀봉하지 마십시오', '울퉁불퉁한 가장자리를 억지로 맞추지 마십시오'],
    warning: '피가 계속 솟구치면 지혈대를 사용하십시오. 바느질(봉합)은 반드시 의료진만 할 수 있습니다.',
    color: '#ef4444'
  },
  '자창': {
    title: '자창 (Stab Wound)',
    description: '칼이나 못처럼 뾰족한 것에 찔린 상처입니다. 겉으로 피가 적게 나도 몸 안의 장기나 혈관이 다쳐 있을 수 있어 6종 외상 중 가장 위험합니다.',
    diagnosis: '자창 (Penetrating Stab Wound)',
    severity: 'CRITICAL',
    riskLevel: '4',
    legalBasis: '선원법 시행규칙 [별표 5의5]',
    steps: [
      { title: '박힌 것 절대 빼지 말고 고정', desc: '칼 등 박힌 물체는 절대 빼지 마십시오. 수건이나 거즈로 주변을 받쳐 물체가 흔들리지 않도록 고정만 하십시오.', tip: '박힌 물체가 혈관을 막고 있어, 뽑으면 피가 한꺼번에 쏟아질 수 있습니다.', stepImage: '/assets/trauma_wound/자창_01.png' },
      { title: '주변 눌러 지혈 / 가슴이면 테이프 처치', desc: '물체 주변을 거즈로 둘러 피를 멈추십시오. 가슴에 찔렸다면 테이프를 3면만 붙이고 1면은 열어두어 공기가 빠져나올 수 있게 하십시오.', tip: '가슴에 테이프를 4면 모두 막으면 폐에 공기가 차서 더 위험해집니다.', stepImage: '/assets/trauma_wound/자창_02.png' },
      { title: '따뜻하게 덮고 다리 높이기 / 금식', desc: '담요 등으로 환자를 따뜻하게 덮고, 다리를 높게 올려 쇼크를 예방하십시오. 음식과 물은 절대 주지 마십시오.', tip: '쇼크 신호: 얼굴이 창백해짐, 피부가 차갑고 축축함, 맥박이 빨라짐, 정신이 흐릿해짐.', stepImage: '/assets/trauma_wound/자창_03.png' },
      { title: '즉시 배 돌리고 이송', desc: '지금 당장 배를 돌려 병원으로 향하십시오. 먼저 의료진에게 연락하여 지시를 받으십시오.', tip: '겉으로는 가벼워 보여도 몸 안이 크게 다쳐 생명이 위험할 수 있습니다.', stepImage: '/assets/trauma_wound/자창_04.png' }
    ],
    dos: ['박힌 물체는 고정만 하고 절대 빼지 마십시오', '가슴 찔림은 테이프를 3면만 붙이십시오', '즉시 배를 돌리고 의료진에게 연락하십시오'],
    donts: ['박힌 물체를 절대 빼지 마십시오', '환자에게 음식이나 물을 주지 마십시오', '피가 적다고 괜찮다고 생각하지 마십시오'],
    warning: '겉으로 피가 적어도 몸 안에서 크게 출혈 중일 수 있습니다. 지체 없이 배를 돌려 가장 빠른 경로로 병원에 이송하십시오.',
    color: '#dc2626'
  },
  '기도 확보': {
    title: '기도 확보 및 호흡 보조',
    description: '의식 저하 또는 호흡 곤란 환자의 기도를 유지하여 자가 호흡을 돕습니다.',
    diagnosis: '호흡 곤란 및 기도 폐쇄 위험',
    severity: null,
    riskLevel: '3',
    legalBasis: null,
    steps: [
      { title: '머리 기울이기-턱 올리기', desc: '한 손을 이마에 대고 머리를 뒤로 젖히며, 다른 손가락으로 턱뼈를 들어 올려 기도를 확보하십시오.', stepImage: '/assets/Fracture_Dislocation/Airway_Management-01.png' },
      { title: '입안 이물질 제거', desc: '눈에 보이는 구토물이나 이물질이 있다면 머리를 옆으로 돌려 손가락으로 가볍게 제거하십시오.', stepImage: '/assets/Fracture_Dislocation/Airway_Management-02.png' },
      { title: '의복 이완 및 조임 해제', desc: '넥타이, 벨트, 상의 단추 등 환자의 호흡을 방해하는 조이는 의복을 신속히 풀어주십시오.', tip: '흉부 팽창을 자유롭게 하여 자가 호흡을 돕습니다.', stepImage: '/assets/Fracture_Dislocation/Airway_Management-03.png' },
      { title: '회복 자세 유지', desc: '환자가 스스로 숨을 쉰다면 몸을 옆으로 돌려 눕혀 기도가 막히지 않도록 조치하십시오.', tip: '혀가 뒤로 말리거나 구토물에 의한 질식을 예방합니다.', stepImage: '/assets/Fracture_Dislocation/Airway_Management-04.png' }
    ],
    dos: ['환자가 자가 호흡 중이면 옆으로 눕히세요', '구토 시 즉시 몸 전체를 옆으로 돌리세요'],
    donts: ['의식이 없는 환자에게 물을 먹이지 마세요', '머리 밑에 베개를 넣어 기도를 꺾지 마세요'],
    warning: '호흡음이 거칠거나 청색증이 보이면 즉시 심폐소생술을 준비하십시오.',
    color: '#38bdf8'
  },
  '익수/저체온': {
    title: '익수 및 저체온 처치',
    description: '익수 또는 장기간 저온 노출로 인한 심부 체온 저하 상태. 작은 충격에도 심정지가 올 수 있어 매우 신중하게 다루어야 합니다.',
    diagnosis: '심부 저체온증(Hypothermia)',
    severity: null,
    riskLevel: '2',
    legalBasis: null,
    steps: [
      { title: '젖은 의복 제거', desc: '바람이 없는 따뜻하고 건조한 곳으로 이동하고, 젖은 옷을 가위로 잘라 제거한 뒤 마른 수건으로 몸을 닦으십시오.', stepImage: '/assets/Fracture_Dislocation/Drowning_Hypothermia-01.png' },
      { title: '중심 체온 가온', desc: '담요로 몸을 감싸고, 온팩을 겨드랑이, 사타구니, 목 등 굵은 혈관 부위에 대십시오.', stepImage: '/assets/Fracture_Dislocation/Drowning_Hypothermia-02.png' },
      { title: '안정 및 수평 이동', desc: '환자를 갑자기 일으키거나 팔다리를 주무르지 마십시오. 차가운 피가 심장으로 흘러가면 위험합니다.', stepImage: '/assets/Fracture_Dislocation/Drowning_Hypothermia-03.png' }
    ],
    dos: ['의식이 있다면 따뜻하고 단 음료를 주십시오', '환자를 아주 조심스럽게(수평으로) 옮기십시오'],
    donts: ['팔다리를 문지르거나 주무르지 마세요', '뜨거운 물에 환자를 직접 담그지 마세요'],
    warning: '심한 저체온증 환자는 작은 충격에도 심정지가 올 수 있으니 달걀 다루듯 조심하십시오.',
    color: '#38bdf8'
  }
}

const FOLLOWUP_GUIDES = {
  '심폐소생술': [
    '즉시 원격 의료진에 연락하여 추가 지침을 받으십시오.',
    '환자 의식 회복 여부를 2분마다 확인하십시오.',
    'AED 패드를 부착한 채 유지하고 재충격에 대비하십시오.',
  ],
  '하임리히법': [
    '이물질 제거 후에도 호흡 상태를 지속 모니터링하십시오.',
    '목 통증 또는 삼킴 곤란이 지속되면 원격 의료팀에 보고하십시오.',
    '의식 상태 및 산소포화도를 30분간 집중 관찰하십시오.',
  ],
  '찰과상': [
    '24시간마다 드레싱을 교체하고 감염 징후를 확인하십시오.',
    '발적·고름·열감·악취 등 감염 징후 발생 시 즉시 의료진에게 보고하십시오.',
    '상처 회복 경과를 매일 사진으로 기록하십시오.',
  ],
  '타박상': [
    '초기 48시간 이후에는 온찜질로 전환하여 혈액 순환을 촉진하십시오.',
    '부종·변형·통증 악화 시 골절 가능성을 재평가하십시오.',
    '바이탈을 모니터링하며 내부 출혈 징후를 관찰하십시오.',
  ],
  '화상': [
    '냉각 완료 후 멸균 드레싱 상태를 유지하십시오.',
    '환부를 심장보다 높게 유지하고 수분을 보충하십시오.',
    '수포 파열 방지 및 2차 감염 여부를 지속 관찰하십시오.',
  ],
  '절상': [
    '스테리스트립 또는 드레싱 상태를 매일 확인하십시오.',
    '24~48시간 내 감염 징후(붉어짐, 고름, 열감)를 집중 관찰하십시오.',
    '봉합이 필요한 경우 원격 의료진 지시를 받을 때까지 임시 접합 상태를 유지하십시오.',
  ],
  '열상': [
    '봉합 부위 감염 징후를 24~48시간 집중 관찰하십시오.',
    '항생제 투여 일정을 준수하십시오.',
    '파상풍 예방 접종 여부를 확인하고 필요 시 처치하십시오.',
  ],
  '자창': [
    '이송 전까지 활력징후를 5분마다 측정·기록하십시오.',
    '쇼크 징후(창백, 냉습, 의식 저하) 발생 시 즉시 CPR을 준비하십시오.',
    '박힌 물체는 의료진 도착 전까지 절대 제거하지 마십시오.',
  ],
  '기도 확보': [
    '회복 자세를 유지하며 호흡음을 30초마다 확인하십시오.',
    '구토 발생 즉시 기도를 다시 확보하십시오.',
    '의식 수준 변화를 기록하여 의료진에게 전달하십시오.',
  ],
  '익수/저체온': [
    '체온을 30분마다 측정하고 기록하십시오.',
    '담요 보온을 유지하고 따뜻한 수분을 지속 공급하십시오.',
    '의식 변화 또는 심부정맥 징후 발생 시 즉시 CPR을 준비하십시오.',
  ],
}

function resolveEmergencyAction(input, traumaResult = null) {
  const source = traumaResult?.label || traumaResult?.labelEn || traumaResult?.key || input
  const mapping = {
    CARDIAC: '심폐소생술',
    CPR: '심폐소생술',
    Heimlich: '하임리히법',
    HEIMLICH: '하임리히법',
    TRAUMA: '열상',
    UNCONSCIOUS: '기도 확보',
    RESPIRATORY: '기도 확보',
    abrasion: '찰과상',
    Abrasion: '찰과상',
    ABRASION: '찰과상',
    '찰과상': '찰과상',
    contusion: '타박상',
    Contusion: '타박상',
    CONTUSION: '타박상',
    Bruise: '타박상',
    Bruises: '타박상',
    '타박상': '타박상',
    burn: '화상',
    Burn: '화상',
    BURN: '화상',
    Burns: '화상',
    '화상': '화상',
    incision: '절상',
    Incision: '절상',
    INCISION: '절상',
    Cut: '절상',
    '절상': '절상',
    laceration: '열상',
    Laceration: '열상',
    LACERATION: '열상',
    '열상': '열상',
    puncture: '자창',
    Puncture: '자창',
    PUNCTURE: '자창',
    Stab_wound: '자창',
    'Stab Wound': '자창',
    '자창': '자창'
  }
  const targetAction = mapping[source] || source
  return ACTION_GUIDES[targetAction] ? targetAction : null
}

export default function Emergency({ patient, initialAction, initialTraumaResult, initialContext, onNavigate }) {
  const { showAlert } = useAlert()

  const [triageStep, setTriageStep] = useState('GUIDE')

  const [activeAction, setActiveAction] = useState(() => resolveEmergencyAction(initialAction, initialTraumaResult))


  const [completedSteps, setCompletedSteps] = useState([])
  const [selectedStepIndex, setSelectedStepIndex] = useState(null)
  const SESSION_KEY = `emergency_logs_${patient?.id || 'unknown'}`
  const [sessionLogs, setSessionLogs] = useState(() => {
    try {
      const saved = localStorage.getItem(SESSION_KEY)
      return saved ? JSON.parse(saved) : []
    } catch { return [] }
  })
  const [showCompletionPanel, setShowCompletionPanel] = useState(false)
  const [startTime] = useState(new Date())
  const [endTime, setEndTime] = useState(null)
  
  const [bpm] = useState(120)
  const [beat, setBeat] = useState(false)
  
  const [vitals, setVitals] = useState(() => (
    initialContext?.latestVital
      ? mapVitalToFrontend(initialContext.latestVital)
      : { hr: '-', spo2: '-', bp: '-', temp: '-', rr: '-' }
  ))

  // PyQt5 센서 서버 실시간 바이탈 우선 로드 + DB 최신값 fallback
  useEffect(() => {
    if (!patient) return;
    const crewDbId = patient.crewDbId || initialContext?.crewId || parseInt(patient.id?.split('-')[1]);
    const poll = async () => {
      try {
        let data = await fetchPyqtSensorVital(crewDbId);
        if (!data) {
          data = await fetchLatestVital(crewDbId);
        }
        if (data) {
          const v = mapVitalToFrontend(data);
          setVitals({
            hr: v.hr,
            spo2: v.spo2,
            bp: v.bp,
            temp: v.temp,
            rr: v.rr,
          });
        }
      } catch {}
    };
    poll();
    const interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  }, [patient?.id, patient?.crewDbId, initialContext?.crewId])

  const [editTarget, setEditTarget] = useState(null)
  const [inputValue, setInputValue] = useState('')

  const handleOpenEdit = (key, label, currentVal, unit) => {
    setEditTarget({ key, label, unit })
    setInputValue(currentVal)
  }

  const handleSaveVital = () => {
    if (!editTarget) return
    const val = inputValue.trim()
    if (!val) return
    if (editTarget.key === 'bp') {
      const parts = val.split('/')
      if (parts.length !== 2 || isNaN(parseInt(parts[0])) || isNaN(parseInt(parts[1]))) {
        showAlert('혈압 형식이 올바르지 않습니다. 예: 120/80', '입력 오류', 'warning')
        return
      }
    } else if (isNaN(parseFloat(val))) {
      showAlert('숫자를 입력하세요.', '입력 오류', 'warning')
      return
    }
    const now = new Date().toLocaleTimeString('ko-KR', { hour12: false })
    setVitals(prev => ({ ...prev, [editTarget.key]: val }))
    // 박기관 제외: 서버 DB에도 저장
    if (patient && patient.id !== 'S26-003') {
      const crewDbId = patient.crewDbId || parseInt(patient.id?.split('-')[1]);
      if (editTarget.key === 'bp') {
        updateVital(crewDbId, { blood_pressure: val }).catch(() => {});
      } else if (editTarget.key === 'temp') {
        updateVital(crewDbId, { temperature: parseFloat(val) }).catch(() => {});
      }
    }
    setSessionLogs([{
      time: now,
      text: `${editTarget.label} 수동 업데이트 : ${val}${editTarget.unit}`,
      type: 'INFO'
    }, ...sessionLogs])
    setEditTarget(null)
  }

  const stopPyqtTraumaSafely = async () => {
    try {
      await stopPyqtTraumaStream()
    } catch (error) {
      console.warn('[trauma] PyQt5 stop request failed:', error.message)
    }
  }

  const handleTreatmentEnd = async () => {
    setEndTime(new Date())
    await stopPyqtTraumaSafely()
    onNavigate?.('main')
  }

  const handleSyncData = async () => {
    const now = new Date()
    setEndTime(now)
    await stopPyqtTraumaSafely()
    const logTime = now.toLocaleTimeString('ko-KR', { hour12: false })

    // 박기관 외: 현재 바이탈을 서버 DB에 저장
    if (patient && patient.id !== 'S26-003') {
      const crewDbId = patient.crewDbId || parseInt(patient.id?.split('-')[1]);
      try {
        await updateVital(crewDbId, {
          heart_rate: parseInt(vitals.hr) || 0,
          spo2: parseInt(vitals.spo2) || 0,
          respiration_rate: parseInt(vitals.rr) || 0,
          blood_pressure: vitals.bp || '0',
          temperature: parseFloat(vitals.temp) || 0,
        });
      } catch {}
    }

    const completedStepTitles = activeAction && ACTION_GUIDES[activeAction]
      ? completedSteps.map(index => ACTION_GUIDES[activeAction].steps[index]?.title).filter(Boolean)
      : []
    const sessionSummary = [
      `응급처치 세션 종료 보고`,
      `처치 항목: ${activeAction || '상태 판별'}`,
      `진단 기준: ${currentActionData?.diagnosis || initialTraumaResult?.label || activeAction || '기록 없음'}`,
      `완료 단계: ${completedStepTitles.length > 0 ? completedStepTitles.join(', ') : '완료 단계 없음'}`,
      `세션 로그: ${sessionLogs.map(log => `[${log.time}] ${log.text}`).join(' / ') || '기록 없음'}`
    ].join('\n')
    const crewId = patient?.crewDbId || initialContext?.crewId || parseInt(String(patient?.id || '').split('-')[1])
    const reportRecord = {
      crewId,
      crew_id: crewId,
      patientId: patient?.id || null,
      patientName: patient?.name || '환자',
      name: patient?.name || '환자',
      doctorId: 'MDTS-EMERGENCY',
      doctorName: '응급처치 세션',
      occurrenceTime: startTime.toLocaleString('ko-KR', { hour12: false }),
      mainComplaint: `${activeAction || '응급처치'} 세션 종료 보고`,
      location: '웹 대시보드 응급처치 페이지',
      selectedSymptoms: [activeAction, currentActionData?.diagnosis, initialTraumaResult?.label].filter(Boolean),
      painAreas: initialTraumaResult?.label ? [initialTraumaResult.label] : [],
      prescribedMeds: completedStepTitles,
      otherActions: sessionSummary,
      detailedNote: sessionSummary,
      diagnosis: currentActionData?.diagnosis || initialTraumaResult?.label || activeAction || '응급처치 세션 종료',
      treatmentGuide: currentActionData?.steps?.map(step => step.title) || completedStepTitles,
      recommendedMeds: currentActionData?.dos || [],
      vitals,
      isEmergency: true,
      timestamp: new Date().toISOString()
    }

    let historySaveStatus = '환자 차트 기록 저장 완료'
    try {
      await savePatientHistory(reportRecord)
      setSessionLogs([{ time: logTime, text: "응급처치 세션 종료 보고 DB 저장 완료 (환자 차트 지난 기록)", type: 'SUCCESS' }, ...sessionLogs])
    } catch (error) {
      historySaveStatus = `환자 차트 기록 저장 실패: ${error.message}`
      setSessionLogs([{ time: logTime, text: `응급처치 세션 종료 보고 DB 저장 실패: ${error.message}`, type: 'ERROR' }, ...sessionLogs])
    }

    const durationMs = Math.max(0, now.getTime() - startTime.getTime())
    const durationText = `${Math.floor(durationMs / 60000)}분 ${Math.floor((durationMs % 60000) / 1000)}초`
    const timelineDetail = [
      `• 대상자: ${patient?.name || '환자'} (${patient?.role || '-'})`,
      `• 처치 항목: ${activeAction || '상태 판별'}`,
      `• 진단 기준: ${currentActionData?.diagnosis || initialTraumaResult?.label || activeAction || '기록 없음'}`,
      `• 완료 단계: ${completedStepTitles.length}건${completedStepTitles.length > 0 ? ` (${completedStepTitles.join(', ')})` : ''}`,
      `• 세션 시간: ${durationText}`,
      `• 저장 결과: ${historySaveStatus}`,
      `• 마지막 바이탈: HR ${vitals.hr || '-'} bpm · SpO2 ${vitals.spo2 || '-'}% · RR ${vitals.rr || '-'} · BP ${vitals.bp || '-'} · BT ${vitals.temp || '-'}°C`
    ].join('\n')

    try {
      window.sessionStorage.setItem('mdts_pending_main_timeline_event', JSON.stringify({
        id: `emergency-sync-${Date.now()}`,
        time: logTime.slice(0, 5),
        title: '응급처치 데이터 전송 완료',
        detail: timelineDetail,
        color: historySaveStatus.includes('실패') ? '#f43f5e' : '#22c55e',
        crewId,
        patientId: patient?.id || null,
        timestamp: now.toISOString()
      }))
    } catch {}

    setTriageStep('SUMMARY')
  }

  const getDuration = () => {
    if (!startTime || !endTime) return '0분 0초'
    const diff = Math.floor((endTime - startTime) / 1000)
    const m = Math.floor(diff / 60)
    const s = diff % 60
    return `${m}분 ${s}초`
  }

  const checkAlert = (key, value) => {
    if (!value) return false;
    const numVal = parseFloat(value);
    if (!Number.isFinite(numVal) || numVal <= 0) return false;
    if (key === 'hr') return numVal < 60 || numVal > 100;
    if (key === 'spo2') return numVal < 95;
    if (key === 'rr') return numVal < 12 || numVal > 20;
    if (key === 'temp') return numVal < 36.0 || numVal > 37.8;
    if (key === 'bp') {
      const parts = String(value).split('/');
      if (parts.length !== 2) return false;
      const sys = parseInt(parts[0]);
      const dia = parseInt(parts[1]);
      if (!Number.isFinite(sys) || !Number.isFinite(dia) || sys <= 0 || dia <= 0) return false;
      return sys > 140 || sys < 90 || dia > 90 || dia < 60;
    }
    return false;
  }

  useEffect(() => {
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(sessionLogs))
    } catch {
      // Ignore storage errors
    }
  }, [sessionLogs, SESSION_KEY])

  // 모든 스텝 이미지 사전 로드 (첫 클릭 시 지연 방지)
  useEffect(() => {
    Object.values(ACTION_GUIDES).forEach(guide => {
      guide.steps.forEach(step => {
        if (step.stepImage) {
          const img = new window.Image()
          img.src = step.stepImage
        }
      })
    })
  }, [])

  useEffect(() => {
    if (activeAction === '심폐소생술') {
      const interval = setInterval(() => setBeat(b => !b), 60000 / bpm / 2)
      return () => clearInterval(interval)
    }
  }, [activeAction, bpm])

  const handleStepToggle = (index) => {
    const isDone = completedSteps.includes(index)
    const now = new Date().toLocaleTimeString('ko-KR', { hour12: false })
    
    // 마지막 클릭한 번호 고정
    setSelectedStepIndex(index)

    if (!isDone) {
      if (activeAction === '화상' && index === 0) {
        setIsBurnTimerActive(true)
      }
      if ((activeAction === '골절 / 탈구' || activeAction === '타박상') && index === 2) {
        setColdTimer(1200) // 15분(900)에서 20분(1200)으로 변경
        setIsColdTimerActive(true)
      }
      if (activeAction === '찰과상' && index === 0) {
        setWashTimer(300)
        setIsWashTimerActive(true)
      }
      if (activeAction === '심폐소생술' && index === 0) {
        setGoldenTimer(240)
        setIsGoldenTimerActive(true)
      }

      if (activeAction && ACTION_GUIDES[activeAction]) {
        const stepTitle = ACTION_GUIDES[activeAction].steps[index].title
        setSessionLogs([{ time: now, text: `${stepTitle} 완료`, type: 'SUCCESS' }, ...sessionLogs])
        setCompletedSteps([...completedSteps, index])
        setShowCompletionPanel(true)
      }
    } else {
      // 이미 완료된 단계인 경우 취소 처리 (Task 3-4)
      if (activeAction && ACTION_GUIDES[activeAction]) {
        const stepTitle = ACTION_GUIDES[activeAction].steps[index].title
        setSessionLogs([{ time: now, text: `${stepTitle} 완료 취소`, type: 'INFO' }, ...sessionLogs])
        setCompletedSteps(completedSteps.filter(i => i !== index))
        
        // 타이머 중지 로직 (선택 사항)
        if (activeAction === '화상' && index === 0) setIsBurnTimerActive(false)
        if ((activeAction === '골절 / 탈구' || activeAction === '타박상') && index === 2) setIsColdTimerActive(false)
        if (activeAction === '찰과상' && index === 0) setIsWashTimerActive(false)
      }
    }
  }

  const handleResetSession = () => {
    setActiveAction(null)
    setCompletedSteps([])
    setShowCompletionPanel(false)
    setSelectedStepIndex(null)
    setTriageStep('GUIDE')
  }

  const [burnTimer, setBurnTimer] = useState(1200)
  const [isBurnTimerActive, setIsBurnTimerActive] = useState(false)
  const [coldTimer, setColdTimer] = useState(1200)
  const [isColdTimerActive, setIsColdTimerActive] = useState(false)
  const [washTimer, setWashTimer] = useState(300)
  const [isWashTimerActive, setIsWashTimerActive] = useState(false)
  const [goldenTimer, setGoldenTimer] = useState(240) // 4분 (240초)
  const [isGoldenTimerActive, setIsGoldenTimerActive] = useState(false)

  useEffect(() => {
    let interval;
    if (activeAction === '화상' && isBurnTimerActive && burnTimer > 0) {
      interval = setInterval(() => {
        setBurnTimer(prev => prev - 1)
      }, 1000)
    }
    if ((activeAction === '골절 / 탈구' || activeAction === '타박상') && isColdTimerActive && coldTimer > 0) {
      interval = setInterval(() => {
        setColdTimer(prev => prev - 1)
      }, 1000)
    }
    if (activeAction === '찰과상' && isWashTimerActive && washTimer > 0) {
      interval = setInterval(() => {
        setWashTimer(prev => prev - 1)
      }, 1000)
    }
    if (activeAction === '심폐소생술' && isGoldenTimerActive && goldenTimer > 0) {
      interval = setInterval(() => {
        setGoldenTimer(prev => prev - 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [activeAction, isBurnTimerActive, burnTimer, isColdTimerActive, coldTimer, isWashTimerActive, washTimer, isGoldenTimerActive, goldenTimer])

  const formatBurnTime = (seconds) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  const [hoveredAction, setHoveredAction] = useState(null)

  useEffect(() => {
    const nextAction = resolveEmergencyAction(initialAction, initialTraumaResult)
    if (!nextAction) return

    setActiveAction(nextAction)
    setHoveredAction(null)
    setCompletedSteps([])
    setShowCompletionPanel(false)
    setSelectedStepIndex(null)
    setIsBurnTimerActive(false)
    setBurnTimer(1200)
    setIsColdTimerActive(false)
    setColdTimer(1200)
    setIsWashTimerActive(false)
    setWashTimer(300)
    setSessionLogs(prev => {
      const resultKey = `${initialContext?.crewId || 'unknown'}:${initialTraumaResult?.key || initialTraumaResult?.label || nextAction}`
      if (prev.some(log => log.key === resultKey)) return prev

      const vitalText = initialContext?.latestVital ? '최근 바이탈 연동' : '최근 바이탈 없음'
      const historyText = Array.isArray(initialContext?.patientHistory) && initialContext.patientHistory.length > 0
        ? `과거 기록 ${initialContext.patientHistory.length}건 연동`
        : '과거 기록 없음'

      return [{
        key: resultKey,
        time: new Date().toLocaleTimeString('ko-KR', { hour12: false }),
        text: `외상 촬영 분석 결과 기준 ${nextAction} 처치 시작 (${vitalText}, ${historyText})`,
        type: 'INFO'
      }, ...prev]
    })
  }, [
    initialAction,
    initialTraumaResult?.label,
    initialTraumaResult?.labelEn,
    initialTraumaResult?.key,
    initialContext?.crewId
  ])

  const currentActionData = activeAction ? ACTION_GUIDES[activeAction] : null

  // 이미지 표시 우선순위 : 마지막으로 클릭한 인덱스 > 첫 번째 미완료 단계
  const activeDisplayIndex = selectedStepIndex !== null
    ? selectedStepIndex
    : (currentActionData?.steps.findIndex((_, i) => !completedSteps.includes(i)) ?? 0)

  const stepNum = activeDisplayIndex + 1

  // 호버 중인 액션의 이미지 표시 (없으면 현재 액션 기준)
  const displayAction = hoveredAction || activeAction
  const displayActionData = displayAction ? ACTION_GUIDES[displayAction] : null
  const displayImageIndex = hoveredAction && hoveredAction !== activeAction ? 0 : activeDisplayIndex
  const displayStepImage = displayActionData?.steps[displayImageIndex]?.stepImage


  if (triageStep === 'SUMMARY') {
    return (
      <div style={{ height: 'calc(100vh - 72px)', background: '#020617', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ maxWidth: 850, width: '100%', background: 'rgba(2, 12, 27, 0.9)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 32, padding: 48, position: 'relative', overflow: 'hidden', boxShadow: '0 30px 60px -12px rgba(0,0,0,0.6)' }}>
          <div style={{ position: 'absolute', top: 0, left: '-150%', width: '60%', height: '100%', background: 'linear-gradient(90deg, transparent, rgba(56,189,248,0.1), rgba(255,255,255,0.2), rgba(56,189,248,0.1), transparent)', transform: 'skewX(-30deg)', animation: 'shimmerFlow 3.5s infinite linear', pointerEvents: 'none', zIndex: 1 }} />
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 6, background: 'linear-gradient(90deg, #38bdf8, #22c55e)', zIndex: 2 }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 40, position: 'relative', zIndex: 2 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{ padding: '6px 12px', background: 'rgba(34,197,94,0.15)', color: '#22c55e', borderRadius: 8, fontSize: 13, fontWeight: 900, border: '1px solid rgba(34,197,94,0.3)' }}>SESSION COMPLETED</div>
                <div style={{ fontSize: 14, color: '#94a3b8', fontWeight: 700 }}>종료 시각 : {new Date().toLocaleTimeString()}</div>
              </div>
              <h2 style={{ fontSize: 42, fontWeight: 950, color: '#fff', letterSpacing: '-1px' }}>응급 처치 세션 종료 보고</h2>
            </div>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #22c55e', boxShadow: '0 0 20px rgba(34,197,94,0.2)' }}><Check size={44} color="#22c55e" strokeWidth={3}/></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 40, position: 'relative', zIndex: 2 }}>
            <div style={{ background: 'rgba(255,255,255,0.04)', padding: 32, borderRadius: 24, border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: 16, color: '#94a3b8', fontWeight: 800, marginBottom: 20 }}>처치 결과 요약</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ color: '#64748b', fontSize: 22, fontWeight: 700 }}>대상 선원</span><span style={{ fontWeight: 800, color: '#fff', fontSize: 22 }}>{patient?.name} ({patient?.role})</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 16 }}><span style={{ color: '#64748b', fontSize: 22, fontWeight: 700 }}>처치 내용</span><span style={{ fontWeight: 800, color: '#38bdf8', fontSize: 22 }}>{activeAction || '상태 판별'}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 16 }}><span style={{ color: '#64748b', fontSize: 22, fontWeight: 700 }}>시작 시각</span><span style={{ fontWeight: 800, color: '#fff', fontSize: 22 }}>{startTime.toLocaleTimeString('ko-KR', {hour12:false})}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 16 }}><span style={{ color: '#64748b', fontSize: 22, fontWeight: 700 }}>종료 시각</span><span style={{ fontWeight: 800, color: '#fff', fontSize: 22 }}>{endTime?.toLocaleTimeString('ko-KR', {hour12:false})}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 16 }}><span style={{ color: '#64748b', fontSize: 22, fontWeight: 700 }}>소요 시간</span><span style={{ fontWeight: 900, color: '#38bdf8', fontSize: 26 }}>{getDuration()}</span></div>
              </div>
            </div>
            <div style={{ background: 'rgba(56,189,248,0.06)', padding: 24, borderRadius: 24, border: '1px solid rgba(56,189,248,0.2)' }}>
              <div style={{ fontSize: 15, color: '#38bdf8', fontWeight: 800, marginBottom: 16 }}>AI 후속 지침 — {activeAction || '처치'} 완료 후</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {(FOLLOWUP_GUIDES[activeAction] || [
                  '환자 상태 안정 시까지 바이탈을 지속적으로 모니터링하십시오.',
                  '2차 감염 방지를 위해 외상 부위를 보호하고 체온을 유지하십시오.',
                  '환자의 의식 변화와 추가 증상을 상세히 기록하여 보존하십시오.',
                ]).map((text, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, fontSize: 16, fontWeight: 700, color: '#e2e8f0' }}>
                    <AlertCircle size={18} color="#38bdf8" style={{flexShrink:0}}/>
                    <span>{text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 16, position: 'relative', zIndex: 2 }}>
            <button onClick={handleResetSession} style={{ flex: 1, padding: '20px', borderRadius: 16, background: '#fff', color: '#000', border: 'none', fontWeight: 950, fontSize: 19, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, boxShadow: '0 10px 20px rgba(255,255,255,0.1)' }}><RefreshCw size={20}/> 새로운 처치 시작</button>
            <button onClick={() => onNavigate('main')} style={{ flex: 1, padding: '20px', borderRadius: 16, background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', fontWeight: 950, fontSize: 19, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}><LayoutDashboard size={20}/> 메인 대시보드로 복귀</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ height: 'calc(100vh - 72px)', width: '100%', background: '#020617', color: '#fff', position: 'relative', overflow: 'hidden', fontFamily: '"Pretendard", sans-serif', display: 'flex', flexDirection: 'column' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at center, transparent 0%, #020617 98%)' }} />
      
      <div style={{ position: 'relative', zIndex: 1, flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '480px 1fr 440px', gridTemplateRows: '1fr 110px', gap: '10px', padding: '10px', boxSizing: 'border-box' }}>
        <section style={{ gridRow: '1', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, background: 'rgba(255,255,255,0.02)', borderRadius: 24, border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}><div style={{ fontSize: 18, fontWeight: 950 }}>처치 동작 시각 가이드</div></div>
            <div style={{ flex: 1, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
              {displayStepImage && (
                <img
                  key={`${displayAction}-${displayImageIndex}`}
                  src={displayStepImage}
                  style={{
                    position: 'absolute', inset: 0,
                    width: '100%', height: '100%',
                    objectFit: 'cover',
                    objectPosition:
                      (displayAction === '심폐소생술' && displayImageIndex === 0) ? '20% 20%' :
                      (displayAction === '심폐소생술' && displayImageIndex === 2) ? '50% 0%' :
                      (displayAction === '심폐소생술' && displayImageIndex === 3) ? 'center 60%' :
                      (displayAction === '기도 확보' && displayImageIndex === 1) ? '20% center' :
                      (displayAction === '기도 확보' && displayImageIndex === 3) ? '0% 60%' :
                      'center center',
                    transform:
                      (displayAction === '심폐소생술' && displayImageIndex === 2) ? 'scale(1.2) translateY(-10%)' :
                      (displayAction === '기도 확보' && displayImageIndex === 1) ? 'scale(1.3)' :
                      (displayAction === '기도 확보' && displayImageIndex === 3) ? 'scale(1.25)' :
                      'none',
                    animation: 'imgFadeIn 0.18s ease-out forwards',
                    transition: 'transform 0.3s ease-out'
                  }}
                  alt={displayActionData.steps[displayImageIndex].title}
                />
              )}
              
              {activeAction === '심폐소생술' && stepNum === 3 && (
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', background: beat ? '#ef4444' : '#b91c1c', borderRadius: '0 0 32px 32px', padding: '20px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: '0.1s', zIndex: 50, boxShadow: '0 10px 30px rgba(0,0,0,0.5)', border: '2px solid rgba(255,255,255,0.2)', borderTop: 'none' }}>
                  <Zap size={36} fill="#fff" color="#fff" /><div style={{ fontSize: 32, fontWeight: 950, color: '#fff', whiteSpace: 'nowrap', textShadow: '0 2px 10px rgba(0,0,0,0.3)', letterSpacing: '-1px' }}>깜빡임 속도에 맞춰 압박하세요</div>
                </div>
              )}

              {activeAction === '심폐소생술' && goldenTimer >= 0 && (
                <div style={{ 
                  position: 'absolute', 
                  bottom: '8%', 
                  right: '3%', 
                  width: '180px', 
                  height: '180px', 
                  borderRadius: '50%', 
                  background: 'rgba(2, 6, 23, 0.9)', 
                  display: 'flex', 
                  flexDirection: 'column',
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  zIndex: 60,
                  border: `8px solid ${goldenTimer === 0 ? '#ef4444' : '#facc15'}`,
                  boxShadow: `0 15px 40px ${goldenTimer === 0 ? 'rgba(239,68,68,0.4)' : 'rgba(0,0,0,0.6)'}`,
                  animation: (isGoldenTimerActive && goldenTimer > 0) ? 'pulse 1.5s infinite' : 'none',
                  transition: 'all 0.5s ease'
                }}>
                  <div style={{ position: 'absolute', top: '30px', fontSize: 22, fontWeight: 900, color: goldenTimer === 0 ? '#ef4444' : '#facc15', letterSpacing: '-0.5px', transition: 'all 0.5s ease' }}>{goldenTimer === 0 ? '시간 초과' : '골든 타임'}</div>
                  <div style={{ fontSize: 48, fontWeight: 950, color: '#fff', lineHeight: 1, fontFamily: '"Pretendard", sans-serif', marginTop: '10px' }}>{formatBurnTime(goldenTimer)}</div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setGoldenTimer(240); setIsGoldenTimerActive(false); }}
                    style={{ 
                      position: 'absolute',
                      bottom: '15px',
                      background: 'rgba(255,255,255,0.1)', 
                      border: 'none', 
                      borderRadius: '50%', 
                      width: 32, 
                      height: 32, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      cursor: 'pointer',
                      color: '#fff',
                      transition: '0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                    title="타이머 리셋"
                  >
                    <RefreshCw size={16} />
                  </button>
                </div>
              )}

              {activeAction === '화상' && burnTimer >= 0 && (
                <div style={{ 
                  position: 'absolute', 
                  bottom: '8%', 
                  right: '3%', 
                  width: '180px', 
                  height: '180px', 
                  borderRadius: '50%', 
                  background: 'rgba(2, 6, 23, 0.9)', 
                  display: 'flex', 
                  flexDirection: 'column',
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  zIndex: 60,
                  border: `8px solid ${burnTimer === 0 ? '#22c55e' : '#ef4444'}`,
                  boxShadow: `0 15px 40px ${burnTimer === 0 ? 'rgba(34,197,94,0.4)' : 'rgba(0,0,0,0.6)'}`,
                  animation: (isBurnTimerActive && burnTimer > 0) ? 'pulse 1.5s infinite' : 'none',
                  transition: 'all 0.5s ease'
                }}>
                  <div style={{ position: 'absolute', top: '30px', fontSize: 22, fontWeight: 900, color: burnTimer === 0 ? '#22c55e' : '#ef4444', letterSpacing: '-0.5px', transition: 'all 0.5s ease' }}>{burnTimer === 0 ? '냉각 완료' : '냉각 시간'}</div>
                  <div style={{ fontSize: 48, fontWeight: 950, color: '#fff', lineHeight: 1, fontFamily: '"Pretendard", sans-serif', marginTop: '10px' }}>{formatBurnTime(burnTimer)}</div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setBurnTimer(1200); setIsBurnTimerActive(false); }}
                    style={{ 
                      position: 'absolute',
                      bottom: '15px',
                      background: 'rgba(255,255,255,0.1)', 
                      border: 'none', 
                      borderRadius: '50%', 
                      width: 32, 
                      height: 32, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      cursor: 'pointer',
                      color: '#fff',
                      transition: '0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                    title="타이머 리셋"
                  >
                    <RefreshCw size={16} />
                  </button>
                </div>
              )}

              {activeAction === '타박상' && activeDisplayIndex === 0 && coldTimer >= 0 && (
                <div style={{ 
                  position: 'absolute', 
                  bottom: '8%', 
                  right: '3%', 
                  width: '180px', 
                  height: '180px', 
                  borderRadius: '50%', 
                  background: 'rgba(2, 6, 23, 0.9)', 
                  display: 'flex', 
                  flexDirection: 'column',
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  zIndex: 60,
                  border: `8px solid ${coldTimer === 0 ? '#22c55e' : '#38bdf8'}`,
                  boxShadow: `0 15px 40px ${coldTimer === 0 ? 'rgba(34,197,94,0.4)' : 'rgba(0,0,0,0.6)'}`,
                  animation: (isColdTimerActive && coldTimer > 0) ? 'pulse 1.5s infinite' : 'none',
                  transition: 'all 0.5s ease'
                }}>
                  <div style={{ position: 'absolute', top: '30px', fontSize: 22, fontWeight: 900, color: coldTimer === 0 ? '#22c55e' : '#38bdf8', letterSpacing: '-0.5px', transition: 'all 0.5s ease' }}>{coldTimer === 0 ? '찜질 완료' : '냉찜질 시간'}</div>
                  <div style={{ fontSize: 48, fontWeight: 950, color: '#fff', lineHeight: 1, fontFamily: '"Pretendard", sans-serif', marginTop: '10px' }}>{formatBurnTime(coldTimer)}</div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setColdTimer(1200); setIsColdTimerActive(false); }}
                    style={{ 
                      position: 'absolute',
                      bottom: '15px',
                      background: 'rgba(255,255,255,0.1)', 
                      border: 'none', 
                      borderRadius: '50%', 
                      width: 32, 
                      height: 32, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      cursor: 'pointer',
                      color: '#fff',
                      transition: '0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                    title="타이머 리셋"
                  >
                    <RefreshCw size={16} />
                  </button>
                </div>
              )}

              {activeAction === '찰과상' && activeDisplayIndex === 0 && washTimer >= 0 && (
                <div style={{ 
                  position: 'absolute', 
                  bottom: '8%', 
                  right: '3%', 
                  width: '180px', 
                  height: '180px', 
                  borderRadius: '50%', 
                  background: 'rgba(2, 6, 23, 0.9)', 
                  display: 'flex', 
                  flexDirection: 'column',
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  zIndex: 60,
                  border: `8px solid ${washTimer === 0 ? '#22c55e' : '#10b981'}`,
                  boxShadow: `0 15px 40px ${washTimer === 0 ? 'rgba(34,197,94,0.4)' : 'rgba(0,0,0,0.6)'}`,
                  animation: (isWashTimerActive && washTimer > 0) ? 'pulse 1.5s infinite' : 'none',
                  transition: 'all 0.5s ease'
                }}>
                  <div style={{ position: 'absolute', top: '30px', fontSize: 22, fontWeight: 900, color: washTimer === 0 ? '#22c55e' : '#10b981', letterSpacing: '-0.5px', transition: 'all 0.5s ease' }}>{washTimer === 0 ? '세척 완료' : '세척 시간'}</div>
                  <div style={{ fontSize: 48, fontWeight: 950, color: '#fff', lineHeight: 1, fontFamily: '"Pretendard", sans-serif', marginTop: '10px' }}>{formatBurnTime(washTimer)}</div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setWashTimer(300); setIsWashTimerActive(false); }}
                    style={{ 
                      position: 'absolute',
                      bottom: '15px',
                      background: 'rgba(255,255,255,0.1)', 
                      border: 'none', 
                      borderRadius: '50%', 
                      width: 32, 
                      height: 32, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      cursor: 'pointer',
                      color: '#fff',
                      transition: '0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                    title="타이머 리셋"
                  >
                    <RefreshCw size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>
        <section style={{ gridRow: '1', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          {activeAction ? (
            <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 24, border: '1px solid rgba(255,255,255,0.05)', padding: '24px', position: 'relative' }}>
              
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
                  {currentActionData.severity && (
                    <div style={{ background: SEVERITY_COLORS[currentActionData.severity], color: '#000', padding: '4px 12px', borderRadius: 8, fontSize: 13, fontWeight: 950 }}>{currentActionData.severity}</div>
                  )}
                  <div style={{ background: currentActionData.color, color: '#000', padding: '4px 12px', borderRadius: 8, fontSize: 13, fontWeight: 950 }}>RISK {currentActionData.riskLevel}</div>
                  <div style={{ color: currentActionData.color, fontSize: 17, fontWeight: 800 }}>AI 분석 : {currentActionData.diagnosis}</div>
                </div>
                <h2 style={{ fontSize: 46, fontWeight: 950, letterSpacing: '-2px', margin: '0 0 6px 0' }}>{currentActionData.title}</h2>
                {currentActionData.description && (
                  <p style={{ fontSize: 24, color: '#94a3b8', fontWeight: 600, margin: '0 0 4px 0', lineHeight: 1.6 }}>{currentActionData.description}</p>
                )}
                {currentActionData.legalBasis && (
                  <div style={{ fontSize: 13, color: '#475569', fontWeight: 700 }}>📋 법적 근거 : {currentActionData.legalBasis}</div>
                )}
              </div>

              {/* 알레르기 경고 배너 (Task 3-1) */}
              {patient?.allergies && patient.allergies !== '없음' && (activeAction === '심폐소생술' || activeAction === '심근경색') && (
                <div style={{ 
                  background: 'rgba(239,68,68,0.15)', 
                  border: '2px solid #ef4444', 
                  borderRadius: 20, 
                  padding: '16px 20px', 
                  marginBottom: 20,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  animation: 'pulse-alert-border 1.5s infinite'
                }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <ShieldAlert size={28} color="#fff" />
                  </div>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 950, color: '#ef4444', marginBottom: 2 }}>투약 알레르기 경고</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>환자에게 <span style={{ color: '#ef4444', textDecoration: 'underline' }}>{patient.allergies}</span> 알레르기가 있습니다. 관련 약물(아스피린 등) 투여 시 각별히 주의하십시오.</div>
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 24 }}>
                <div style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 20, padding: 18 }}><div style={{ color: '#22c55e', fontSize: 20, fontWeight: 900, marginBottom: 10 }}>권고 사항</div>{currentActionData.dos.map((d, i) => <div key={i} style={{ fontSize: 20, fontWeight: 700, marginBottom: 6, color: '#e2e8f0', display: 'flex', gap: '8px' }}><span style={{ flexShrink: 0 }}>•</span><span>{d}</span></div>)}</div>
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', borderRadius: 20, padding: 18 }}><div style={{ color: '#ef4444', fontSize: 20, fontWeight: 900, marginBottom: 10 }}>절대 금기</div>{currentActionData.donts.map((d, i) => <div key={i} style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 6, display: 'flex', gap: '8px' }}><span style={{ flexShrink: 0 }}>•</span><span>{d}</span></div>)}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{currentActionData.steps.map((step, i) => (
                <div key={i} onClick={() => handleStepToggle(i)} style={{ display: 'flex', gap: 20, padding: '20px 24px', borderRadius: 24, cursor: 'pointer', background: selectedStepIndex === i ? 'rgba(56,189,248,0.15)' : completedSteps.includes(i) ? 'rgba(56,189,248,0.05)' : 'rgba(255,255,255,0.03)', border: `2px solid ${selectedStepIndex === i ? '#38bdf8' : completedSteps.includes(i) ? 'rgba(56,189,248,0.3)' : 'rgba(255,255,255,0.06)'}`, transition: '0.2s' }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: selectedStepIndex === i ? '#38bdf8' : completedSteps.includes(i) ? 'rgba(56,189,248,0.4)' : 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', fontWeight: 950, fontSize: 24, flexShrink: 0, color: (selectedStepIndex === i || completedSteps.includes(i)) ? '#000' : '#fff', display: 'flex' }}>{i+1}</div>
                  <div><div style={{ fontSize: 30, fontWeight: 950, marginBottom: 4, color: (selectedStepIndex === i || completedSteps.includes(i)) ? '#fff' : '#e2e8f0', letterSpacing: '-1px' }}>{step.title}</div><div style={{ fontSize: 22, color: (selectedStepIndex === i || completedSteps.includes(i)) ? '#fff' : '#94a3b8', fontWeight: 600, lineHeight: 1.4 }}>{step.desc}</div></div>
                </div>
              ))}</div>
              {showCompletionPanel && (
                <div style={{ marginTop: 24, padding: '28px', background: 'rgba(56,189,248,0.05)', border: '1px solid rgba(56,189,248,0.3)', borderRadius: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                    <div style={{ width: 72, height: 72, background: '#38bdf8', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(56,189,248,0.4)' }}><Send size={36} color="#000"/></div>
                    <div style={{ flex: 1 }}><div style={{ fontSize: 24, fontWeight: 950, color: '#fff', marginBottom: 4 }}>처치 및 바이탈 데이터 전송</div><div style={{ fontSize: 18, color: '#94a3b8', fontWeight: 700, lineHeight: 1.5 }}>전송 대기 : <span style={{ color: '#38bdf8' }}>{sessionLogs.length}건</span></div></div>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <button onClick={handleSyncData} style={{ background: '#38bdf8', color: '#000', border: 'none', padding: '16px 28px', borderRadius: 14, fontWeight: 950, cursor: 'pointer', fontSize: 19, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 8px 16px rgba(56,189,248,0.2)' }}><RefreshCw size={20}/> 데이터 전송</button>
                      <button onClick={handleTreatmentEnd} style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', padding: '16px 24px', borderRadius: 14, fontWeight: 950, cursor: 'pointer', fontSize: 19 }}>처치 종료</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: 20 }}>
              <div style={{ width: 100, height: 100, borderRadius: '50%', background: 'rgba(56,189,248,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}><Activity size={52} color="#38bdf8"/></div>
              <p style={{ fontSize: 42, fontWeight: 950, color: '#fff', marginBottom: 12 }}>지금 환자에게 무슨 일이 생겼나요?</p>
              <p style={{ fontSize: 29, color: '#64748b', fontWeight: 700 }}>아래에서 상황과 가장 가까운 항목을 누르면<br/>단계별 처치 방법을 바로 안내해 드립니다.</p>
            </div>
          )}
        </section>
        <aside style={{ gridRow: '1', display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0, overflow: 'hidden' }}>
          {/* Patient Profile - Top Priority Anchor */}
          <div style={{ padding: '16px 20px', background: 'rgba(255,255,255,0.03)', border: '1.5px solid rgba(255,255,255,0.08)', borderRadius: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 60, height: 60, borderRadius: 16, overflow: 'hidden', border: '2px solid rgba(255,255,255,0.1)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1e293b' }}>
              <img
                src={resolveAvatarUrl(patient?.avatar)}
                onError={(event) => { event.currentTarget.src = resolveAvatarUrl(null) }}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                alt="Avatar"
              />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}><div style={{ fontSize: 24, fontWeight: 950, color: '#fff' }}>{patient?.name}</div><div style={{ fontSize: 15, color: '#38bdf8', fontWeight: 800 }}>{patient?.role}</div></div>
              <div style={{ fontSize: 13, color: '#64748b', fontWeight: 700 }}>ID : {patient?.id}</div>
            </div>
            {patient?.allergies && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 12 }}>
                <AlertTriangle size={14} color="#ef4444" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: '#fca5a5', fontWeight: 900 }}>알레르기 : {patient.allergies}</span>
              </div>
            )}
          </div>

          {/* Vitals Section - Unified & Simplified */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, position: 'relative' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <VitalMini label="심박수" value={vitals.hr} unit="bpm" color="#ff3b5c" icon={<HeartPulse size={16}/>} isAlert={checkAlert('hr', vitals.hr)} range="60-100" />
              <VitalMini label="산소포화도" value={vitals.spo2} unit="%" color="#38bdf8" icon={<Wind size={16}/>} isAlert={checkAlert('spo2', vitals.spo2)} range="95-100" />
              <VitalMini label="호흡수" value={vitals.rr} unit="/min" color="#10b981" icon={<Activity size={16}/>} isAlert={checkAlert('rr', vitals.rr)} range="12-20" />
              <VitalMini label="혈압(직접)" value={vitals.bp} unit="mmHg" color="#8b5cf6" icon={<Zap size={16}/>} isManual isAlert={checkAlert('bp', vitals.bp)} range="90/60-140/90" onClick={() => handleOpenEdit('bp', '혈압', vitals.bp, 'mmHg')} />
              <VitalMini label="체온(직접)" value={vitals.temp} unit="°C" color="#f59e0b" icon={<Thermometer size={16}/>} isManual isAlert={checkAlert('temp', vitals.temp)} range="36.1-37.2" onClick={() => handleOpenEdit('temp', '체온', vitals.temp, '°C')} />
              
            </div>
            
            {editTarget && (
              <div style={{
                position: 'absolute', 
                top: editTarget.key === 'temp' ? '40%' : '60%', 
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 1000, 
                width: 360, 
                background: '#1e293b', 
                border: '2px solid #38bdf8', 
                borderRadius: 24, 
                padding: 28, 
                boxShadow: '0 20px 50px rgba(0,0,0,0.6)', 
                animation: 'fadeIn 0.2s ease', 
                backdropFilter: 'blur(25px)' 
              }}>
                <div style={{ fontSize: 17, fontWeight: 900, color: '#38bdf8', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 10 }}>
                  {editTarget.key === 'bp' ? <Zap size={20} /> : <Thermometer size={20} />}
                  {editTarget.label} 직접 입력
                </div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: 700, marginBottom: 12 }}>
                  정상 범위 : {editTarget.key === 'bp' ? '90/60 - 140/90' : '36.1 - 37.2'} {editTarget.unit}
                </div>
                <input 
                  value={inputValue} 
                  autoFocus 
                  placeholder={editTarget.key === 'bp' ? '예 : 120/80' : '예 : 36.5'} 
                  onChange={e => setInputValue(e.target.value)} 
                  onKeyDown={e => { 
                    if (e.key === 'Enter') handleSaveVital(); 
                    if (e.key === 'Escape') setEditTarget(null); 
                  }} 
                  style={{ 
                    width: '100%', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.15)', 
                    borderRadius: 14, padding: '16px 20px', color: '#fff', fontSize: 24, fontWeight: 800, 
                    outline: 'none', marginBottom: 20, textAlign: 'center', letterSpacing: '1px', boxSizing: 'border-box'
                  }} 
                />
                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                  <button onClick={() => setEditTarget(null)} style={{ flex: 1, padding: '14px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: 'none', fontWeight: 800, fontSize: 16, cursor: 'pointer', transition: '0.2s' }}>취소</button>
                  <button onClick={handleSaveVital} style={{ flex: 2, padding: '14px', borderRadius: 12, background: '#38bdf8', color: '#000', border: 'none', fontWeight: 950, fontSize: 16, cursor: 'pointer', transition: '0.2s' }}>데이터 저장</button>
                </div>
              </div>
            )}
          </div>

        </aside>
        <section style={{ gridColumn: '1 / 4', gridRow: '2', display: 'grid', gridTemplateColumns: `repeat(${Object.keys(ACTION_GUIDES).length}, 1fr)`, gap: '8px', marginTop: '4px' }}>
          {Object.keys(ACTION_GUIDES).map(key => (
            <button
              key={key}
              onClick={() => {setActiveAction(key); setHoveredAction(null); setCompletedSteps([]); setShowCompletionPanel(false); setSelectedStepIndex(null); setIsBurnTimerActive(false); setBurnTimer(1200); setIsColdTimerActive(false); setColdTimer(1200); setIsWashTimerActive(false); setWashTimer(300);}}
              onMouseEnter={() => setHoveredAction(key)}
              onMouseLeave={() => setHoveredAction(null)}
              style={{ 
                background: activeAction === key ? `linear-gradient(135deg, ${ACTION_GUIDES[key].color}, ${ACTION_GUIDES[key].color}dd)` : `${ACTION_GUIDES[key].color}15`, 
                border: '2px solid', 
                borderColor: activeAction === key ? 'transparent' : `${ACTION_GUIDES[key].color}30`, 
                borderRadius: 12, 
                cursor: 'pointer', 
                display: 'flex', 
                flexDirection: 'column',
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '4px', 
                padding: '8px 4px',
                overflow: 'hidden' 
              }}>
              <div style={{ color: activeAction === key ? '#fff' : ACTION_GUIDES[key].color, flexShrink: 0, transform: 'scale(1.3)' }}><ActionButtonIcon label={key} size={24} /></div>
              <div style={{ 
                fontSize: 34, 
                fontWeight: 950, 
                color: '#fff', 
                letterSpacing: '-1.5px', 
                textAlign: 'center',
                lineHeight: 1,
                whiteSpace: 'nowrap',
                marginTop: '4px'
              }}>
                {key}
              </div>
            </button>
          ))}
        </section>
      </div>
      <style>{`
        @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.02); } 100% { transform: scale(1); } }
        @keyframes pulse-alert-border { 0% { box-shadow: 0 0 10px rgba(239, 68, 68, 0.2); } 50% { box-shadow: 0 0 30px rgba(239, 68, 68, 0.6); } 100% { box-shadow: 0 0 10px rgba(239, 68, 68, 0.2); } }
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        @keyframes imgFadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  )
}

function VitalMini({ label, value, unit, color, icon, onClick, isManual, isAlert, range }) {
  return (
    <div onClick={onClick} style={{ 
      position: 'relative',
      padding: '1px',
      borderRadius: '20px',
      background: isAlert ? '#ff3b5c' : 'rgba(255, 255, 255, 0.1)',
      cursor: isManual ? 'pointer' : 'default',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      minHeight: 110,
      display: 'flex',
      flexDirection: 'column',
      animation: isAlert ? 'pulse-alert-border 1s infinite' : 'none',
      boxShadow: isAlert ? `0 0 25px ${color}66` : 'none'
    }}>
      {/* 내부 콘텐츠 카드 */}
      <div style={{ 
        flex: 1,
        background: isAlert ? 'rgba(40, 5, 10, 0.95)' : 'rgba(2, 12, 22, 0.95)', 
        backdropFilter: 'blur(40px)', 
        borderRadius: '19px', 
        padding: '14px 16px', 
        position: 'relative', 
        zIndex: 2,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: isAlert ? '#fff' : color, display: 'flex', alignItems: 'center' }}>{icon}</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <div style={{ fontSize: 18, color: isAlert ? '#fff' : '#94a3b8', fontWeight: 900, letterSpacing: '0.5px', textTransform: 'uppercase' }}>{label}</div>
              <div style={{ fontSize: 12, color: isAlert ? 'rgba(255,255,255,0.6)' : 'rgba(148,163,184,0.4)', fontWeight: 500 }}>
                {range}
              </div>
            </div>
          </div>
        </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 'auto', justifyContent: 'flex-end' }}>
          <span style={{ fontSize: 40, fontWeight: 950, color: '#fff', letterSpacing: '-1.5px', lineHeight: 1 }}>{value}</span>
          <span style={{ fontSize: 19, color: isAlert ? '#fff' : color, fontWeight: 400, opacity: 0.8 }}>{unit}</span>
          </div>
      </div>
    </div>
  )
}

function ActionButtonIcon({ label, size = 24 }) {
  if (label === '심폐소생술') return <Heart size={size} />
  if (label === '하임리히법') return <Zap size={size} />
  if (label === '찰과상') return <Scissors size={size} />
  if (label === '타박상') return <Shield size={size} />
  if (label === '화상') return <Flame size={size} />
  if (label === '절상') return <Activity size={size} />
  if (label === '열상') return <AlertTriangle size={size} />
  if (label === '자창') return <ShieldAlert size={size} />
  if (label === '기도 확보') return <Wind size={size} />
  if (label === '익수/저체온') return <Droplets size={size} />
  return <Info size={size} />
}

function GCSSelector({ label, value, max, onChange, color }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: '12px 16px', border: '1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: '#94a3b8', marginBottom: 10, display: 'flex', justifyContent: 'space-between' }}>
        <span>{label}</span>
        <span style={{ color, fontWeight: 950 }}>SCORE : {value}</span>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {[...Array(max)].map((_, i) => (
          <button
            key={i}
            onClick={() => onChange(i + 1)}
            style={{
              flex: 1, height: 32, borderRadius: 8, border: 'none',
              background: value === (i + 1) ? color : 'rgba(255,255,255,0.08)',
              color: value === (i + 1) ? '#000' : '#64748b',
              fontSize: 14, fontWeight: 900, cursor: 'pointer', transition: '0.2s'
            }}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  )
}

function IllustrationSelector({ action, step }) {
  if (action === '심폐소생술') {
    // Cardiac has steps 1, 2/3 (Press), 4 (AED)
    const s = step === 2 ? 1 : step === 3 ? 2 : step;
    return <CardiacIllustration step={s} />
  }
  if (action === '지혈/압박') {
    return <TraumaIllustration step={step} />
  }
  if (action === '기도 확보') {
    if (step === 1) return <UnconsciousIllustration step={1} />
    if (step === 2) return <UnconsciousIllustration step={2} />
  }
  return (
    <div style={{ textAlign: 'center', color: '#64748b' }}>
      <div style={{ fontSize: 22, fontWeight: 950, color: '#38bdf8' }}>{action} 일러스트 준비 중</div>
    </div>
  )
}

