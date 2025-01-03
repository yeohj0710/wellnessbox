import axios from "axios";

export async function searchAddress(query: string) {
  try {
    const response = await axios.get(
      "https://naveropenapi.apigw.ntruss.com/map-geocode/v2/geocode",
      {
        params: { query },
        headers: {
          "X-NCP-APIGW-API-KEY-ID": process.env.NAVER_MAP_ID!,
          "X-NCP-APIGW-API-KEY": process.env.NAVER_MAP_KEY!,
        },
      }
    );
    return response.data;
  } catch (error: any) {
    console.error(
      "Error fetching address from Naver Map API:",
      error.response?.data || error
    );
    throw new Error("주소 검색에 실패했습니다.");
  }
}

export async function reverseGeocode(coords: { lat: number; lng: number }) {
  try {
    const response = await axios.get(
      "https://naveropenapi.apigw.ntruss.com/map-reversegeocode/v2/gc",
      {
        params: {
          coords: `${coords.lng},${coords.lat}`,
          orders: "addr",
          output: "json",
        },
        headers: {
          "X-NCP-APIGW-API-KEY-ID": process.env.NAVER_MAP_ID!,
          "X-NCP-APIGW-API-KEY": process.env.NAVER_MAP_KEY!,
        },
      }
    );
    return response.data;
  } catch (error: any) {
    console.error(
      "Error fetching reverse geocode from Naver Map API:",
      error.response?.data || error
    );
    throw new Error("좌표를 기반으로 주소를 검색하는 데 실패했습니다.");
  }
}
