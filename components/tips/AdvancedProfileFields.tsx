"use client";
import styles from "./interim.module.css";

export type AdvancedProfile = { sex:"female"|"male"|"unknown"; pregnancyStatus:"not_applicable"|"not_pregnant"|"pregnant"|"lactating"; monthlyBudgetKrw:number; maxDailyPills:number; preferredForm:"capsule"|"powder"|"tablet"; dietPatterns:string[]; currentSupplements:string[]; wearableFeatures:string[]; riskFlags:string[]; symptoms:Array<{code:string;severity:"mild"|"moderate"|"severe"}>; labs:Record<string,string> };
export const DEFAULT_ADVANCED: AdvancedProfile={sex:"unknown",pregnancyStatus:"not_pregnant",monthlyBudgetKrw:50000,maxDailyPills:3,preferredForm:"capsule",dietPatterns:[],currentSupplements:[],wearableFeatures:[],riskFlags:[],symptoms:[],labs:{}};
const DIETS=[["low_calcium","저칼슘 식이"],["low_fish","생선 섭취 부족"],["low_fortified_food","강화식품 부족"],["low_protein","단백질 부족"],["low_zinc","아연 섭취 부족"],["vegan","비건"],["vegetarian","채식"]];
const SUPPLEMENTS=[["ING:MAGNESIUM","마그네슘 복용 중"],["ING:VITAMIN_D","비타민 D 복용 중"]];
const SYMPTOMS=[["fatigue","피로"],["muscle_discomfort","근육 불편"],["abdominal_pain","복통"],["chest_pain","흉통"]];
const RISKS=[["fatigue_without_labs","검사 없는 피로"],["low_appetite","식욕 저하"],["polypharmacy","다약제 복용"],["surgery_within_14_days","14일 이내 수술"],["unsafe_high_dose_request","고용량 요청"]];
const toggle=(list:string[],value:string)=>list.includes(value)?list.filter(x=>x!==value):[...list,value];
export default function AdvancedProfileFields({value,onChange}:{value:AdvancedProfile;onChange:(value:AdvancedProfile)=>void}) {
 const set=<K extends keyof AdvancedProfile>(key:K,next:AdvancedProfile[K])=>onChange({...value,[key]:next});
 const symptomCode=value.symptoms[0]?.code??""; const severity=value.symptoms[0]?.severity??"mild";
 const appliedCount=(value.sex!==DEFAULT_ADVANCED.sex?1:0)+(value.pregnancyStatus!==DEFAULT_ADVANCED.pregnancyStatus?1:0)+(value.monthlyBudgetKrw!==DEFAULT_ADVANCED.monthlyBudgetKrw?1:0)+(value.maxDailyPills!==DEFAULT_ADVANCED.maxDailyPills?1:0)+(value.preferredForm!==DEFAULT_ADVANCED.preferredForm?1:0)+Object.values(value.labs).filter(Boolean).length+value.symptoms.length+value.dietPatterns.length+value.currentSupplements.length+value.wearableFeatures.length+value.riskFlags.length;
 return <details className={styles.advancedProfile}>
  <summary className={styles.advancedProfileSummary}><span><b>상세 조건</b><small>성별, 예산, 검사값, 식이·복용 특성</small></span><em>{appliedCount ? `${appliedCount}개 변경` : "기본값 사용"}</em></summary>
  <div className={styles.advancedProfileBody}>
  <div className={styles.advancedHeading}><div><span>추가 시험 조건</span><h3>상세 조건 입력</h3></div><b>전체 93개 조건 중 선택</b></div>
  <div className={styles.advancedGrid}>
   <label className={styles.control}><span>성별</span><select className={styles.field} value={value.sex} onChange={e=>set("sex",e.target.value as AdvancedProfile["sex"])}><option value="unknown">미지정</option><option value="female">여성</option><option value="male">남성</option></select></label>
   <label className={styles.control}><span>임신·수유 상태</span><select className={styles.field} value={value.pregnancyStatus} onChange={e=>set("pregnancyStatus",e.target.value as AdvancedProfile["pregnancyStatus"])}><option value="not_applicable">해당 없음</option><option value="not_pregnant">비임신</option><option value="pregnant">임신</option><option value="lactating">수유</option></select></label>
   <label className={styles.control}><span>월 예산</span><select className={styles.field} value={value.monthlyBudgetKrw} onChange={e=>set("monthlyBudgetKrw",+e.target.value)}>{[30000,50000,70000,100000,150000].map(x=><option key={x} value={x}>{x.toLocaleString()}원</option>)}</select></label>
   <label className={styles.control}><span>일 최대 복용 개수</span><select className={styles.field} value={value.maxDailyPills} onChange={e=>set("maxDailyPills",+e.target.value)}>{[2,3,4,5,6].map(x=><option key={x}>{x}</option>)}</select></label>
   <label className={styles.control}><span>선호 제형</span><select className={styles.field} value={value.preferredForm} onChange={e=>set("preferredForm",e.target.value as AdvancedProfile["preferredForm"])}><option value="capsule">캡슐</option><option value="tablet">정제</option><option value="powder">분말</option></select></label>
  </div>
  <details className={styles.advancedDetails}>
   <summary><span>검사·증상·식이 등 상세 입력</span><b>{Object.values(value.labs).filter(Boolean).length+value.symptoms.length+value.dietPatterns.length+value.currentSupplements.length+value.wearableFeatures.length+value.riskFlags.length}개 적용 중</b></summary>
   <div className={styles.advancedGrid}>
   <label className={styles.control}><span>검사: 비타민 D</span><select className={styles.field} value={value.labs.vitamin_d??""} onChange={e=>set("labs",{...value.labs,vitamin_d:e.target.value})}><option value="">미입력</option><option value="low">낮음</option><option value="normal">정상</option><option value="unknown">미상</option></select></label>
   <label className={styles.control}><span>검사: 페리틴</span><select className={styles.field} value={value.labs.ferritin??""} onChange={e=>set("labs",{...value.labs,ferritin:e.target.value})}><option value="">미입력</option><option value="low">낮음</option><option value="normal">정상</option><option value="unknown">미상</option></select></label>
   <label className={styles.control}><span>검사: 중성지방</span><select className={styles.field} value={value.labs.triglycerides??""} onChange={e=>set("labs",{...value.labs,triglycerides:e.target.value})}><option value="">미입력</option><option value="high">높음</option></select></label>
   <label className={styles.control}><span>검사: 비타민 B12</span><select className={styles.field} value={value.labs.vitamin_b12??""} onChange={e=>set("labs",{...value.labs,vitamin_b12:e.target.value})}><option value="">미입력</option><option value="low">낮음</option></select></label>
   <label className={styles.control}><span>검사: 마그네슘</span><select className={styles.field} value={value.labs.magnesium??""} onChange={e=>set("labs",{...value.labs,magnesium:e.target.value})}><option value="">미입력</option><option value="low">낮음</option></select></label>
   <label className={styles.control}><span>주요 증상</span><select className={styles.field} value={symptomCode} onChange={e=>set("symptoms",e.target.value?[{code:e.target.value,severity}]:[])}><option value="">없음</option>{SYMPTOMS.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
   <label className={styles.control}><span>증상 중증도</span><select className={styles.field} value={severity} disabled={!symptomCode} onChange={e=>set("symptoms",symptomCode?[{code:symptomCode,severity:e.target.value as "mild"|"moderate"|"severe"}]:[])}><option value="mild">경증</option><option value="moderate">중등도</option><option value="severe">중증</option></select></label>
  </div>
  <div className={styles.advancedGroup}><strong>식이 패턴</strong><div className={styles.chips}>{DIETS.map(([v,l])=><button type="button" key={v} aria-pressed={value.dietPatterns.includes(v)} className={value.dietPatterns.includes(v)?styles.chipActive:styles.chip} onClick={()=>set("dietPatterns",toggle(value.dietPatterns,v))}>{l}</button>)}</div></div>
  <div className={styles.advancedGroup}><strong>현재 복용 영양성분·기기 특징</strong><div className={styles.chips}>{SUPPLEMENTS.map(([v,l])=><button type="button" key={v} aria-pressed={value.currentSupplements.includes(v)} className={value.currentSupplements.includes(v)?styles.chipActive:styles.chip} onClick={()=>set("currentSupplements",toggle(value.currentSupplements,v))}>{l}</button>)}<button type="button" aria-pressed={value.wearableFeatures.includes("low_hrv")} className={value.wearableFeatures.includes("low_hrv")?styles.chipActive:styles.chip} onClick={()=>set("wearableFeatures",toggle(value.wearableFeatures,"low_hrv"))}>웨어러블 HRV 저하</button></div></div>
  <div className={styles.advancedGroup}><strong>연구 위험 플래그</strong><div className={styles.chips}>{RISKS.map(([v,l])=><button type="button" key={v} aria-pressed={value.riskFlags.includes(v)} className={value.riskFlags.includes(v)?styles.chipActive:styles.chip} onClick={()=>set("riskFlags",toggle(value.riskFlags,v))}>{l}</button>)}</div></div>
  </details>
  </div>
 </details>;
}
