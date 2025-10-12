// services/DataDownloaderService.ts
import * as fs from "fs";
import * as path from "path";
import axios, { AxiosInstance } from "axios";
import iconv from "iconv-lite";
import puppeteer from "puppeteer"; // npm i puppeteer
import { setTimeout as delay } from "timers/promises";

export class DataDownloaderService {
  /**
   * publicDataPk: 기존처럼 data.go.kr의 PK 문자열일 수도 있고,
   * 서울시 포털 상세 URL(예: https://data.seoul.go.kr/dataList/OA-21090/S/1/datasetView.do)일 수도 있음.
   */
  public async downloadDataFile(
      publicDataPk: string,
      savePath: string,
      opts?: { fileDetailSn?: number }
  ): Promise<string> {
    const { buffer, fileName } = await this.downloadCore(publicDataPk, opts);

    const abs = path.resolve("/tmp", path.basename(savePath));
    const dir = path.dirname(abs);
    const finalPath = path.join(dir, fileName);

    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(finalPath, buffer);

    console.log(`✅ 저장 완료: ${finalPath}`);
    return finalPath;
  }

  /** 메모리 반환용 */
  public async downloadDataFileAsBuffer(
      publicDataPk: string,
      opts?: { fileDetailSn?: number }
  ): Promise<{ buffer: Buffer; fileName: string; contentType: string }> {
    return this.downloadCore(publicDataPk, opts);
  }

  private async downloadCore(
      publicDataPk: string,
      opts?: { fileDetailSn?: number }
  ): Promise<{ buffer: Buffer; fileName: string; contentType: string }> {
    // 1) 서울시 포털 상세 URL이면 Puppeteer 캡처+리플레이 경로
    if (this.isSeoulDatasetViewUrl(publicDataPk)) {
      return this.downloadViaPuppeteerReplay(publicDataPk);
    }
    // 2) 아니면 data.go.kr 기본 플로우
    return this.downloadViaDataGoKr(publicDataPk, opts);
  }

  private isSeoulDatasetViewUrl(input: string): boolean {
    try {
      const u = new URL(input);
      return (
          u.hostname.endsWith("data.seoul.go.kr") &&
          u.pathname.includes("/datasetView.do")
      );
    } catch {
      return false;
    }
  }

