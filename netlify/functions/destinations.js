import { fetchTripsForStation, uniqueDestinations } from "../../lib/train-times.js";

export async function handler(event) {
  const station = event.queryStringParameters?.station;

  if (!station) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Missing station parameter" }),
    };
  }

  try {
    const { trips } = await fetchTripsForStation(station);
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ destinations: uniqueDestinations(trips) }),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: error.message ?? "Failed to fetch destinations" }),
    };
  }
}
