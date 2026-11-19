// Throw this from any controller: throw new HttpError(404, "Movie not found")
// The central error handler turns it into a clean JSON response.
export default class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}
