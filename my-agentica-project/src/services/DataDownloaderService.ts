// services/DataDownloaderService.ts
import * as fs from "fs";
import * as path from "path";
import axios, { AxiosInstance } from "axios";
import { wrapper } from "axios-cookiejar-support";
import { CookieJar } from "tough-cookie";

export class DataDownloaderService {
  /**
   * 데모: 소상공인 상가(상권)정보 다운로드
   */
  public async downloadStoreInfoData(savePath: string): Promise<void> {
    const publicDataPk = "3074462"; // ✅ PK만 사용
    await this.downloadDataFile(publicDataPk, savePath);
  }

  /**
   * 핵심: publicDataPk를 기반으로 UDDI/atchFileId/fileSn을 추적 후 파일 다운로드
   */
  public async downloadDataFile(
    publicDataPk: string,
    savePath: string,
    opts?: { fileDetailSn?: number }
  ): Promise<string> {
    const abs = path.resolve(savePath);
    fs.mkdirSync(path.dirname(abs), { recursive: true });

    const jar = new CookieJar();
    const client = wrapper(
      axios.create({
        withCredentials: true,
        jar,
        timeout: 30000,
        maxRedirects: 5,
        validateStatus: () => true,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
          "Accept-Language": "ko,en;q=0.9",
        },
      })
    );

    const referer = `https://www.data.go.kr/data/${encodeURIComponent(
      publicDataPk
    )}/fileData.do?recommendDataYn=Y`;

    // 1) 상세페이지 (세션 확보)
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

    // 3) 메타(JSON) 확보
    const meta = await this.fetchFileMeta(client, referer, publicDataPk, {
      startSn: opts?.fileDetailSn ?? 1,
      maxSn: 12,
    });

    if (!meta || !meta.atchFileId || !meta.fileSn) {
      throw new Error("파일 메타데이터를 찾지 못했습니다.");
    }

    console.log(
      `- 메타 확인: atchFileId=${meta.atchFileId}, fileSn=${
        meta.fileSn
      }, uddi=${meta.uddi ?? "-"}, name=${meta.orgFileNm ?? "-"}`
    );

    // 4) 직다운 엔드포인트
    const directUrl = `https://www.data.go.kr/cmm/cmm/fileDownload.do?${new URLSearchParams(
      {
        atchFileId: meta.atchFileId,
        fileSn: String(meta.fileSn),
      }
    ).toString()}`;

    console.log(`- 직다운 시도: ${directUrl}`);
    const res = await client.get(directUrl, {
      headers: { Referer: referer },
      responseType: "arraybuffer",
    });

    const ct = String(res.headers["content-type"] || "").toLowerCase();
    const buf = Buffer.from(res.data);

    let finalPath = abs;
    if (meta.orgFileNm) {
      const outDir = path.dirname(abs);
      finalPath = path.join(outDir, meta.orgFileNm);
    }

    const cd = String(res.headers["content-disposition"] || "");
    const cdFile = getFilenameFromContentDisposition(cd);
    if (!meta.orgFileNm && cdFile) {
      const outDir = path.dirname(abs);
      finalPath = path.join(outDir, cdFile);
    }

    fs.writeFileSync(finalPath, buf);
    console.log(`✅ 저장 완료: ${finalPath} (CT=${ct})`);

    if (finalPath.toLowerCase().endsWith(".zip")) {
      const sig = buf.subarray(0, 4).toString("binary");
      if (!ct.includes("zip") && sig !== "PK\u0003\u0004") {
        console.warn(
          "⚠️ ZIP 시그니처가 보이지 않습니다. 파일 형식을 확인하세요."
        );
      }
    }
    return finalPath;
  }

  /**
   * selectFileDataDownload.do 순회 → atchFileId, fileSn, UDDI 추적
   */
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
