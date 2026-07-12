const { chromium } = require("playwright");
const path = require("node:path");
require("dotenv").config({ path: path.join(process.cwd(), ".env") });
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"});
  const context=await browser.newContext({viewport:{width:1440,height:900}});
  const login=await context.request.post("http://127.0.0.1:3012/api/verify-password",{data:{password:process.env.TEST_PASSWORD,loginType:"test"}});
  if(!login.ok())throw new Error(`login_${login.status()}`);
  const page=await context.newPage(); await page.goto("http://127.0.0.1:3012/tips",{waitUntil:"networkidle"});
  await page.getByRole("button",{name:"시연 데이터 8명 생성"}).click();
  const panels=page.locator("[class*='studyPanel']");
  const slider=panels.nth(1).locator("input[type=range]").first();
  const before=await slider.inputValue(); await slider.fill("9"); const after=await slider.inputValue();
  const displayed=await panels.nth(1).locator("[class*='rangeRow']").first().locator("strong").textContent();
  const preview=await page.locator("[class*='studyResult']").locator("strong").nth(1).textContent();
  if(after!=="9"||displayed!=="9"||preview!=="62.5")throw new Error(`slider_preview_mismatch:${after}:${displayed}:${preview}`);
  console.log(JSON.stringify({before,after,displayed,preview,ok:true},null,2));
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