  /**
   * Puppeteer로 상세 페이지 열고, 다운로드용 네트워크 요청을 포착 → axios로 재생(replay)
   */
  private async downloadViaPuppeteerReplay(datasetViewUrl: string) {
    console.log(`[Downloader][Seoul] Puppeteer flow start for ${datasetViewUrl}`);

    const browser = await puppeteer.launch({
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH, // 예: /usr/bin/chromium-browser
      args: ["--no-sandbox","--disable-setuid-sandbox","--disable-dev-shm-usage","--disable-gpu"],
    });
    const page = await browser.newPage();
    await page.setDefaultNavigationTimeout(60000);
    await page.setUserAgent(
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
    );
    await page.setExtraHTTPHeaders({
      "Accept-Language": "ko,en;q=0.9",
      "Upgrade-Insecure-Requests": "1",
    });

    // 디버깅용 네트워크 로깅
    page.on("request", (req) => {
      const u = req.url();
      if (u.includes("download.do") || u.includes("datafile.seoul.go.kr") || u.includes("bigfile")) {
        console.log("[Seoul][REQ]", req.method(), u);
      }
    });

    // 헬퍼: 지정 텍스트를 포함하는 a/button/[role=button] 클릭
    const clickByText = async (labels: string[]) => {
      return page.evaluate((targets) => {
        const nodes = Array.from(document.querySelectorAll('a,button,[role="button"]')) as HTMLElement[];
        const norm = (s: string) => (s || "").replace(/\s+/g, " ").trim();
        for (const n of nodes) {
          const t = norm(n.textContent || "");
          if (targets.some(lbl => t.includes(lbl))) {
            n.click();
            return true;
          }
        }
        return false;
      }, labels);
    };

    let capturedReq:
        | { url: string; method: string; headers: Record<string, string>; postData?: string }
        | null = null;

    try {
      await page.goto(datasetViewUrl, { waitUntil: "networkidle2" });
      await page.waitForSelector("body");

      // 1) 페이지에 다운로드 form 있으면 submit
      const hasForm = await page.$("form[action*='download.do'], form[action*='datafile.seoul.go.kr'], form[action*='bigfile']");
      if (hasForm && !capturedReq) {
        console.log("[Seoul] Found form → submit()");
        const waitReq = page.waitForRequest(
            (req) => /download\.do|datafile\.seoul\.go\.kr|bigfile/.test(req.url()),
            { timeout: 15000 }
        );
        await page.evaluate(() => {
          const f =
              document.querySelector("form[action*='download.do']") ||
              document.querySelector("form[action*='datafile.seoul.go.kr']") ||
              document.querySelector("form[action*='bigfile']");
          if (f) (f as HTMLFormElement).submit();
        });
        const req = await waitReq;
        capturedReq = {
          url: req.url(),
          method: req.method(),
          headers: req.headers() as Record<string, string>,
          postData: req.postData() || undefined,
        };
      }

      // 2) 폼이 없거나 포착 실패 → 버튼/링크 클릭 시도 (속성 기반)
      if (!capturedReq) {
        const selectors = [
          "a[href*='download.do']",
          "a[href*='datafile.seoul.go.kr']",
          "a[href*='bigfile']",
          "a[download]",                 // HTML5 download 속성
          "button.download",
          "button[data-role*='download']",
          "a.btn_down",
          "a[class*='down']",
          "button[class*='down']",
          "[data-action*='down']",
        ];

        for (const sel of selectors) {
          const el = await page.$(sel);
          if (!el) continue;

          console.log(`[Seoul] Click try: ${sel}`);
          const waitReq = page.waitForRequest(
              (req) => /download\.do|datafile\.seoul\.go\.kr|bigfile/.test(req.url()),
              { timeout: 15000 }
          );
          await el.click().catch(() => {});
          await delay(500);

          try {
            const req = await waitReq;
            capturedReq = {
              url: req.url(),
              method: req.method(),
              headers: req.headers() as Record<string, string>,
              postData: req.postData() || undefined,
            };
            break;
          } catch {
            // 다음 셀렉터 시도
          }
        }
      }

      // 3) 텍스트 기반 클릭: '내려받기(CSV)', '내려받기', '다운로드'
      if (!capturedReq) {
        const clicked = await clickByText(["내려받기(CSV)", "내려받기", "다운로드"]);
        if (clicked) {
          try {
            const req = await page.waitForRequest(
                (r) => /download\.do|datafile\.seoul\.go\.kr|bigfile/.test(r.url()),
                { timeout: 15000 }
            );
            capturedReq = {
              url: req.url(),
              method: req.method(),
              headers: req.headers() as Record<string, string>,
              postData: req.postData() || undefined,
            };
          } catch {
            // 텍스트 클릭했지만 네트워크 포착 실패 → 다음 보루로
          }
        }
      }

      // 4) 마지막 보루: href 스캔 → 직접 이동해서 요청 포착
      if (!capturedReq) {
        const href = await page.$$eval("a[href]", (as) =>
            (as as HTMLAnchorElement[])
                .map((a) => a.href)
                .find((h) => /download\.do|datafile\.seoul\.go\.kr|bigfile/.test(h))
        );
        if (href) {
          console.log("[Seoul] Direct href found:", href);
          const waitReq = page.waitForRequest(
              (req) => /download\.do|datafile\.seoul\.go\.kr|bigfile/.test(req.url()),
              { timeout: 15000 }
          );
          await page.goto(href, { waitUntil: "networkidle2" });
          const req = await waitReq;
          capturedReq = {
            url: req.url(),
            method: req.method(),
            headers: req.headers() as Record<string, string>,
            postData: req.postData() || undefined,
          };
        }
      }

      // 실패 시 스크린샷
      if (!capturedReq) {
        await page.screenshot({ path: "/app/tmp/seoul_download_fail.png", fullPage: true }).catch(() => {});
      }
    } finally {
      try { await page.close(); } catch {}
      try { await browser.close(); } catch {}
    }

    if (!capturedReq) {
      throw new Error("[Downloader][Seoul] 다운로드 요청을 포착하지 못했습니다. (사이트 구조가 달라졌을 수 있음)");
    }

    console.log("[Seoul] Captured:", capturedReq.method, capturedReq.url);

    // 캡처된 요청을 axios로 재생
    const headers = { ...capturedReq.headers };
    delete headers["host"];
    delete headers["content-length"];

    const axiosResp = await axios({
      url: capturedReq.url,
      method: (capturedReq.method as any) || "GET",
      headers,
      data: capturedReq.postData,
      responseType: "arraybuffer",
      timeout: 60000,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });

    const buf = Buffer.from(axiosResp.data);
    const contentType = String(axiosResp.headers["content-type"] || "application/octet-stream");
    const cd = String(axiosResp.headers["content-disposition"] || "");
    const fileName =
        getFilenameFromContentDisposition(cd) ||
        this.deriveFilenameFromUrl(capturedReq.url) ||
        `downloaded-${Date.now()}`;

    // CP949 CSV → UTF-8 변환 시도
    const lc = contentType.toLowerCase();
    if (lc.includes("cp949") || lc.includes("euc-kr") || /\.csv$/i.test(fileName)) {
      try {
        const decoded = iconv.decode(buf, "cp949");
        return { buffer: Buffer.from(decoded, "utf8"), fileName, contentType };
      } catch { /* 변환 실패 시 원본 반환 */ }
    }
    return { buffer: buf, fileName, contentType };
  }
  /**
   * data.go.kr 기본 플로우 (메타 조회 → fileDownload.do)
   */
  private async downloadViaDataGoKr(
      publicDataPk: string,
      opts?: { fileDetailSn?: number }
  ): Promise<{ buffer: Buffer; fileName: string; contentType: string }> {
    const client = axios.create({
      timeout: 60000,
      maxRedirects: 5,
      validateStatus: () => true,
      headers: {
        "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
        "Accept-Language": "ko,en;q=0.9",
      },
    });

    const referer = `https://www.data.go.kr/data/${encodeURIComponent(
        publicDataPk
    )}/fileData.do?recommendDataYn=Y`;

    // 1) 상세페이지(세션)
    await client.get(referer, {
      headers: { Referer: "https://www.data.go.kr/" },
      responseType: "text",
    });

    // 2) checkFileType.do
    await client.get(
        `https://www.data.go.kr/tcs/dss/checkFileType.do?publicDataPk=${encodeURIComponent(
            publicDataPk
        )}`,
        {
          headers: {
            Referer: referer,
            "X-Requested-With": "XMLHttpRequest",
          },
          responseType: "text",
        }
    );

    // 3) 메타 조회
    const meta = await this.fetchFileMeta(client, referer, publicDataPk, {
      startSn: opts?.fileDetailSn ?? 1,
      maxSn: 12,
    });

    if (!meta || !meta.atchFileId || !meta.fileSn) {
      throw new Error(
          "파일 메타데이터를 찾지 못했습니다 (atchFileId or fileSn missing)."
      );
    }

    const directUrl = `https://www.data.go.kr/cmm/cmm/fileDownload.do?${new URLSearchParams(
        {
          atchFileId: meta.atchFileId,
          fileSn: String(meta.fileSn),
        }
    ).toString()}`;

    const res = await client.get(directUrl, {
      headers: { Referer: referer },
      responseType: "arraybuffer",
    });

    const buffer = Buffer.from(res.data);
    const contentType = String(
        res.headers["content-type"] || "application/octet-stream"
    ).toLowerCase();

    let fileName =
        meta.orgFileNm ||
        getFilenameFromContentDisposition(
            String(res.headers["content-disposition"] || "")
        ) ||
        `downloaded-file-${publicDataPk}`;

    // CP949 CSV → UTF-8 변환 시도
    if (
        contentType.includes("cp949") ||
        contentType.includes("euc-kr") ||
        /\.csv$/i.test(String(fileName))
    ) {
      try {
        const decoded = iconv.decode(buffer, "cp949");
        return {
          buffer: Buffer.from(decoded, "utf8"),
          fileName,
          contentType,
        };
      } catch {
        // 그대로 반환
      }
    }

    return { buffer, fileName, contentType };
  }

