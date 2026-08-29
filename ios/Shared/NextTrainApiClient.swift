import Foundation

enum NextTrainApiClient {
    private static let apiBase = "https://next-train-app.vercel.app"

    static func fetchNextTrain(
        station: String,
        direction: String,
        leaveBeforeMinutes: Int,
        city: String? = nil
    ) throws -> [String: Any] {
        var components = URLComponents(string: "\(apiBase)/api/next-train")!
        var queryItems = [
            URLQueryItem(name: "station", value: station),
            URLQueryItem(name: "direction", value: direction),
            URLQueryItem(name: "leaveBefore", value: String(leaveBeforeMinutes)),
        ]
        // The API defaults to Perth when no city is given, so non-Perth
        // journeys must always name theirs.
        if let city, !city.isEmpty {
            queryItems.append(URLQueryItem(name: "city", value: city))
        }
        components.queryItems = queryItems
        guard let url = components.url else {
            throw URLError(.badURL)
        }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.timeoutInterval = 10

        let semaphore = DispatchSemaphore(value: 0)
        var result: Result<[String: Any], Error> = .failure(URLError(.unknown))

        URLSession.shared.dataTask(with: request) { data, response, error in
            defer { semaphore.signal() }
            if let error {
                result = .failure(error)
                return
            }
            guard let http = response as? HTTPURLResponse, http.statusCode == 200,
                  let data,
                  let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
                result = .failure(URLError(.badServerResponse))
                return
            }
            result = .success(json)
        }.resume()

        _ = semaphore.wait(timeout: .now() + 12)
        switch result {
        case .success(let json):
            return json
        case .failure(let error):
            throw error
        }
    }
}
