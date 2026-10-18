import { auth } from "@/lib/auth";

// Endpoints de Better Auth (/api/auth/*). Se delega en la instancia perezosa.
export function GET(request: Request) {
  return auth().handler(request);
}

export function POST(request: Request) {
  return auth().handler(request);
}
