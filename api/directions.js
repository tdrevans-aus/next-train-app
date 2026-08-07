import { fetchTripsForStation, uniqueDestinations } from "../../lib/train-times.js";

export default async function handler(request) {
  const station = new URL(request.url).searchParams.get("station");

  if (!station) {
    return Response.json({ error: "Missing station parameter" }, { status: 400 });
  }

  try {
    const { trips } = await fetchTripsForStation(station);
    return Response.json({ directions: uniqueDestinations(trips) });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: error.message ?? "Failed to fetch directions" },
      { status: 500 }
    );
  }
}
