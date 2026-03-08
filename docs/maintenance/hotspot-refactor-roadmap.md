# ?レ뒪??由ы뙥?좊쭅 濡쒕뱶留?(?댁쁺 湲곗?)

?꾩냽 ?몄뀡?먯꽌 鍮좊Ⅴ寃??묒뾽 ?곗꽑?쒖쐞瑜??≪쓣 ???덈룄濡? ?⑥닔 ?レ뒪?잕낵 遺꾪빐 ?⑥쐞瑜??뺣━?⑸땲??

湲곗? ?뚯씪: `C:/dev/wellnessbox-rnd/docs/legacy_from_wellnessbox/agents/FUNCTION_HOTSPOTS.md`

## ?꾩옱 ?곗꽑?쒖쐞 (UI/?낅Т ?곹뼢??湲곗?)

1. `app/survey/survey-page-client.tsx` (`SurveyPageClient`, 1800+ lines)
2. `app/(admin)/admin/b2b-reports/B2bAdminReportClient.tsx`
3. `app/(features)/employee-report/EmployeeReportClient.tsx`
4. `app/(admin)/admin/b2b-employee-data/B2bAdminEmployeeDataClient.tsx`

## ?대? ?곸슜??遺꾪빐 ?⑦꽩

- TopBar 諛섏쓳???먮떒 濡쒖쭅 遺꾨━:
  - `components/common/topBar.layout.ts`
- 愿由ъ옄 ?ㅻЦ ?몄쭛 ?대퉬寃뚯씠????遺꾨━:
  - `app/(admin)/admin/b2b-reports/_lib/use-survey-editor-navigation.ts`
- 怨듦컻 ?ㅻЦ ?먮룞 怨꾩궛/以묐났 留ㅽ븨/ID ?뺢퇋??濡쒖쭅 遺꾨━:
  - `app/survey/_lib/survey-page-auto-compute.ts`
- 怨듦컻 ?ㅻЦ ?뱀뀡 ?대룞/?ъ빱???ㅽ겕濡?濡쒖쭅 ??遺꾨━:
  - `app/survey/_lib/use-survey-section-navigation.ts`
- 愿由ъ옄 B2B 由ы룷??諛곌꼍 ?덈줈怨좎묠 ?덉젙????遺꾨━:
  - `app/(admin)/admin/b2b-reports/_lib/use-b2b-admin-background-refresh.ts`
- ?꾩쭅???덊룷???곹깭 ?꾩씠(愿由ъ옄 李⑤떒/由ы룷??誘몄〈???숆린??媛?대뱶) 怨듯넻 ??遺꾨━:
  - `app/(features)/employee-report/_lib/use-employee-report-state-actions.ts`
- ?꾩쭅???곗씠???댁쁺 肄섏넄 busy/?뚮┝ 怨듯넻 ?≪뀡 ??遺꾨━:
  - `app/(admin)/admin/b2b-employee-data/_lib/use-b2b-employee-data-busy-action.ts`
- ?꾩쭅???곗씠???댁쁺 肄섏넄 ???곹깭/?낅젰 ?뺢퇋?????payload 鍮뚮뜑 ??遺꾨━:
  - `app/(admin)/admin/b2b-employee-data/_lib/use-b2b-employee-data-forms.ts`
- ?꾩쭅???곗씠???댁쁺 肄섏넄 ?≪뀡 ?몃뱾??寃???앹꽦/珥덇린????젣) ??遺꾨━:
  - `app/(admin)/admin/b2b-employee-data/_lib/use-b2b-employee-data-actions.ts`

## 沅뚯옣 遺꾪빐 ?⑥쐞 (怨듯넻)

1. `data shaping`: API/?쒗뵆由?-> ?뚮뜑留?紐⑤뜽 蹂??2. `navigation state`: ?뱀뀡 ?대룞, ?ъ빱???대룞, ?먮룞 ?ㅽ겕濡?3. `mutation handlers`: onChange/onSave/onSync
4. `render sections`: 移대뱶/?⑤꼸 ?⑥쐞 而댄룷?뚰듃 遺꾨━

## 二쇱쓽?ы빆

- ?ㅻЦ 濡쒖쭅? ??긽 `lib/b2b/public-survey.ts`瑜?湲곗??쇰줈 ?좎??쒕떎.
- `/survey`? `/admin/b2b-reports`??怨듯넻 ?좏슚???좏깮 洹쒖튃??源⑥?吏 ?딅룄濡?QA瑜?癒쇱? 蹂닿컯 ??由ы뙥?좊쭅?쒕떎.
- 臾몄옄??蹂듭궗 臾멸뎄 ?섏젙? ?쒓뎅??湲곗?(`ko-KR`)??湲곕낯?쇰줈 ?쒕떎.

## 由ы뙥?좊쭅 ?꾨즺 泥댄겕由ъ뒪??
1. `npm run audit:encoding`
2. `npm run qa:b2b:survey-structure`
3. `npm run qa:b2b:admin-background-refresh`
4. `npm run qa:employee-report:state-actions`
5. `npm run qa:b2b:employee-data-busy-action`
6. `npm run qa:b2b:employee-data-forms`
7. `npm run qa:b2b:employee-data-actions`
8. `npm run qa:b2b:survey-sync-core`
9. `npm run lint`
10. `npm run build`