  /** data.go.kr 파일 메타 조회 */
  private async fetchFileMeta(
      client: AxiosInstance,
      referer: string,
      publicDataPk: string,
      opt: { startSn: number; maxSn: number }
  ): Promise<{
    atchFileId: string;
    fileSn: number;
    orgFileNm?: string;
    uddi?: string;
  } | null> {
    const base = "https://www.data.go.kr/tcs/dss/selectFileDataDownload.do";

    const tryOne = async (sn: number) => {
      const url = `${base}?publicDataPk=${encodeURIComponent(
          publicDataPk
      )}&fileDetailSn=${sn}`;
      const res = await client.get(url, {
        headers: {
          Referer: referer,
          "X-Requested-With": "XMLHttpRequest",
        },
        responseType: "text",
        validateStatus: () => true,
      });

      const text = String(res.data);
      if (text.trim().startsWith("{") && text.includes("atchFileId")) {
        try {
          const json = JSON.parse(text);
          const d = json?.dataSetFileDetailInfo ?? {};
          const r = json?.fileDataRegistVO ?? {};
          const atch =
              r?.atchFileId || json?.atchFileId || d?.atchFileId || null;
          const fileSn =
              Number(d?.fileDetailSn || json?.fileDetailSn || sn) || sn;
          const org = r?.orginlFileNm || d?.orginlFileNm || undefined;
          const uddi =
              d?.publicDataDetailPk || json?.publicDataDetailPk || undefined;

          if (atch) {
            return { atchFileId: atch, fileSn, orgFileNm: org, uddi };
          }
        } catch {}
      }
      return null;
    };

    const pref = await tryOne(opt.startSn);
    if (pref) return pref;

    for (let sn = 1; sn <= opt.maxSn; sn++) {
      if (sn === opt.startSn) continue;
      const got = await tryOne(sn);
      if (got) return got;
    }
    return null;
  }

  private deriveFilenameFromUrl(u: string) {
    try {
      const parsed = new URL(u);
      const p = parsed.pathname.split("/").pop() || "";
      return decodeURIComponent(p) || null;
    } catch {
      return null;
    }
  }
}

function getFilenameFromContentDisposition(cd: string): string | null {
  if (!cd) return null;
  const star = cd.match(/filename\*\s*=\s*([^']+)''([^;]+)/i);
  if (star) {
    try {
      return decodeURIComponent(star[2].trim().replace(/^"|"$/g, ""));
    } catch {}
  }
  const normal =
      cd.match(/filename\s*=\s*"([^"]+)"/i) ||
      cd.match(/filename\s*=\s*([^;]+)/i);
  if (normal) {
    return normal[1].trim().replace(/^"|"$/g, "");
  }
  return null;
}
