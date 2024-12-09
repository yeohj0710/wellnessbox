import axios from "axios";
import { NextApiRequest, NextApiResponse } from "next";

const PORTONE_API_URL = "https://api.portone.io/v2";
const { TOSS_SECRET_KEY } = process.env;

async function getAccessToken() {
  const response = await axios.post(`${PORTONE_API_URL}/authenticate`, {
    api_secret: TOSS_SECRET_KEY,
  });
  return response.data.response.access_token;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "POST") {
    try {
      const { amount, merchant_uid } = req.body;
      const accessToken = await getAccessToken();
      const response = await axios.post(
        `${PORTONE_API_URL}/payments/create`,
        {
          amount,
          merchant_uid,
        },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      return res.status(200).json(response.data);
    } catch (error) {
      return res.status(500).json({ message: "Payment API Error", error });
    }
  }
  res.status(405).json({ message: "Method Not Allowed" });
}
